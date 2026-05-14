const express = require('express');
const { body } = require('express-validator');
const { getDb } = require('../db/database');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/security');
const { sendWhatsApp, getWhatsAppStatus, reconnect } = require('../services/whatsappService');
const { sendGenericEmail } = require('../services/emailService');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const db = getDb();
  const { type, status, limit = 50 } = req.query;
  let sql = `
    SELECT n.*, u.name AS created_by_name
    FROM notifications n LEFT JOIN users u ON n.created_by = u.id
    WHERE 1=1`;
  const params = [];
  if (type) { sql += ' AND n.type = ?'; params.push(type); }
  if (status) { sql += ' AND n.status = ?'; params.push(status); }
  sql += ` ORDER BY n.created_at DESC LIMIT ${Math.min(Number(limit) || 50, 200)}`;
  res.json({ notifications: db.prepare(sql).all(...params) });
});

router.get('/whatsapp/status', (req, res) => {
  res.json(getWhatsAppStatus());
});

router.post('/whatsapp/reconnect', authorize('admin'), (req, res) => {
  reconnect();
  res.json({ message: 'Reconexão iniciada. Aguarde o QR code.' });
});

// Default contacts list from env
router.get('/contacts', (req, res) => {
  res.json({
    contacts: [
      { label: 'Financeiro', email: process.env.EMAIL_FINANCEIRO || '', department: 'financeiro' },
      { label: 'Contabilidade', email: process.env.EMAIL_CONTABILIDADE || '', department: 'contabilidade' },
      { label: 'Estoque', email: process.env.EMAIL_ESTOQUE || '', department: 'estoque' },
      { label: 'Diretor Financeiro', email: process.env.EMAIL_DIRETOR_FINANCEIRO || '', department: 'diretoria' },
    ].filter(c => c.email),
  });
});

router.post('/whatsapp', authorize('admin', 'manager', 'operator'), [
  body('recipients').isArray({ min: 1 }).withMessage('Ao menos um destinatário'),
  body('recipients.*').matches(/^\+?\d{10,15}$/).withMessage('Número inválido (use formato +5511999999999)'),
  body('message').trim().notEmpty().isLength({ max: 1000 }),
  body('reference_type').optional().isIn(['payment', 'customs', 'supplier', 'general']),
  body('reference_id').optional({ checkFalsy: true }).isInt(),
], handleValidationErrors, async (req, res) => {
  const db = getDb();
  const { recipients, message, reference_type, reference_id } = req.body;
  const results = [];

  for (const recipient of recipients) {
    try {
      await sendWhatsApp(recipient, message);
      db.prepare(`
        INSERT INTO notifications (type, channel, recipient, message, reference_type, reference_id, status, sent_at, created_by)
        VALUES ('whatsapp','whatsapp',?,?,?,?,'sent',datetime('now'),?)
      `).run(recipient, message, reference_type || null, reference_id || null, req.user.id);
      results.push({ recipient, status: 'sent' });
    } catch (err) {
      db.prepare(`
        INSERT INTO notifications (type, channel, recipient, message, reference_type, reference_id, status, error_message, created_by)
        VALUES ('whatsapp','whatsapp',?,?,?,?,'failed',?,?)
      `).run(recipient, message, reference_type || null, reference_id || null, err.message, req.user.id);
      results.push({ recipient, status: 'failed', error: err.message });
    }
  }

  const allFailed = results.every(r => r.status === 'failed');
  res.status(allFailed ? 500 : 200).json({ results });
});

router.post('/email', authorize('admin', 'manager', 'operator'), [
  body('recipients').isArray({ min: 1 }),
  body('recipients.*').isEmail(),
  body('subject').trim().notEmpty().isLength({ max: 200 }),
  body('message').trim().notEmpty().isLength({ max: 5000 }),
  body('cc').optional().isArray(),
  body('reference_type').optional().isIn(['payment', 'customs', 'supplier', 'general']),
  body('reference_id').optional({ checkFalsy: true }).isInt(),
], handleValidationErrors, async (req, res) => {
  const db = getDb();
  const { recipients, cc = [], subject, message, reference_type, reference_id } = req.body;

  try {
    await sendGenericEmail(recipients, cc, subject, message, req.user);

    db.prepare(`
      INSERT INTO notifications (type, channel, recipient, subject, message, reference_type, reference_id, status, sent_at, created_by)
      VALUES ('email','gmail',?,?,?,?,?,'sent',datetime('now'),?)
    `).run(recipients.join(', '), subject, message, reference_type || null, reference_id || null, req.user.id);

    res.json({ message: 'Email enviado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: `Erro ao enviar email: ${err.message}` });
  }
});

module.exports = router;

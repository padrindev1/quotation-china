const express = require('express');
const { body, param } = require('express-validator');
const { getDb } = require('../db/database');
const { authenticate, authorize, auditLog } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/security');
const { sendPaymentEmail } = require('../services/emailService');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const db = getDb();
  const { status, supplier_id, from, to } = req.query;
  let sql = `
    SELECT p.*, s.name AS supplier_name, u.name AS created_by_name,
           a.name AS approved_by_name
    FROM payments p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    LEFT JOIN users u ON p.created_by = u.id
    LEFT JOIN users a ON p.approved_by = a.id
    WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND p.status = ?'; params.push(status); }
  if (supplier_id) { sql += ' AND p.supplier_id = ?'; params.push(supplier_id); }
  if (from) { sql += ' AND p.due_date >= ?'; params.push(from); }
  if (to) { sql += ' AND p.due_date <= ?'; params.push(to); }
  sql += ' ORDER BY p.due_date ASC';
  res.json({ payments: db.prepare(sql).all(...params) });
});

router.get('/summary', (req, res) => {
  const db = getDb();
  const summary = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) AS approved,
      SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END) AS paid,
      SUM(CASE WHEN status='overdue' THEN 1 ELSE 0 END) AS overdue,
      SUM(CASE WHEN status NOT IN ('cancelled','paid') AND currency='USD' THEN amount ELSE 0 END) AS pending_usd,
      SUM(CASE WHEN status NOT IN ('cancelled','paid') AND currency='BRL' THEN amount ELSE 0 END) AS pending_brl,
      SUM(CASE WHEN status NOT IN ('cancelled','paid') THEN COALESCE(amount_brl,0) ELSE 0 END) AS pending_total_brl
    FROM payments
  `).get();
  res.json(summary);
});

router.get('/:id', [param('id').isInt()], handleValidationErrors, (req, res) => {
  const db = getDb();
  const p = db.prepare(`
    SELECT p.*, s.name AS supplier_name FROM payments p
    LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = ?
  `).get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Pagamento não encontrado' });
  res.json(p);
});

router.post('/', authorize('admin', 'manager', 'operator'), [
  body('description').trim().notEmpty().isLength({ max: 500 }),
  body('amount').isFloat({ min: 0.01 }),
  body('currency').isIn(['USD', 'EUR', 'CNY', 'BRL']),
  body('due_date').isISO8601().withMessage('Data inválida (use YYYY-MM-DD)'),
  body('supplier_id').optional({ checkFalsy: true }).isInt(),
  body('invoice_ref').optional().trim().isLength({ max: 100 }),
  body('exchange_rate').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body('amount_brl').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body('payment_method').optional().trim().isLength({ max: 100 }),
  body('bank_info').optional().trim().isLength({ max: 500 }),
], handleValidationErrors, auditLog('CREATE', 'payment'), (req, res) => {
  const db = getDb();
  const {
    supplier_id, description, amount, currency, amount_brl,
    exchange_rate, due_date, invoice_ref, payment_method, bank_info, notes,
  } = req.body;
  const r = db.prepare(`
    INSERT INTO payments
      (supplier_id, description, amount, currency, amount_brl, exchange_rate,
       due_date, invoice_ref, payment_method, bank_info, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    supplier_id || null, description, amount, currency, amount_brl || null,
    exchange_rate || null, due_date, invoice_ref || null,
    payment_method || null, bank_info || null, notes || null, req.user.id,
  );
  res.status(201).json(db.prepare(`
    SELECT p.*, s.name AS supplier_name FROM payments p
    LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = ?
  `).get(r.lastInsertRowid));
});

router.patch('/:id/status', authorize('admin', 'manager'), [
  param('id').isInt(),
  body('status').isIn(['pending', 'approved', 'paid', 'overdue', 'cancelled']),
  body('swift_ref').optional().trim().isLength({ max: 100 }),
], handleValidationErrors, auditLog('UPDATE_STATUS', 'payment'), (req, res) => {
  const db = getDb();
  const { status, swift_ref } = req.body;
  const existing = db.prepare('SELECT id FROM payments WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Pagamento não encontrado' });

  db.prepare(`
    UPDATE payments SET
      status = ?,
      payment_date = CASE WHEN ? = 'paid' THEN date('now') ELSE payment_date END,
      swift_ref = COALESCE(?, swift_ref),
      approved_by = CASE WHEN ? = 'approved' THEN ? ELSE approved_by END,
      approved_at = CASE WHEN ? = 'approved' THEN datetime('now') ELSE approved_at END,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(status, status, swift_ref || null, status, req.user.id, status, req.params.id);

  res.json(db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id));
});

router.post('/:id/send-email', authorize('admin', 'manager', 'operator'), [
  param('id').isInt(),
  body('recipients').isArray({ min: 1 }).withMessage('Ao menos um destinatário'),
  body('recipients.*').isEmail().withMessage('Email inválido na lista'),
  body('cc').optional().isArray(),
  body('message').optional().trim().isLength({ max: 2000 }),
], handleValidationErrors, async (req, res) => {
  const db = getDb();
  const payment = db.prepare(`
    SELECT p.*, s.name AS supplier_name, s.country AS supplier_country
    FROM payments p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = ?
  `).get(req.params.id);

  if (!payment) return res.status(404).json({ error: 'Pagamento não encontrado' });

  try {
    const { recipients, cc = [], message } = req.body;
    await sendPaymentEmail(payment, recipients, cc, message, req.user);

    db.prepare("UPDATE payments SET email_sent = 1, email_sent_at = datetime('now') WHERE id = ?")
      .run(req.params.id);

    db.prepare(`
      INSERT INTO notifications (type, channel, recipient, subject, message, reference_type, reference_id, status, sent_at, created_by)
      VALUES ('email', 'gmail', ?, ?, ?, 'payment', ?, 'sent', datetime('now'), ?)
    `).run(
      recipients.join(', '),
      `Pagamento ${payment.invoice_ref || payment.id}`,
      message || `Notificação de pagamento para ${payment.supplier_name}`,
      payment.id,
      req.user.id,
    );

    res.json({ message: 'Email enviado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: `Erro ao enviar email: ${err.message}` });
  }
});

router.delete('/:id', authorize('admin'), [param('id').isInt()], handleValidationErrors, (req, res) => {
  const db = getDb();
  const payment = db.prepare('SELECT status FROM payments WHERE id = ?').get(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Pagamento não encontrado' });
  if (payment.status === 'paid') return res.status(400).json({ error: 'Não é possível excluir pagamento já pago' });
  db.prepare('DELETE FROM payments WHERE id = ?').run(req.params.id);
  res.json({ message: 'Pagamento excluído' });
});

module.exports = router;

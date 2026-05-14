const express = require('express');
const bcrypt = require('bcryptjs');
const { body, param } = require('express-validator');
const { getDb } = require('../db/database');
const { authenticate, authorize, auditLog } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/security');

const router = express.Router();
router.use(authenticate, authorize('admin'));

router.get('/', (req, res) => {
  const db = getDb();
  const users = db.prepare(
    'SELECT id, name, email, role, department, whatsapp_number, is_active, last_login, created_at FROM users ORDER BY name'
  ).all();
  res.json({ users });
});

router.post('/', [
  body('name').trim().notEmpty().isLength({ max: 200 }),
  body('email').isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .matches(/[A-Z]/).withMessage('Deve conter maiúscula')
    .matches(/[0-9]/).withMessage('Deve conter número')
    .matches(/[@$!%*?&#]/).withMessage('Deve conter caractere especial'),
  body('role').isIn(['admin', 'manager', 'operator', 'viewer']),
  body('department').optional().trim().isLength({ max: 100 }),
  body('whatsapp_number').optional({ checkFalsy: true }).matches(/^\+?\d{10,15}$/),
], handleValidationErrors, auditLog('CREATE', 'user'), async (req, res) => {
  const db = getDb();
  const { name, email, password, role, department, whatsapp_number } = req.body;

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email já cadastrado' });

  const hash = await bcrypt.hash(password, 12);
  const r = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, department, whatsapp_number, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run(name, email, hash, role, department || null, whatsapp_number || null);

  const user = db.prepare('SELECT id, name, email, role, department, whatsapp_number FROM users WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json(user);
});

router.put('/:id', [
  param('id').isInt(),
  body('name').optional().trim().notEmpty().isLength({ max: 200 }),
  body('role').optional().isIn(['admin', 'manager', 'operator', 'viewer']),
  body('department').optional().trim().isLength({ max: 100 }),
  body('whatsapp_number').optional({ checkFalsy: true }).matches(/^\+?\d{10,15}$/),
], handleValidationErrors, auditLog('UPDATE', 'user'), (req, res) => {
  const db = getDb();
  if (!db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id)) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }
  const { name, role, department, whatsapp_number, is_active } = req.body;
  db.prepare(`
    UPDATE users SET
      name=COALESCE(?,name), role=COALESCE(?,role),
      department=COALESCE(?,department), whatsapp_number=COALESCE(?,whatsapp_number),
      is_active=COALESCE(?,is_active), updated_at=datetime('now')
    WHERE id=?
  `).run(name, role, department, whatsapp_number || null, is_active != null ? is_active : null, req.params.id);

  res.json(db.prepare('SELECT id, name, email, role, department, whatsapp_number, is_active FROM users WHERE id = ?').get(req.params.id));
});

router.post('/:id/reset-password', [param('id').isInt()], handleValidationErrors, async (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const tempPassword = `OKTZ@${Math.random().toString(36).slice(-6).toUpperCase()}`;
  const hash = await bcrypt.hash(tempPassword, 12);
  db.prepare("UPDATE users SET password_hash=?, must_change_password=1, updated_at=datetime('now') WHERE id=?")
    .run(hash, req.params.id);
  db.prepare('DELETE FROM refresh_tokens WHERE user_id=?').run(req.params.id);

  res.json({ message: 'Senha resetada', temporaryPassword: tempPassword });
});

router.get('/audit-logs', (req, res) => {
  const db = getDb();
  const { user_id, resource, limit = 100 } = req.query;
  let sql = `
    SELECT al.*, u.name AS user_name FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id WHERE 1=1`;
  const params = [];
  if (user_id) { sql += ' AND al.user_id = ?'; params.push(user_id); }
  if (resource) { sql += ' AND al.resource = ?'; params.push(resource); }
  sql += ` ORDER BY al.created_at DESC LIMIT ${Math.min(Number(limit) || 100, 500)}`;
  res.json({ logs: db.prepare(sql).all(...params) });
});

module.exports = router;

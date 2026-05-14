const express = require('express');
const { body, param, query } = require('express-validator');
const { getDb } = require('../db/database');
const { authenticate, authorize, auditLog } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/security');

const router = express.Router();
router.use(authenticate);

// List suppliers
router.get('/', (req, res) => {
  const db = getDb();
  const { status, category, search } = req.query;
  let sql = `
    SELECT s.*, u.name AS created_by_name,
      (SELECT COUNT(*) FROM payback_reports pr WHERE pr.supplier_id = s.id) AS payback_count,
      (SELECT COUNT(*) FROM payments p WHERE p.supplier_id = s.id) AS payment_count,
      (SELECT COUNT(*) FROM customs_processes cp WHERE cp.supplier_id = s.id) AS customs_count
    FROM suppliers s LEFT JOIN users u ON s.created_by = u.id WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND s.status = ?'; params.push(status); }
  if (category) { sql += ' AND s.category = ?'; params.push(category); }
  if (search) {
    sql += ' AND (s.name LIKE ? OR s.contact_name LIKE ? OR s.country LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY s.name ASC';
  res.json({ suppliers: db.prepare(sql).all(...params) });
});

router.get('/categories', (req, res) => {
  const db = getDb();
  const cats = db.prepare('SELECT DISTINCT category FROM suppliers ORDER BY category').all();
  res.json({ categories: cats.map(c => c.category) });
});

router.get('/:id', [param('id').isInt()], handleValidationErrors, (req, res) => {
  const db = getDb();
  const s = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Fornecedor não encontrado' });
  res.json(s);
});

router.post('/', authorize('admin', 'manager', 'operator'), [
  body('name').trim().notEmpty().isLength({ max: 200 }).withMessage('Nome obrigatório'),
  body('country').trim().notEmpty().isLength({ max: 100 }).withMessage('País obrigatório'),
  body('category').trim().notEmpty().isLength({ max: 100 }).withMessage('Categoria obrigatória'),
  body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('phone').optional().trim().isLength({ max: 50 }),
  body('contact_name').optional().trim().isLength({ max: 200 }),
  body('website').optional({ checkFalsy: true }).isURL(),
], handleValidationErrors, auditLog('CREATE', 'supplier'), (req, res) => {
  const db = getDb();
  const { name, country, contact_name, email, phone, category, website, notes } = req.body;
  const r = db.prepare(`
    INSERT INTO suppliers (name, country, contact_name, email, phone, category, website, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, country, contact_name || null, email || null, phone || null, category, website || null, notes || null, req.user.id);
  res.status(201).json(db.prepare('SELECT * FROM suppliers WHERE id = ?').get(r.lastInsertRowid));
});

router.put('/:id', authorize('admin', 'manager', 'operator'), [
  param('id').isInt(),
  body('name').optional().trim().notEmpty().isLength({ max: 200 }),
  body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('status').optional().isIn(['active', 'inactive', 'pending']),
], handleValidationErrors, auditLog('UPDATE', 'supplier'), (req, res) => {
  const db = getDb();
  if (!db.prepare('SELECT id FROM suppliers WHERE id = ?').get(req.params.id)) {
    return res.status(404).json({ error: 'Fornecedor não encontrado' });
  }
  const { name, country, contact_name, email, phone, category, status, website, notes } = req.body;
  db.prepare(`
    UPDATE suppliers SET
      name = COALESCE(?, name), country = COALESCE(?, country),
      contact_name = COALESCE(?, contact_name), email = COALESCE(?, email),
      phone = COALESCE(?, phone), category = COALESCE(?, category),
      status = COALESCE(?, status), website = COALESCE(?, website),
      notes = COALESCE(?, notes), updated_at = datetime('now')
    WHERE id = ?
  `).run(name, country, contact_name, email, phone, category, status, website, notes, req.params.id);
  res.json(db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id));
});

// ── Payback Reports ──────────────────────────────────────────

router.get('/payback/all', (req, res) => {
  const db = getDb();
  const reports = db.prepare(`
    SELECT pr.*, u.name AS created_by_name, s.name AS supplier_name
    FROM payback_reports pr
    LEFT JOIN users u ON pr.created_by = u.id
    LEFT JOIN suppliers s ON pr.supplier_id = s.id
    ORDER BY pr.created_at DESC
  `).all();
  res.json({ reports });
});

router.get('/:id/payback', [param('id').isInt()], handleValidationErrors, (req, res) => {
  const db = getDb();
  const reports = db.prepare(`
    SELECT pr.*, u.name AS created_by_name, s.name AS supplier_name
    FROM payback_reports pr
    LEFT JOIN users u ON pr.created_by = u.id
    LEFT JOIN suppliers s ON pr.supplier_id = s.id
    WHERE pr.supplier_id = ? ORDER BY pr.created_at DESC
  `).all(req.params.id);
  res.json({ reports });
});

router.post('/payback', authorize('admin', 'manager', 'operator'), [
  body('product_name').trim().notEmpty().isLength({ max: 300 }).withMessage('Nome do produto obrigatório'),
  body('product_type').isIn(['machine', 'product', 'service', 'other']),
  body('investment_value').isFloat({ min: 0.01 }).withMessage('Valor de investimento inválido'),
  body('monthly_savings').isFloat({ min: 0 }).withMessage('Economia mensal inválida'),
  body('monthly_revenue').optional().isFloat({ min: 0 }),
  body('monthly_cost_reduction').optional().isFloat({ min: 0 }),
  body('currency').optional().isIn(['USD', 'EUR', 'CNY', 'BRL']),
  body('exchange_rate').optional().isFloat({ min: 0 }),
  body('supplier_id').optional({ checkFalsy: true }).isInt(),
], handleValidationErrors, (req, res) => {
  const db = getDb();
  const {
    supplier_id, product_name, product_type,
    investment_value, currency = 'USD', exchange_rate = 1,
    monthly_savings = 0, monthly_revenue = 0, monthly_cost_reduction = 0, notes,
  } = req.body;

  const investBrl = investment_value * exchange_rate;
  const totalMonthly = monthly_savings + monthly_revenue + monthly_cost_reduction;
  const paybackMonths = totalMonthly > 0 ? investment_value / totalMonthly : null;
  const roiPercent = investment_value > 0 ? (totalMonthly * 12 / investment_value) * 100 : null;
  // Simple NPV at 12% annual discount rate over 3 years
  const discountRate = 0.01;
  const npv = totalMonthly > 0
    ? Array.from({ length: 36 }, (_, i) => totalMonthly / Math.pow(1 + discountRate, i + 1))
        .reduce((a, b) => a + b, 0) - investment_value
    : null;

  const r = db.prepare(`
    INSERT INTO payback_reports
      (supplier_id, product_name, product_type, investment_value, currency, exchange_rate,
       investment_brl, monthly_savings, monthly_revenue, monthly_cost_reduction,
       payback_months, roi_percent, npv, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    supplier_id || null, product_name, product_type, investment_value, currency, exchange_rate,
    investBrl, monthly_savings, monthly_revenue, monthly_cost_reduction,
    paybackMonths, roiPercent, npv, notes || null, req.user.id,
  );
  res.status(201).json(db.prepare('SELECT * FROM payback_reports WHERE id = ?').get(r.lastInsertRowid));
});

router.delete('/payback/:id', authorize('admin', 'manager'), [param('id').isInt()], handleValidationErrors, (req, res) => {
  const db = getDb();
  const r = db.prepare('DELETE FROM payback_reports WHERE id = ?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Relatório não encontrado' });
  res.json({ message: 'Relatório excluído' });
});

module.exports = router;

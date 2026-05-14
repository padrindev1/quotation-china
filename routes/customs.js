const express = require('express');
const { body, param } = require('express-validator');
const { getDb } = require('../db/database');
const { authenticate, authorize, auditLog } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/security');
const { sendCustomsEmail } = require('../services/emailService');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const db = getDb();
  const { status } = req.query;
  let sql = `
    SELECT cp.*, s.name AS supplier_name, u.name AS created_by_name
    FROM customs_processes cp
    LEFT JOIN suppliers s ON cp.supplier_id = s.id
    LEFT JOIN users u ON cp.created_by = u.id
    WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND cp.status = ?'; params.push(status); }
  sql += ' ORDER BY cp.created_at DESC';
  res.json({ processes: db.prepare(sql).all(...params) });
});

router.get('/stats', (req, res) => {
  const db = getDb();
  const stats = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status='in_progress' THEN 1 ELSE 0 END) AS in_progress,
      SUM(CASE WHEN status='customs_clearance' THEN 1 ELSE 0 END) AS in_clearance,
      SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status NOT IN ('draft','suspended') THEN total_landed_cost ELSE 0 END) AS total_invested,
      SUM(CASE WHEN status NOT IN ('draft','suspended') THEN total_taxes ELSE 0 END) AS total_taxes,
      AVG(CASE WHEN status='completed' THEN total_landed_cost END) AS avg_cost
    FROM customs_processes
  `).get();
  res.json(stats);
});

router.get('/:id', [param('id').isInt()], handleValidationErrors, (req, res) => {
  const db = getDb();
  const p = db.prepare(`
    SELECT cp.*, s.name AS supplier_name, u.name AS created_by_name
    FROM customs_processes cp
    LEFT JOIN suppliers s ON cp.supplier_id = s.id
    LEFT JOIN users u ON cp.created_by = u.id
    WHERE cp.id = ?
  `).get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Processo não encontrado' });
  res.json(p);
});

router.post('/', authorize('admin', 'manager', 'operator'), [
  body('product_description').trim().notEmpty().isLength({ max: 500 }),
  body('invoice_value').isFloat({ min: 0.01 }),
  body('currency').isIn(['USD', 'EUR', 'CNY', 'BRL']),
  body('exchange_rate').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body('supplier_id').optional({ checkFalsy: true }).isInt(),
  body('ncm_code').optional().trim().isLength({ max: 20 }),
  body('incoterm').optional().isIn(['FOB', 'CIF', 'EXW', 'CFR', 'DDP', 'DAP', 'FCA']),
  body('transport_mode').optional().isIn(['sea', 'air', 'road', 'rail']),
], handleValidationErrors, auditLog('CREATE', 'customs'), (req, res) => {
  const db = getDb();
  const {
    supplier_id, product_description, ncm_code, quantity, unit = 'UN',
    invoice_value, currency, exchange_rate = 1,
    freight_intl = 0, insurance = 0,
    ii_rate = 0, ii_tax = 0, ipi_rate = 0, ipi_tax = 0,
    pis_rate = 0, pis_tax = 0, cofins_rate = 0, cofins_tax = 0,
    siscomex_fee = 0, afrmm_fee = 0,
    freight_domestic = 0, storage_cost = 0, port_charges = 0,
    icms_rate = 0, icms_tax = 0, icms_difal = 0,
    customs_broker_fee = 0, other_costs = 0,
    incoterm = 'FOB', transport_mode = 'sea',
    estimated_arrival, notes,
  } = req.body;

  const exRate = exchange_rate || 1;
  const invoiceBrl = invoice_value * exRate;
  const freightIntlBrl = freight_intl * exRate;
  const insuranceBrl = insurance * exRate;
  const cifValue = invoiceBrl + freightIntlBrl + insuranceBrl;

  const totalTaxes = ii_tax + ipi_tax + pis_tax + cofins_tax + siscomex_fee + afrmm_fee + icms_tax + icms_difal;
  const totalLogistics = freight_domestic + storage_cost + port_charges + customs_broker_fee + other_costs;
  const totalLanded = cifValue + totalTaxes + totalLogistics;

  const processNumber = `IMP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

  const r = db.prepare(`
    INSERT INTO customs_processes (
      process_number, supplier_id, product_description, ncm_code, quantity, unit,
      invoice_value, currency, exchange_rate, invoice_value_brl,
      freight_intl, insurance, cif_value,
      ii_rate, ii_tax, ipi_rate, ipi_tax, pis_rate, pis_tax, cofins_rate, cofins_tax,
      siscomex_fee, afrmm_fee,
      freight_domestic, storage_cost, port_charges,
      icms_rate, icms_tax, icms_difal,
      customs_broker_fee, other_costs,
      total_taxes, total_landed_cost,
      incoterm, transport_mode, estimated_arrival, notes, created_by
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    processNumber, supplier_id || null, product_description, ncm_code || null, quantity || null, unit,
    invoice_value, currency, exRate, invoiceBrl,
    freight_intl, insurance, cifValue,
    ii_rate, ii_tax, ipi_rate, ipi_tax, pis_rate, pis_tax, cofins_rate, cofins_tax,
    siscomex_fee, afrmm_fee,
    freight_domestic, storage_cost, port_charges,
    icms_rate, icms_tax, icms_difal,
    customs_broker_fee, other_costs,
    totalTaxes, totalLanded,
    incoterm, transport_mode, estimated_arrival || null, notes || null, req.user.id,
  );

  res.status(201).json(db.prepare('SELECT * FROM customs_processes WHERE id = ?').get(r.lastInsertRowid));
});

router.put('/:id', authorize('admin', 'manager', 'operator'), [
  param('id').isInt(),
], handleValidationErrors, auditLog('UPDATE', 'customs'), (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM customs_processes WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Processo não encontrado' });

  const data = { ...existing, ...req.body };
  const exRate = data.exchange_rate || 1;
  const invoiceBrl = data.invoice_value * exRate;
  const cifValue = invoiceBrl + data.freight_intl * exRate + data.insurance * exRate;
  const totalTaxes = data.ii_tax + data.ipi_tax + data.pis_tax + data.cofins_tax + data.siscomex_fee + data.afrmm_fee + data.icms_tax + data.icms_difal;
  const totalLanded = cifValue + totalTaxes + data.freight_domestic + data.storage_cost + data.port_charges + data.customs_broker_fee + data.other_costs;

  db.prepare(`
    UPDATE customs_processes SET
      supplier_id=?, product_description=?, ncm_code=?, quantity=?, unit=?,
      invoice_value=?, currency=?, exchange_rate=?, invoice_value_brl=?,
      freight_intl=?, insurance=?, cif_value=?,
      ii_rate=?, ii_tax=?, ipi_rate=?, ipi_tax=?, pis_rate=?, pis_tax=?, cofins_rate=?, cofins_tax=?,
      siscomex_fee=?, afrmm_fee=?,
      freight_domestic=?, storage_cost=?, port_charges=?,
      icms_rate=?, icms_tax=?, icms_difal=?,
      customs_broker_fee=?, other_costs=?,
      total_taxes=?, total_landed_cost=?,
      incoterm=?, transport_mode=?, estimated_arrival=?, notes=?,
      updated_at=datetime('now')
    WHERE id=?
  `).run(
    data.supplier_id, data.product_description, data.ncm_code, data.quantity, data.unit,
    data.invoice_value, data.currency, exRate, invoiceBrl,
    data.freight_intl, data.insurance, cifValue,
    data.ii_rate, data.ii_tax, data.ipi_rate, data.ipi_tax, data.pis_rate, data.pis_tax, data.cofins_rate, data.cofins_tax,
    data.siscomex_fee, data.afrmm_fee,
    data.freight_domestic, data.storage_cost, data.port_charges,
    data.icms_rate, data.icms_tax, data.icms_difal,
    data.customs_broker_fee, data.other_costs,
    totalTaxes, totalLanded,
    data.incoterm, data.transport_mode, data.estimated_arrival, data.notes,
    req.params.id,
  );
  res.json(db.prepare('SELECT * FROM customs_processes WHERE id = ?').get(req.params.id));
});

router.patch('/:id/status', authorize('admin', 'manager'), [
  param('id').isInt(),
  body('status').isIn(['draft', 'in_progress', 'customs_clearance', 'released', 'completed', 'suspended']),
], handleValidationErrors, auditLog('UPDATE_STATUS', 'customs'), (req, res) => {
  const db = getDb();
  if (!db.prepare('SELECT id FROM customs_processes WHERE id = ?').get(req.params.id)) {
    return res.status(404).json({ error: 'Processo não encontrado' });
  }
  const { status, di_number, actual_arrival, clearance_date, delivery_date } = req.body;
  db.prepare(`
    UPDATE customs_processes SET
      status=?, di_number=COALESCE(?,di_number), actual_arrival=COALESCE(?,actual_arrival),
      clearance_date=COALESCE(?,clearance_date), delivery_date=COALESCE(?,delivery_date),
      updated_at=datetime('now')
    WHERE id=?
  `).run(status, di_number || null, actual_arrival || null, clearance_date || null, delivery_date || null, req.params.id);
  res.json(db.prepare('SELECT * FROM customs_processes WHERE id = ?').get(req.params.id));
});

router.post('/:id/send-email', authorize('admin', 'manager', 'operator'), [
  param('id').isInt(),
  body('recipients').isArray({ min: 1 }),
  body('recipients.*').isEmail(),
  body('cc').optional().isArray(),
  body('message').optional().trim().isLength({ max: 2000 }),
], handleValidationErrors, async (req, res) => {
  const db = getDb();
  const proc = db.prepare(`
    SELECT cp.*, s.name AS supplier_name FROM customs_processes cp
    LEFT JOIN suppliers s ON cp.supplier_id = s.id WHERE cp.id = ?
  `).get(req.params.id);
  if (!proc) return res.status(404).json({ error: 'Processo não encontrado' });

  try {
    const { recipients, cc = [], message } = req.body;
    await sendCustomsEmail(proc, recipients, cc, message, req.user);

    db.prepare(`
      INSERT INTO notifications (type, channel, recipient, subject, message, reference_type, reference_id, status, sent_at, created_by)
      VALUES ('email','gmail',?,?,?,'customs',?,'sent',datetime('now'),?)
    `).run(recipients.join(', '), `Processo ${proc.process_number}`, message || '', proc.id, req.user.id);

    res.json({ message: 'Email enviado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: `Erro ao enviar email: ${err.message}` });
  }
});

module.exports = router;

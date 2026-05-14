const express = require('express');
const { body, param } = require('express-validator');
const { getDb } = require('../db/database');
const { handleValidationErrors } = require('../middleware/security');

const router = express.Router();

// ── helpers ──────────────────────────────────────────────────────────────────

function getSupplierWithOCs(db, id) {
  const s = db.prepare('SELECT * FROM consolidation_suppliers WHERE id = ?').get(id);
  if (!s) return null;
  const ocs = db.prepare(
    'SELECT id, oc_number FROM consolidation_supplier_ocs WHERE supplier_id = ? ORDER BY id'
  ).all(id);
  return formatSupplier(s, ocs);
}

function formatSupplier(s, ocs) {
  return {
    id:      s.id,
    name:    s.name,
    short:   s.short_name || s.name,
    city:    s.city || '',
    lat:     s.lat,
    lng:     s.lng,
    color:   s.color,
    modal:   s.modal,
    contact: s.contact_name || '—',
    status:  s.status,
    ocs:     ocs.map(o => o.oc_number),
    _ocIds:  ocs.map(o => ({ id: o.id, oc: o.oc_number })),
  };
}

// ── Suppliers ─────────────────────────────────────────────────────────────────

router.get('/suppliers', (req, res) => {
  const db = getDb();
  const rows = db.prepare(
    "SELECT * FROM consolidation_suppliers WHERE status = 'active' ORDER BY id"
  ).all();
  const result = rows.map(s => {
    const ocs = db.prepare(
      'SELECT id, oc_number FROM consolidation_supplier_ocs WHERE supplier_id = ? ORDER BY id'
    ).all(s.id);
    return formatSupplier(s, ocs);
  });
  res.json(result);
});

router.get('/suppliers/:id', [param('id').isInt()], handleValidationErrors, (req, res) => {
  const s = getSupplierWithOCs(getDb(), req.params.id);
  if (!s) return res.status(404).json({ error: 'Fornecedor não encontrado' });
  res.json(s);
});

router.post('/suppliers', [
  body('name').trim().notEmpty().isLength({ max: 200 }),
  body('lat').isFloat(),
  body('lng').isFloat(),
  body('short').optional().trim().isLength({ max: 100 }),
  body('city').optional().trim().isLength({ max: 200 }),
  body('color').optional().trim().isLength({ max: 20 }),
  body('modal').optional().isIn(['road', 'rail', 'river', 'air']),
  body('contact').optional().trim().isLength({ max: 200 }),
], handleValidationErrors, (req, res) => {
  const db = getDb();
  const { name, short, city, lat, lng, color = '#e8b84b', modal = 'road', contact } = req.body;
  const r = db.prepare(`
    INSERT INTO consolidation_suppliers (name, short_name, city, lat, lng, color, modal, contact_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, short || name, city || null, lat, lng, color, modal, contact || null);
  res.status(201).json(getSupplierWithOCs(db, r.lastInsertRowid));
});

router.put('/suppliers/:id', [
  param('id').isInt(),
  body('name').optional().trim().notEmpty().isLength({ max: 200 }),
  body('lat').optional().isFloat(),
  body('lng').optional().isFloat(),
  body('modal').optional().isIn(['road', 'rail', 'river', 'air']),
  body('status').optional().isIn(['active', 'inactive']),
], handleValidationErrors, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM consolidation_suppliers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Fornecedor não encontrado' });
  const { name, short, city, lat, lng, color, modal, contact, status } = req.body;
  db.prepare(`
    UPDATE consolidation_suppliers SET
      name         = COALESCE(?, name),
      short_name   = COALESCE(?, short_name),
      city         = COALESCE(?, city),
      lat          = COALESCE(?, lat),
      lng          = COALESCE(?, lng),
      color        = COALESCE(?, color),
      modal        = COALESCE(?, modal),
      contact_name = COALESCE(?, contact_name),
      status       = COALESCE(?, status),
      updated_at   = datetime('now')
    WHERE id = ?
  `).run(name, short, city, lat, lng, color, modal, contact, status, req.params.id);
  res.json(getSupplierWithOCs(db, req.params.id));
});

router.delete('/suppliers/:id', [param('id').isInt()], handleValidationErrors, (req, res) => {
  const db = getDb();
  const r = db.prepare('DELETE FROM consolidation_suppliers WHERE id = ?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Fornecedor não encontrado' });
  res.json({ message: 'Fornecedor removido' });
});

// ── OCs por Supplier ──────────────────────────────────────────────────────────

router.post('/suppliers/:id/ocs', [
  param('id').isInt(),
  body('oc_number').trim().notEmpty().isLength({ max: 100 }),
], handleValidationErrors, (req, res) => {
  const db = getDb();
  if (!db.prepare('SELECT id FROM consolidation_suppliers WHERE id = ?').get(req.params.id)) {
    return res.status(404).json({ error: 'Fornecedor não encontrado' });
  }
  const existing = db.prepare(
    'SELECT id FROM consolidation_supplier_ocs WHERE supplier_id = ? AND oc_number = ?'
  ).get(req.params.id, req.body.oc_number);
  if (existing) return res.status(409).json({ error: 'OC já existe para este fornecedor' });

  const r = db.prepare(
    'INSERT INTO consolidation_supplier_ocs (supplier_id, oc_number) VALUES (?, ?)'
  ).run(req.params.id, req.body.oc_number.trim());
  res.status(201).json({ id: r.lastInsertRowid, oc_number: req.body.oc_number.trim() });
});

router.delete('/suppliers/:id/ocs/:ocId', [
  param('id').isInt(),
  param('ocId').isInt(),
], handleValidationErrors, (req, res) => {
  const db = getDb();
  const r = db.prepare(
    'DELETE FROM consolidation_supplier_ocs WHERE id = ? AND supplier_id = ?'
  ).run(req.params.ocId, req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'OC não encontrada' });
  res.json({ message: 'OC removida' });
});

// ── History ───────────────────────────────────────────────────────────────────

router.get('/history', (req, res) => {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM consolidation_history ORDER BY created_at DESC'
  ).all();
  res.json(rows.map(formatHistory));
});

router.post('/history', [
  body('ref').trim().notEmpty().isLength({ max: 100 }),
  body('container').trim().notEmpty().isLength({ max: 50 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('oc').optional().trim().isLength({ max: 200 }),
  body('port').optional().trim().isLength({ max: 100 }),
  body('routes').optional().isInt({ min: 0 }),
  body('volume').optional().isFloat({ min: 0 }),
  body('weight').optional().isFloat({ min: 0 }),
  body('costs').optional().isObject(),
], handleValidationErrors, (req, res) => {
  const db = getDb();
  const { ref, description, oc, container, port, routes = 0, volume = 0, weight = 0, costs } = req.body;
  const r = db.prepare(`
    INSERT INTO consolidation_history
      (ref, description, oc, container_type, port, routes_count, total_volume, total_weight, costs_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    ref, description || null, oc || null, container,
    port || null, routes, volume, weight,
    costs ? JSON.stringify(costs) : null
  );
  const saved = db.prepare('SELECT * FROM consolidation_history WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json(formatHistory(saved));
});

router.delete('/history/:id', [param('id').isInt()], handleValidationErrors, (req, res) => {
  const db = getDb();
  const r = db.prepare('DELETE FROM consolidation_history WHERE id = ?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Registro não encontrado' });
  res.json({ message: 'Registro removido' });
});

router.delete('/history', (req, res) => {
  getDb().prepare('DELETE FROM consolidation_history').run();
  res.json({ message: 'Histórico limpo' });
});

function formatHistory(row) {
  return {
    id:        row.id,
    ref:       row.ref,
    desc:      row.description || '—',
    oc:        row.oc || '—',
    date:      new Date(row.created_at).toLocaleString('pt-BR'),
    container: row.container_type,
    port:      row.port || '—',
    routes:    row.routes_count,
    volume:    row.total_volume,
    weight:    row.total_weight,
    costs:     row.costs_json ? JSON.parse(row.costs_json) : {},
  };
}

module.exports = router;

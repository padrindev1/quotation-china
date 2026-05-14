'use strict';
const express = require('express');
const multer = require('multer');
const { getDb } = require('../db/database');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = file.mimetype.includes('csv')
      || file.mimetype.includes('text')
      || file.originalname.toLowerCase().endsWith('.csv');
    ok ? cb(null, true) : cb(new Error('Apenas arquivos CSV são aceitos'));
  },
});

// ── Parser helpers ────────────────────────────────────────────

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQ && text[i + 1] === '"') { field += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      row.push(field); field = '';
    } else if ((ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) && !inQ) {
      if (ch === '\r') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else {
      field += ch;
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const col = (r, i) => (r[i] || '').replace(/\n/g, ' ').trim();

function parseBRL(s) {
  if (!s) return null;
  const n = s.replace(/R\$\s*/, '').replace(/\./g, '').replace(',', '.').trim();
  const v = parseFloat(n);
  return isNaN(v) ? null : v;
}

function parseUSD(s) {
  if (!s) return null;
  const n = s.replace(/\$/, '').replace(/\./g, '').replace(',', '.').trim();
  const v = parseFloat(n);
  return isNaN(v) ? null : v;
}

function parseDateBR(s) {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

function categoryFromName(name) {
  const n = name.toUpperCase();
  if (/BROKER|DESPACHO|DESPACHANT|ASSESSORIA|DEICMAR|E G A/.test(n)) return 'customs_broker';
  if (/TRANSPORT|LOGISTIC|FRETE|COURIER|EXPRESS|DHL|FEDERAL|SUNTRANS|COSCO|SKYSEA|AMA TRANS|TRANS FL|AZ LOG/.test(n)) return 'freight';
  if (/ECOPORTO|TORA RECINTO|EMBRAPORT/.test(n)) return 'warehouse';
  return 'supplier';
}

function countryFromName(name) {
  const n = name.toUpperCase();
  if (/SHANDONG|SHANGHAI|SHENZHEN|FOSHAN|WENZHOU|ZHONGSHAN|GUANGZHOU|HANGZHOU|NINGBO|GOLD EAST|BOFENG|BESTSUB|UNIFAN|GREAT MAGTECH|SUZHOU|SOUNDA|CIE KINGS|WISEPRINT/.test(n)) return 'China';
  if (/SIGNMATE|SING MATE/.test(n)) return 'Australia';
  if (/FEDERAL EXPRESS/.test(n)) return 'EUA';
  return 'Brasil';
}

function statusFromFollowup(raw) {
  const s = raw.toLowerCase();
  if (s.includes('finaliz')) return 'completed';
  if (s.includes('desembaraço') || s.includes('desembaraco')) return 'customs_clearance';
  if (s.includes('contabilidade') || s.includes('estoque')) return 'released';
  if (s.includes('trânsito') || s.includes('transito') || s.includes('consolidação') || s.includes('consolidacao')) return 'in_progress';
  if (s.includes('produtiv')) return 'in_progress';
  return 'draft';
}

// ── Type detection ────────────────────────────────────────────

const TYPE_LABELS = {
  csv1: 'Cabeçalho de Nota (Pagamentos)',
  csv0: 'Follow-up de Importação',
  csv2: 'Faturamento e Custos',
};

function detectType(rows) {
  const sample = rows.slice(0, 20).map(r => r.join('|').toLowerCase()).join('\n');

  if (sample.includes('cabeçalho da nota') || sample.includes('cabecalho da nota')) return 'csv1';
  if (rows.slice(0, 30).some(r => /^(aprovado|pendente|liberado|bloqueado|reprovado|sem pend)/i.test(col(r, 0)))) return 'csv1';

  if (sample.includes('inicio da operação') || sample.includes('inicio da operacao')) return 'csv0';
  if (sample.includes('etapas') && sample.includes('progresso')) return 'csv0';
  if (sample.includes('status da') && sample.includes('operaç')) return 'csv0';

  if (sample.includes('ref oc') && sample.includes('empresa')) return 'csv2';
  if (sample.includes('siscomex') && sample.includes('frete dta')) return 'csv2';

  return 'unknown';
}

// ── Shared: upsert supplier ───────────────────────────────────

function upsertSupplier(db, name, userId) {
  if (!name || name.length < 2) return null;
  const existing = db.prepare('SELECT id FROM suppliers WHERE name = ?').get(name);
  if (existing) return { id: existing.id, isNew: false };
  db.prepare(`INSERT INTO suppliers (name, country, category, status, created_by) VALUES (?, ?, ?, 'active', ?)`)
    .run(name, countryFromName(name), categoryFromName(name), userId);
  const row = db.prepare('SELECT id FROM suppliers WHERE name = ?').get(name);
  return { id: row.id, isNew: true };
}

// ── Import: CSV1 — Cabeçalho de Nota (Pagamentos) ────────────

function importCSV1(db, rows, userId) {
  const dataRows = rows.filter(r => /^(aprovado|pendente|liberado|bloqueado|reprovado|sem pend)/i.test(col(r, 0)));

  let suppliersInserted = 0, suppliersSkipped = 0;
  let paymentsInserted = 0, paymentsSkipped = 0;
  const errors = [];

  const supplierMap = {};
  for (const name of [...new Set(dataRows.map(r => col(r, 1)).filter(Boolean))]) {
    const res = upsertSupplier(db, name, userId);
    if (!res) continue;
    supplierMap[name] = res.id;
    res.isNew ? suppliersInserted++ : suppliersSkipped++;
  }

  for (const r of dataRows) {
    try {
      const invoiceRef = col(r, 4);
      if (!invoiceRef) continue;
      if (db.prepare('SELECT id FROM payments WHERE invoice_ref = ?').get(invoiceRef)) {
        paymentsSkipped++;
        continue;
      }

      const rawStatus = col(r, 0).toLowerCase();
      let status = 'pending';
      if (rawStatus.includes('aprovado') || rawStatus.includes('liberado')) status = 'approved';
      if (rawStatus.includes('bloqueado') || rawStatus.includes('reprovado')) status = 'cancelled';

      const amountBRL = parseBRL(col(r, 6));
      const dueDate = parseDateBR(col(r, 7)) || parseDateBR(col(r, 8)) || new Date().toISOString().slice(0, 10);
      const payDate = parseDateBR(col(r, 13));
      const desc = (col(r, 9) || col(r, 14) || col(r, 5) || '—').slice(0, 500);
      const tipoOp = col(r, 12);

      db.prepare(`
        INSERT INTO payments (supplier_id, description, amount, currency, amount_brl, due_date, payment_date, invoice_ref, status, notes, created_by)
        VALUES (?, ?, ?, 'BRL', ?, ?, ?, ?, ?, ?, ?)
      `).run(supplierMap[col(r, 1)] || null, desc, amountBRL || 0, amountBRL, dueDate, payDate, invoiceRef, status, tipoOp ? `Tipo: ${tipoOp}` : null, userId);
      paymentsInserted++;
    } catch (err) {
      errors.push(err.message);
    }
  }

  return {
    label: TYPE_LABELS.csv1,
    suppliers: { inserted: suppliersInserted, skipped: suppliersSkipped },
    payments: { inserted: paymentsInserted, skipped: paymentsSkipped },
    errors,
  };
}

// ── Import: CSV0 — Follow-up de Importação ───────────────────

function importCSV0(db, rows, userId) {
  const dataRows = rows.filter(r => {
    const oc = col(r, 7);
    const status = col(r, 4);
    return oc && !/^(false|oc|xx+|pending)$/i.test(oc) && status && !status.toLowerCase().includes('status') && !status.toLowerCase().includes('operaç');
  });

  let suppliersInserted = 0, suppliersSkipped = 0;
  let customsInserted = 0, customsSkipped = 0;
  const errors = [];
  const seenOCs = new Set();

  for (const r of dataRows) {
    try {
      const rawOC = col(r, 7);
      const oc = rawOC.split(/[\n,]+/)[0].trim();
      if (!oc || /^[xX]+$/.test(oc) || oc === 'PENDING' || seenOCs.has(oc)) continue;
      seenOCs.add(oc);

      if (db.prepare('SELECT id FROM customs_processes WHERE process_number = ?').get(oc)) {
        customsSkipped++;
        continue;
      }

      // col 4 = STATUS, col 3 = SETOR, col 5 = RESPONSAVEL, col 6 = PRODUTO
      const rawStatus = col(r, 4);
      const status = statusFromFollowup(rawStatus);
      const product = col(r, 6).slice(0, 500) || 'Importação';
      const invoiceUSD = parseUSD(col(r, 9));
      const invoiceBRL = parseBRL(col(r, 10));
      const container = col(r, 11);
      const sector = col(r, 3);
      const responsible = col(r, 5);
      const startDate = parseDateBR(col(r, 1));

      const noteParts = [
        sector ? `Setor: ${sector}` : '',
        responsible ? `Responsável: ${responsible}` : '',
        rawStatus ? `Status: ${rawStatus}` : '',
        container && !/^(pending|false)$/i.test(container) ? `Container: ${container}` : '',
      ].filter(Boolean);

      db.prepare(`
        INSERT INTO customs_processes (process_number, product_description, invoice_value, currency, invoice_value_brl, status, transport_mode, incoterm, estimated_arrival, notes, created_by)
        VALUES (?, ?, ?, 'USD', ?, ?, 'sea', 'FOB', ?, ?, ?)
      `).run(oc, product, invoiceUSD || 0, invoiceBRL, status, startDate, noteParts.join(' | ') || null, userId);
      customsInserted++;
    } catch (err) {
      errors.push(err.message);
    }
  }

  return {
    label: TYPE_LABELS.csv0,
    suppliers: { inserted: suppliersInserted, skipped: suppliersSkipped },
    customs: { inserted: customsInserted, skipped: customsSkipped },
    errors,
  };
}

// ── Import: CSV2 — Faturamento e Custos ──────────────────────

function importCSV2(db, rows, userId) {
  const dataRows = rows.filter(r => col(r, 3) && /\d/.test(col(r, 3)) && col(r, 4));

  let suppliersInserted = 0, suppliersSkipped = 0;
  let customsUpdated = 0;
  const errors = [];

  for (const r of dataRows) {
    try {
      const empresa = col(r, 4);
      if (empresa && empresa.length > 2) {
        const res = upsertSupplier(db, empresa, userId);
        if (res) res.isNew ? suppliersInserted++ : suppliersSkipped++;
      }

      const ocs = col(r, 3).split(/[\n,\s]+/).map(s => s.trim()).filter(s => s && s !== 'OC' && /\d/.test(s));
      const freightIntl = parseBRL(col(r, 18)) || parseBRL(col(r, 20)) || parseBRL(col(r, 22));
      const storage = (parseBRL(col(r, 12)) || 0) + (parseBRL(col(r, 15)) || 0);
      const freightDom = (parseBRL(col(r, 25)) || 0) + (parseBRL(col(r, 8)) || 0);
      const insurance = parseBRL(col(r, 30));
      const brokerFee = parseBRL(col(r, 32));
      const siscomex = parseBRL(col(r, 10));
      const arrival = parseDateBR(col(r, 37));

      for (const oc of ocs) {
        const proc = db.prepare('SELECT id FROM customs_processes WHERE process_number = ?').get(oc);
        if (!proc) continue;

        db.prepare(`
          UPDATE customs_processes SET
            freight_intl      = CASE WHEN freight_intl = 0      AND ? > 0 THEN ? ELSE freight_intl END,
            storage_cost      = CASE WHEN storage_cost = 0      AND ? > 0 THEN ? ELSE storage_cost END,
            freight_domestic  = CASE WHEN freight_domestic = 0  AND ? > 0 THEN ? ELSE freight_domestic END,
            insurance         = CASE WHEN insurance = 0         AND ? > 0 THEN ? ELSE insurance END,
            customs_broker_fee= CASE WHEN customs_broker_fee = 0 AND ? > 0 THEN ? ELSE customs_broker_fee END,
            siscomex_fee      = CASE WHEN siscomex_fee = 0      AND ? > 0 THEN ? ELSE siscomex_fee END,
            estimated_arrival = CASE WHEN estimated_arrival IS NULL AND ? IS NOT NULL THEN ? ELSE estimated_arrival END,
            updated_at = datetime('now')
          WHERE id = ?
        `).run(
          freightIntl || 0, freightIntl || 0,
          storage, storage,
          freightDom, freightDom,
          insurance || 0, insurance || 0,
          brokerFee || 0, brokerFee || 0,
          siscomex || 0, siscomex || 0,
          arrival, arrival,
          proc.id
        );
        customsUpdated++;
      }
    } catch (err) {
      errors.push(err.message);
    }
  }

  return {
    label: TYPE_LABELS.csv2,
    suppliers: { inserted: suppliersInserted, skipped: suppliersSkipped },
    customs: { updated: customsUpdated },
    errors,
  };
}

// ── Route: POST /api/import/upload ───────────────────────────

router.post('/upload', authorize('admin', 'manager', 'operator'), (req, res, next) => {
  upload.single('file')(req, res, err => {
    if (err instanceof multer.MulterError) return res.status(400).json({ error: `Upload: ${err.message}` });
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

  const text = req.file.buffer.toString('utf-8');
  const rows = parseCSV(text);

  if (rows.length < 3) return res.status(400).json({ error: 'Arquivo CSV muito pequeno ou inválido' });

  const type = detectType(rows);
  if (type === 'unknown') {
    return res.status(422).json({
      error: 'Formato não reconhecido. Envie: Follow-up de Importação, Cabeçalho de Nota ou Faturamento.',
      hint: `Primeiras colunas detectadas: ${rows.slice(2, 4).map(r => r.slice(0, 4).join(' | ')).join(' // ')}`,
    });
  }

  const db = getDb();
  try {
    let result;
    if (type === 'csv1') result = importCSV1(db, rows, req.user.id);
    else if (type === 'csv0') result = importCSV0(db, rows, req.user.id);
    else result = importCSV2(db, rows, req.user.id);

    res.json({ success: true, type, filename: req.file.originalname, rows: rows.length, ...result });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: `Erro na importação: ${err.message}` });
  }
});

module.exports = router;

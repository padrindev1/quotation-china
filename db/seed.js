'use strict';
const path = require('path');
const fs = require('fs');

// CSV parsing — minimal, handles quoted fields
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

function col(row, i) { return (row[i] || '').replace(/\n/g, ' ').trim(); }

function parseBRL(s) {
  if (!s) return null;
  const n = s.replace(/R\$\s*/,'').replace(/\./g,'').replace(',','.').trim();
  const v = parseFloat(n);
  return isNaN(v) ? null : v;
}

function parseUSD(s) {
  if (!s) return null;
  const n = s.replace(/\$/,'').replace(/\./g,'').replace(',','.').trim();
  const v = parseFloat(n);
  return isNaN(v) ? null : v;
}

function parseDateBR(s) {
  if (!s || s.includes('X')) return null;
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
}

function statusFromFollowup(raw) {
  const s = raw.toLowerCase();
  if (s.includes('finalizado') || s.includes('finaliz')) return 'completed';
  if (s.includes('desembaraço') || s.includes('desembaraco')) return 'customs_clearance';
  if (s.includes('contabilidade') || s.includes('estoque')) return 'released';
  if (s.includes('trânsito') || s.includes('transito') || s.includes('consolidação')) return 'in_progress';
  if (s.includes('processo produtivo') || s.includes('produtiv')) return 'in_progress';
  return 'draft';
}

function categoryFromName(name) {
  const n = name.toUpperCase();
  if (/BROKER|DESPACHO|DESPACHANT|ASSESSORIA|BROKER|DEICMAR|E G A/.test(n)) return 'customs_broker';
  if (/TRANSPORT|LOGISTIC|LOG|FRETE|COURIER|EXPRESS|DHL|FEDERAL EXPRESS|SUNTRANS|COSCO|SKYSEA/.test(n)) return 'freight';
  if (/BRASIL PARTICIPACOES|ECOPORTO|TORA RECINTO|EMBRAPORT/.test(n)) return 'warehouse';
  return 'supplier';
}

function countryFromName(name) {
  const n = name.toUpperCase();
  if (/SHANDONG|SHANGHAI|SHENZHEN|FOSHAN|WENZHOU|ZHONGSHAN|GUANGZHOU|HANGZHOU|NINGBO|GOLD EAST|BOFENG|BESTSUB|UNIFAN|GREAT MAGTECH|SUZHOU|SOUNDA|NILS TROEDSSON/.test(n)) return 'China';
  if (/SIGNMATE|SING MATE/.test(n)) return 'Australia';
  if (/FEDERAL EXPRESS/.test(n)) return 'EUA';
  return 'Brasil';
}

async function main() {
  const { getDb, initializeDatabase } = require('./database');
  initializeDatabase();
  const db = getDb();

  const adminRow = db.prepare('SELECT id FROM users LIMIT 1').get();
  const adminId = adminRow ? adminRow.id : 1;

  const CSV_DIR = path.join(__dirname);

  // ── 1. Parse CSV1 (Cabeçalho da Nota) ────────────────────────────────────
  const csv1 = parseCSV(fs.readFileSync(path.join(CSV_DIR, 'csv_1.csv'), 'utf-8'));
  const paymentRows = csv1.filter(r => /^(Aprovado|Pendente|Liberado|Bloqueado)/i.test(col(r,0)));

  // Collect unique supplier names
  const supplierNames = [...new Set(paymentRows.map(r => col(r,1)).filter(Boolean))];

  // ── 2. Insert suppliers ───────────────────────────────────────────────────
  const supplierIdMap = {}; // name -> id
  let supInserted = 0, supSkipped = 0;
  for (const name of supplierNames) {
    const existing = db.prepare('SELECT id FROM suppliers WHERE name = ?').get(name);
    if (existing) {
      supplierIdMap[name] = existing.id;
      supSkipped++;
      continue;
    }
    db.prepare(`
      INSERT INTO suppliers (name, country, category, status, created_by)
      VALUES (?, ?, ?, 'active', ?)
    `).run(name, countryFromName(name), categoryFromName(name), adminId);
    const row = db.prepare('SELECT id FROM suppliers WHERE name = ?').get(name);
    supplierIdMap[name] = row.id;
    supInserted++;
  }
  console.log(`✓ Fornecedores: ${supInserted} inseridos, ${supSkipped} já existiam`);

  // ── 3. Insert payments from CSV1 ──────────────────────────────────────────
  let payInserted = 0, paySkipped = 0;
  for (const r of paymentRows) {
    const invoiceRef = col(r, 4); // Nro. Nota
    const supplierName = col(r, 1);
    const existing = db.prepare('SELECT id FROM payments WHERE invoice_ref = ?').get(invoiceRef);
    if (existing) { paySkipped++; continue; }

    const rawStatus = col(r, 0).toLowerCase();
    let status = 'pending';
    if (rawStatus.includes('aprovado') || rawStatus.includes('liberado')) status = 'approved';
    if (rawStatus.includes('bloqueado')) status = 'cancelled';

    const amountBRL = parseBRL(col(r, 6));
    const dueDate = parseDateBR(col(r, 7)) || parseDateBR(col(r, 8)) || new Date().toISOString().slice(0,10);
    const payDate = parseDateBR(col(r, 13));
    const desc = col(r, 9) || col(r, 14) || col(r, 5) || '—';
    const tipoOp = col(r, 12);
    const notes = tipoOp ? `Tipo: ${tipoOp}` : null;

    db.prepare(`
      INSERT INTO payments
        (supplier_id, description, amount, currency, amount_brl, due_date,
         payment_date, invoice_ref, status, notes, created_by)
      VALUES (?, ?, ?, 'BRL', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      supplierIdMap[supplierName] || null,
      desc.slice(0, 500),
      amountBRL || 0,
      amountBRL,
      dueDate,
      payDate,
      invoiceRef,
      status,
      notes,
      adminId
    );
    payInserted++;
  }
  console.log(`✓ Pagamentos: ${payInserted} inseridos, ${paySkipped} já existiam`);

  // ── 4. Parse CSV0 (Follow-up importação) ─────────────────────────────────
  const csv0 = parseCSV(fs.readFileSync(path.join(CSV_DIR, 'csv_0.csv'), 'utf-8'));
  // Data rows start at index 15 (every 2 rows: even = data, odd = continuation)
  // Actual data on rows where col(r,3) has a status text
  const followupRows = csv0.filter(r => {
    const status = col(r, 3);
    return status && !status.includes('STATUS') && !status.includes('OPERAÇ');
  });

  // Build OC -> supplier mapping from CSV1
  const ocToSupplier = {}; // oc -> supplier name
  for (const r of paymentRows) {
    const oc = col(r, 4); // Nro. Nota = OC
    const sup = col(r, 1);
    if (oc && sup) ocToSupplier[oc] = sup;
  }

  // Also build from CSV2
  const csv2 = parseCSV(fs.readFileSync(path.join(CSV_DIR, 'csv_2.csv'), 'utf-8'));
  const faturRows = csv2.filter(r => col(r, 3) && /\d/.test(col(r, 3)) && col(r, 4));
  const ocToCosts = {}; // oc -> cost object
  for (const r of faturRows) {
    const ocs = col(r, 3).split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    const costs = {
      freight_dta: parseBRL(col(r, 8)),
      siscomex: parseBRL(col(r, 10)),
      storage_santos: parseBRL(col(r, 12)),
      storage_betim: parseBRL(col(r, 15)),
      freight_intl: parseBRL(col(r, 18)) || parseBRL(col(r, 20)) || parseBRL(col(r, 22)),
      freight_domestic: parseBRL(col(r, 25)),
      courier: parseBRL(col(r, 27)),
      insurance: parseBRL(col(r, 30)),
      broker_fee: parseBRL(col(r, 32)),
      empresa: col(r, 4),
      dt: parseDateBR(col(r, 1)),
      arrival: parseDateBR(col(r, 37)),
    };
    for (const oc of ocs) {
      if (oc && oc !== 'OC') ocToCosts[oc] = costs;
    }
    // Also build supplier from empresa
    const empresa = col(r, 4);
    if (empresa) {
      for (const oc of ocs) {
        if (oc && !ocToSupplier[oc]) ocToSupplier[oc] = empresa;
      }
    }
  }

  // Insert missing suppliers from CSV2 empresa names
  const csv2Suppliers = [...new Set(faturRows.map(r => col(r, 4)).filter(Boolean))];
  for (const name of csv2Suppliers) {
    if (supplierIdMap[name]) continue;
    const existing = db.prepare('SELECT id FROM suppliers WHERE name = ?').get(name);
    if (existing) { supplierIdMap[name] = existing.id; continue; }
    // fuzzy match — if we already have a very similar name, skip
    const similar = db.prepare("SELECT id FROM suppliers WHERE name LIKE ?").get(`%${name.slice(0,15)}%`);
    if (similar) { supplierIdMap[name] = similar.id; continue; }
    db.prepare(`INSERT INTO suppliers (name, country, category, status, created_by) VALUES (?, ?, ?, 'active', ?)`)
      .run(name, countryFromName(name), categoryFromName(name), adminId);
    const row = db.prepare('SELECT id FROM suppliers WHERE name = ?').get(name);
    supplierIdMap[name] = row.id;
  }

  // ── 5. Insert customs processes from CSV0 ────────────────────────────────
  let custInserted = 0, custSkipped = 0;
  const seenOCs = new Set();
  for (const r of followupRows) {
    const rawOC = col(r, 7);
    if (!rawOC || rawOC.toLowerCase() === 'false') continue;
    // Take first OC if multiple
    const oc = rawOC.split(/[\n,]+/)[0].trim();
    if (!oc || /^[xX]+$/.test(oc) || oc === 'PENDING') continue;
    if (seenOCs.has(oc)) continue;
    seenOCs.add(oc);

    const existing = db.prepare('SELECT id FROM customs_processes WHERE process_number = ?').get(oc);
    if (existing) { custSkipped++; continue; }

    const rawStatus = col(r, 3);
    const status = statusFromFollowup(rawStatus);
    const product = col(r, 6).slice(0, 500);
    const invoiceUSD = parseUSD(col(r, 9));
    const invoiceBRL = parseBRL(col(r, 10));
    const container = col(r, 11);
    const sector = col(r, 3); // SETOR PRODUTIVO  -- wait, col3 is status
    const sectorDest = col(r, 2);
    const startDate = parseDateBR(col(r, 1));
    const notes = [
      sectorDest ? `Setor: ${sectorDest}` : '',
      col(r, 5) ? `Responsável: ${col(r, 5)}` : '',
      rawStatus ? `Status original: ${rawStatus}` : '',
      container && container !== 'PENDING' ? `Container: ${container}` : '',
    ].filter(Boolean).join(' | ');

    const costs = ocToCosts[oc] || {};
    const supName = ocToSupplier[oc];
    const supplierId = supName ? supplierIdMap[supName] : null;

    const freightIntl = costs.freight_intl || 0;
    const storageCost = (costs.storage_santos || 0) + (costs.storage_betim || 0);
    const freightDomestic = (costs.freight_domestic || 0) + (costs.freight_dta || 0);
    const insurance = costs.insurance || 0;
    const brokerFee = costs.broker_fee || 0;
    const siscomex = costs.siscomex || 0;

    const transport = container && /fcl|hc|st|lcl/i.test(container) ? 'sea' : 'sea';
    const incoterm = oc && /^3/.test(oc) ? 'FOB' : 'FOB';

    db.prepare(`
      INSERT INTO customs_processes
        (process_number, supplier_id, product_description,
         invoice_value, currency, invoice_value_brl,
         freight_intl, insurance, storage_cost, freight_domestic,
         customs_broker_fee, siscomex_fee,
         status, transport_mode, incoterm,
         estimated_arrival, notes, created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      oc, supplierId, product || 'Importação',
      invoiceUSD || 0, 'USD', invoiceBRL,
      freightIntl, insurance, storageCost, freightDomestic,
      brokerFee, siscomex,
      status, transport, incoterm,
      costs.arrival || startDate || null,
      notes || null,
      adminId
    );
    custInserted++;
  }
  console.log(`✓ Processos alfandegários: ${custInserted} inseridos, ${custSkipped} já existiam`);

  // ── 6. Summary ────────────────────────────────────────────────────────────
  const totals = {
    suppliers: db.prepare('SELECT COUNT(*) FROM suppliers').get()[0],
    payments:  db.prepare('SELECT COUNT(*) FROM payments').get()[0],
    customs:   db.prepare('SELECT COUNT(*) FROM customs_processes').get()[0],
  };
  console.log(`\nBanco populado:`);
  console.log(`  Fornecedores : ${totals.suppliers}`);
  console.log(`  Pagamentos   : ${totals.payments}`);
  console.log(`  Processos    : ${totals.customs}`);
}

main().catch(err => { console.error('Erro:', err.message); process.exit(1); });

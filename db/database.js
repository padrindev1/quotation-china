const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

// Em Vercel/serverless, usar /tmp (único dir gravável); local usa data/erp.db
const DB_PATH = process.env.DB_PATH ||
  (process.env.VERCEL ? '/tmp/erp.db' : path.join(__dirname, '..', 'data', 'erp.db'));

let db = null;

// Compatibility wrapper — same API as better-sqlite3
function makeDb(raw) {
  return {
    prepare(sql) {
      return {
        run(...args) {
          const s = raw.prepare(sql);
          try { return s.run(args); } finally { try { s.finalize(); } catch (_) {} }
        },
        get(...args) {
          const s = raw.prepare(sql);
          try { return s.get(args); } finally { try { s.finalize(); } catch (_) {} }
        },
        all(...args) {
          const s = raw.prepare(sql);
          try { return s.all(args); } finally { try { s.finalize(); } catch (_) {} }
        },
      };
    },
    exec(sql) { return raw.exec(sql); },
    pragma(str) { raw.exec(`PRAGMA ${str}`); },
    close() { raw.close(); },
  };
}

function getDb() {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const { Database } = require('node-sqlite3-wasm');
    const raw = new Database(DB_PATH);
    db = makeDb(raw);
  }
  return db;
}

function initializeDatabase() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer'
        CHECK(role IN ('admin', 'manager', 'operator', 'viewer')),
      department TEXT,
      whatsapp_number TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      last_login TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      country TEXT NOT NULL,
      contact_name TEXT,
      email TEXT,
      phone TEXT,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active'
        CHECK(status IN ('active', 'inactive', 'pending')),
      website TEXT,
      notes TEXT,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payback_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER REFERENCES suppliers(id),
      product_name TEXT NOT NULL,
      product_type TEXT NOT NULL
        CHECK(product_type IN ('machine', 'product', 'service', 'other')),
      investment_value REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      exchange_rate REAL DEFAULT 1,
      investment_brl REAL,
      monthly_savings REAL NOT NULL DEFAULT 0,
      monthly_revenue REAL NOT NULL DEFAULT 0,
      monthly_cost_reduction REAL NOT NULL DEFAULT 0,
      payback_months REAL,
      roi_percent REAL,
      npv REAL,
      notes TEXT,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER REFERENCES suppliers(id),
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      amount_brl REAL,
      exchange_rate REAL,
      due_date TEXT NOT NULL,
      payment_date TEXT,
      invoice_ref TEXT,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending', 'approved', 'paid', 'overdue', 'cancelled')),
      payment_method TEXT,
      swift_ref TEXT,
      bank_info TEXT,
      email_sent INTEGER DEFAULT 0,
      email_sent_at TEXT,
      approved_by INTEGER REFERENCES users(id),
      approved_at TEXT,
      notes TEXT,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customs_processes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      process_number TEXT UNIQUE NOT NULL,
      di_number TEXT,
      supplier_id INTEGER REFERENCES suppliers(id),
      product_description TEXT NOT NULL,
      ncm_code TEXT,
      quantity REAL,
      unit TEXT DEFAULT 'UN',
      invoice_value REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      exchange_rate REAL DEFAULT 1,
      invoice_value_brl REAL,
      freight_intl REAL DEFAULT 0,
      insurance REAL DEFAULT 0,
      cif_value REAL,
      ii_rate REAL DEFAULT 0, ii_tax REAL DEFAULT 0,
      ipi_rate REAL DEFAULT 0, ipi_tax REAL DEFAULT 0,
      pis_rate REAL DEFAULT 0, pis_tax REAL DEFAULT 0,
      cofins_rate REAL DEFAULT 0, cofins_tax REAL DEFAULT 0,
      siscomex_fee REAL DEFAULT 0,
      afrmm_fee REAL DEFAULT 0,
      freight_domestic REAL DEFAULT 0,
      storage_cost REAL DEFAULT 0,
      port_charges REAL DEFAULT 0,
      icms_rate REAL DEFAULT 0, icms_tax REAL DEFAULT 0, icms_difal REAL DEFAULT 0,
      customs_broker_fee REAL DEFAULT 0,
      other_costs REAL DEFAULT 0,
      total_taxes REAL DEFAULT 0,
      total_landed_cost REAL,
      status TEXT NOT NULL DEFAULT 'draft'
        CHECK(status IN ('draft','in_progress','customs_clearance','released','completed','suspended')),
      incoterm TEXT DEFAULT 'FOB',
      transport_mode TEXT DEFAULT 'sea',
      estimated_arrival TEXT,
      actual_arrival TEXT,
      clearance_date TEXT,
      delivery_date TEXT,
      notes TEXT,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('whatsapp', 'email')),
      channel TEXT,
      recipient TEXT NOT NULL,
      subject TEXT,
      message TEXT NOT NULL,
      reference_type TEXT,
      reference_id INTEGER,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending', 'sent', 'failed', 'scheduled')),
      sent_at TEXT,
      error_message TEXT,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      resource_id INTEGER,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS consolidation_suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      short_name TEXT,
      city TEXT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      color TEXT NOT NULL DEFAULT '#e8b84b',
      modal TEXT NOT NULL DEFAULT 'road' CHECK(modal IN ('road','rail','river','air')),
      contact_name TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS consolidation_supplier_ocs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL REFERENCES consolidation_suppliers(id) ON DELETE CASCADE,
      oc_number TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(supplier_id, oc_number)
    );

    CREATE TABLE IF NOT EXISTS consolidation_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ref TEXT NOT NULL,
      description TEXT,
      oc TEXT,
      container_type TEXT NOT NULL,
      port TEXT,
      routes_count INTEGER DEFAULT 0,
      total_volume REAL DEFAULT 0,
      total_weight REAL DEFAULT 0,
      costs_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
    CREATE INDEX IF NOT EXISTS idx_customs_status ON customs_processes(status);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
    CREATE INDEX IF NOT EXISTS idx_consol_hist_created ON consolidation_history(created_at);
  `);

  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@oktz.com.br');
  if (!adminExists) {
    const hash = bcrypt.hashSync(process.env.ADMIN_DEFAULT_PASSWORD || 'OKTZ@2024!', 12);
    db.prepare(`
      INSERT INTO users (name, email, password_hash, role, department, must_change_password)
      VALUES (?, ?, ?, 'admin', 'TI', 1)
    `).run('Administrador OKTZ', 'admin@oktz.com.br', hash);
    console.log('✓ Admin criado: admin@oktz.com.br / OKTZ@2024!  ← altere após o primeiro acesso');
  }

  const suppCount = db.prepare('SELECT COUNT(*) AS c FROM consolidation_suppliers').get();
  if (!suppCount.c) {
    const SEED = [
      { name:'Foshan Dechang Technology', short:'Foshan Dechang',  city:'Foshan, Guangdong',   lat:23.1150, lng:112.9580, color:'#ff6b6b', modal:'road', contact:'—',            ocs:['OC 2576','OC 2579'] },
      { name:'Hangzhou Insight',          short:'Hangzhou Insight', city:'Huzhou, Zhejiang',    lat:30.5500, lng:119.9650, color:'#4ecdc4', modal:'road', contact:'Sarah',         ocs:['OC 37578'] },
      { name:'Wenzhou Weigang Intl.',     short:'Wenzhou Weigang',  city:'Wenzhou, Zhejiang',   lat:27.6600, lng:120.5560, color:'#ffd93d', modal:'road', contact:'Jean',          ocs:['OC 2441'] },
      { name:'Shandong Xinst Laser',      short:'Xinst Laser',      city:'Liaocheng, Shandong', lat:36.4564, lng:115.9854, color:'#a29bfe', modal:'road', contact:'Xinster Laser', ocs:['OC 2578','OC 2709'] },
      { name:'Kingpack Machinery',        short:'Kingpack',         city:'Dongguan, Guangdong', lat:22.8340, lng:113.6600, color:'#fd79a8', modal:'road', contact:'Lucky',         ocs:['OC 37800','OC 37801'] },
    ];
    SEED.forEach(s => {
      db.prepare(`
        INSERT INTO consolidation_suppliers (name, short_name, city, lat, lng, color, modal, contact_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(s.name, s.short, s.city, s.lat, s.lng, s.color, s.modal, s.contact);
      // busca o id recém-inserido pelo nome (evita dependência de lastInsertRowid)
      const row = db.prepare('SELECT id FROM consolidation_suppliers WHERE name = ?').get(s.name);
      s.ocs.forEach(oc =>
        db.prepare('INSERT INTO consolidation_supplier_ocs (supplier_id, oc_number) VALUES (?, ?)').run(row.id, oc)
      );
    });
    console.log('✓ Fornecedores ZAP semeados');
  }

  console.log('✓ Banco de dados inicializado');
}

module.exports = { getDb, initializeDatabase };

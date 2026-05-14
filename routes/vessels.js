const express = require('express');
const { body, param } = require('express-validator');
const { getDb } = require('../db/database');
const { handleValidationErrors } = require('../middleware/security');

const router = express.Router();

// ── FREIGHT RATE HELPERS ─────────────────────────────────────────────────────

const PORTS = [
  'Shanghai', 'Shenzhen / Yantian', 'Guangzhou / Nansha',
  'Ningbo-Zhoushan', 'Tianjin', 'Qingdao', 'Xiamen', 'Dalian',
];
const CNT_TYPES = ['20gp', '40gp', '40hc', '45hc'];

function dbRatesToMap(rows) {
  const map = {};
  rows.forEach(r => {
    if (!map[r.port]) map[r.port] = {};
    map[r.port][r.container_type] = {
      rate_usd:   r.rate_usd,
      source:     r.source,
      notes:      r.notes || null,
      updated_at: r.updated_at,
      id:         r.id,
    };
  });
  return map;
}

function rateAgeHours(updated_at) {
  if (!updated_at) return Infinity;
  return (Date.now() - new Date(updated_at).getTime()) / 3_600_000;
}

// ── GET /api/vessels/rates ────────────────────────────────────────────────────
router.get('/rates', (req, res) => {
  try {
    const db   = getDb();
    const rows = db.prepare('SELECT * FROM freight_rates ORDER BY port, container_type').all();
    const map  = dbRatesToMap(rows);

    const staleThresholdH = 7 * 24; // 7 days
    let oldestUpdateAt  = null;
    let newestUpdateAt  = null;
    let hasStale        = false;

    rows.forEach(r => {
      if (!oldestUpdateAt || r.updated_at < oldestUpdateAt) oldestUpdateAt = r.updated_at;
      if (!newestUpdateAt || r.updated_at > newestUpdateAt) newestUpdateAt = r.updated_at;
      if (rateAgeHours(r.updated_at) > staleThresholdH) hasStale = true;
    });

    res.json({
      rates:          map,
      oldest_update:  oldestUpdateAt,
      newest_update:  newestUpdateAt,
      stale:          hasStale,
      stale_threshold_days: 7,
      total_entries:  rows.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/vessels/rates — bulk upsert ──────────────────────────────────────
// Body: { rates: [{ port, container_type, rate_usd, notes? }] }
router.put('/rates', [
  body('rates').isArray({ min: 1, max: 200 }),
  body('rates.*.port').trim().notEmpty().isLength({ max: 100 }),
  body('rates.*.container_type').isIn(CNT_TYPES),
  body('rates.*.rate_usd').isFloat({ min: 0, max: 99999 }),
  body('rates.*.notes').optional().trim().isLength({ max: 500 }),
], handleValidationErrors, (req, res) => {
  try {
    const db  = getDb();
    const now = new Date().toISOString();
    const upsert = db.prepare(`
      INSERT INTO freight_rates (port, container_type, rate_usd, source, notes, updated_at)
      VALUES (?, ?, ?, 'manual', ?, ?)
      ON CONFLICT(port, container_type) DO UPDATE SET
        rate_usd   = excluded.rate_usd,
        source     = 'manual',
        notes      = excluded.notes,
        updated_at = excluded.updated_at
    `);

    req.body.rates.forEach(({ port, container_type, rate_usd, notes }) => {
      upsert.run(port, container_type, rate_usd, notes || null, now);
    });

    const rows = db.prepare('SELECT * FROM freight_rates ORDER BY port, container_type').all();
    res.json({ success: true, rates: dbRatesToMap(rows), updated_at: now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/vessels/rates/refresh — external API or return instructions ─────
router.post('/rates/refresh', async (req, res) => {
  const apiKey  = process.env.FREIGHT_API_KEY;
  const provider = process.env.FREIGHT_API_PROVIDER || 'searates';

  if (!apiKey) {
    return res.json({
      configured: false,
      hint: 'Configure FREIGHT_API_KEY e FREIGHT_API_PROVIDER no .env para buscar tarifas automaticamente.',
      providers: [
        { id: 'searates',  name: 'SeaRates',  url: 'https://www.searates.com/reference/api/' },
        { id: 'freightos', name: 'Freightos', url: 'https://developer.freightos.com/' },
      ],
    });
  }

  try {
    const db  = getDb();
    const now = new Date().toISOString();
    let fetched = 0;

    if (provider === 'searates') {
      // SeaRates FCL rates: China → Santos (BRSSZ)
      // Endpoint: GET /rates?api_key=...&origin=...&destination=BRSSZ&container=...
      const origins = [
        { port: 'Shanghai',          locode: 'CNSHA' },
        { port: 'Shenzhen / Yantian',locode: 'CNSZX' },
        { port: 'Guangzhou / Nansha',locode: 'CNGZU' },
        { port: 'Ningbo-Zhoushan',   locode: 'CNNGB' },
        { port: 'Tianjin',           locode: 'CNTXG' },
        { port: 'Qingdao',           locode: 'CNTAO' },
        { port: 'Xiamen',            locode: 'CNXMN' },
        { port: 'Dalian',            locode: 'CNDLC' },
      ];

      const upsert = db.prepare(`
        INSERT INTO freight_rates (port, container_type, rate_usd, source, notes, updated_at)
        VALUES (?, ?, ?, 'searates', ?, ?)
        ON CONFLICT(port, container_type) DO UPDATE SET
          rate_usd   = excluded.rate_usd,
          source     = 'searates',
          notes      = excluded.notes,
          updated_at = excluded.updated_at
      `);

      for (const { port, locode } of origins) {
        for (const type of CNT_TYPES) {
          const eqType = { '20gp':'20DC', '40gp':'40DC', '40hc':'40HC', '45hc':'45HC' }[type];
          const url = `https://www.searates.com/api/rates?api_key=${apiKey}&origin=${locode}&destination=BRSSZ&type=${eqType}&date=${now.slice(0,10)}`;
          try {
            const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
            if (!r.ok) continue;
            const data = await r.json();
            const rate = data?.rates?.[0]?.total_price || data?.price || null;
            if (rate && rate > 0) {
              upsert.run(port, type, rate, `SeaRates ${now.slice(0,10)}`, now);
              fetched++;
            }
          } catch { /* skip individual failures */ }
        }
      }
    } else if (provider === 'freightos') {
      return res.json({
        configured: true,
        provider: 'freightos',
        error: 'Freightos requer conta business — contate sales@freightos.com',
      });
    }

    const rows = db.prepare('SELECT * FROM freight_rates ORDER BY port, container_type').all();
    res.json({
      success: true,
      provider,
      fetched,
      rates: dbRatesToMap(rows),
      updated_at: now,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── In-memory caches ──────────────────────────────────────────────────────────
let exchangeCache = null;
let exchangeCacheTs = 0;
const EXCHANGE_TTL = 15 * 60 * 1000; // 15 minutes

// ── GET /api/vessels/exchange ─────────────────────────────────────────────────
// Proxy gratuito para AwesomeAPI (economia.awesomeapi.com.br) — sem chave necessária
router.get('/exchange', async (req, res) => {
  const now = Date.now();
  if (exchangeCache && (now - exchangeCacheTs) < EXCHANGE_TTL) {
    return res.json({ ...exchangeCache, cached: true });
  }

  try {
    const r = await fetch(
      'https://economia.awesomeapi.com.br/json/USD-BRL,CNY-BRL,EUR-BRL',
      { signal: AbortSignal.timeout(8000) }
    );
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const d = await r.json();

    exchangeCache = {
      USD_BRL: parseFloat(d['USD-BRL']?.bid  || '5.05').toFixed(4),
      CNY_BRL: parseFloat(d['CNY-BRL']?.bid  || '0.70').toFixed(4),
      EUR_BRL: parseFloat(d['EUR-BRL']?.bid  || '5.50').toFixed(4),
      USD_high: parseFloat(d['USD-BRL']?.high || '0').toFixed(4),
      USD_low:  parseFloat(d['USD-BRL']?.low  || '0').toFixed(4),
      updated_at: new Date().toISOString(),
      source: 'AwesomeAPI',
      cached: false,
    };
    exchangeCacheTs = now;
    res.json(exchangeCache);
  } catch (err) {
    // fallback: retorna última cache ou valores padrão
    const fallback = exchangeCache || {
      USD_BRL: '5.05', CNY_BRL: '0.70', EUR_BRL: '5.50',
      updated_at: null, source: 'fallback', cached: false,
    };
    res.json({ ...fallback, error: 'Serviço temporariamente indisponível', cached: true });
  }
});

// ── GET /api/vessels/search?q=...&imo=...&mmsi=... ────────────────────────────
// Proxy configurável — requer VESSEL_API_KEY no .env
router.get('/search', async (req, res) => {
  const { q, imo, mmsi } = req.query;
  if (!q && !imo && !mmsi) {
    return res.status(400).json({ error: 'Informe q (nome), imo ou mmsi' });
  }

  const apiKey = process.env.VESSEL_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      configured: false,
      error: 'VESSEL_API_KEY não configurada',
      hint: 'Configure VESSEL_API_KEY e VESSEL_API_PROVIDER no arquivo .env. ' +
            'Recomendado: VesselFinder (vesselFinder) ou MarineTraffic (marineTraffic).',
    });
  }

  const provider = process.env.VESSEL_API_PROVIDER || 'vesselFinder';

  try {
    let url;
    if (provider === 'vesselFinder') {
      if (mmsi)      url = `https://api.vesselfinder.com/vessels?userkey=${apiKey}&mmsi=${encodeURIComponent(mmsi)}`;
      else if (imo)  url = `https://api.vesselfinder.com/vessels?userkey=${apiKey}&imo=${encodeURIComponent(imo)}`;
      else           url = `https://api.vesselfinder.com/vessels?userkey=${apiKey}&name=${encodeURIComponent(q)}`;
    } else if (provider === 'marineTraffic') {
      if (mmsi)      url = `https://services.marinetraffic.com/api/getvessel/v:3/${apiKey}/protocol:jsono/MMSI:${mmsi}`;
      else if (imo)  url = `https://services.marinetraffic.com/api/getvessel/v:3/${apiKey}/protocol:jsono/IMO:${imo}`;
      else           url = `https://services.marinetraffic.com/api/getvessel/v:3/${apiKey}/protocol:jsono/VESSEL_NAME:${encodeURIComponent(q)}`;
    } else if (provider === 'datalastic') {
      if (mmsi)      url = `https://api.datalastic.com/api/v0/vessel?api-key=${apiKey}&mmsi=${mmsi}`;
      else if (imo)  url = `https://api.datalastic.com/api/v0/vessel?api-key=${apiKey}&imo=${imo}`;
      else           url = `https://api.datalastic.com/api/v0/vessel_find?api-key=${apiKey}&name=${encodeURIComponent(q)}`;
    } else {
      return res.status(400).json({ error: `Provider desconhecido: ${provider}` });
    }

    const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      return res.status(r.status).json({ error: `API error ${r.status}`, detail: body.substring(0, 200) });
    }
    const data = await r.json();
    res.json({ configured: true, provider, data });
  } catch (err) {
    res.status(500).json({ configured: true, error: err.message });
  }
});

// ── GET /api/vessels/:mmsi ────────────────────────────────────────────────────
// Posição atual de um vessel por MMSI
router.get('/:mmsi', async (req, res) => {
  const { mmsi } = req.params;
  if (!/^\d{9}$/.test(mmsi)) {
    return res.status(400).json({ error: 'MMSI deve ter 9 dígitos' });
  }

  const apiKey = process.env.VESSEL_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ configured: false, error: 'VESSEL_API_KEY não configurada' });
  }

  const provider = process.env.VESSEL_API_PROVIDER || 'vesselFinder';

  try {
    let url;
    if (provider === 'vesselFinder') {
      url = `https://api.vesselfinder.com/vessels?userkey=${apiKey}&mmsi=${mmsi}`;
    } else if (provider === 'marineTraffic') {
      url = `https://services.marinetraffic.com/api/getvessel/v:3/${apiKey}/protocol:jsono/MMSI:${mmsi}`;
    } else if (provider === 'datalastic') {
      url = `https://api.datalastic.com/api/v0/vessel?api-key=${apiKey}&mmsi=${mmsi}`;
    }

    const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!r.ok) throw new Error(`API error ${r.status}`);
    const data = await r.json();
    res.json({ configured: true, provider, data });
  } catch (err) {
    res.status(500).json({ configured: true, error: err.message });
  }
});

module.exports = router;

const express = require('express');

const router = express.Router();

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

// Vercel Serverless — wrapper para o Express app
// Todas as rotas /api/* são roteadas para cá

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const { initializeDatabase } = require('../db/database');
const { apiLimiter, authLimiter } = require('../middleware/security');

const authRoutes         = require('../routes/auth');
const supplierRoutes     = require('../routes/suppliers');
const paymentRoutes      = require('../routes/payments');
const customsRoutes      = require('../routes/customs');
const notificationRoutes = require('../routes/notifications');
const userRoutes         = require('../routes/users');
const importRoutes       = require('../routes/import');
const consolidationRoutes= require('../routes/consolidation');

const app = express();

// Inicializa DB (SQLite em /tmp no Vercel — efêmero por natureza)
try { initializeDatabase(); } catch(e) { console.error('DB init:', e.message); }

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
      styleSrc:  ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
      fontSrc:   ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc:    ["'self'", "data:", "https:"],
      connectSrc:["'self'", "https://tile.openstreetmap.org", "https://*.tile.openstreetmap.org"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: (origin, callback) => {
    const allowed = (process.env.ALLOWED_ORIGINS || '*').split(',').map(o => o.trim());
    if (!origin || allowed.includes('*') || allowed.includes(origin)) return callback(null, true);
    callback(new Error('Origem não permitida pelo CORS'));
  },
  credentials: true,
}));

app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);

app.use('/api/auth',          authRoutes);
app.use('/api/suppliers',     supplierRoutes);
app.use('/api/payments',      paymentRoutes);
app.use('/api/customs',       customsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/import',        importRoutes);
app.use('/api/consolidation', consolidationRoutes);

app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Export para Vercel (serverless handler)
module.exports = app;

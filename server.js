require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const { initializeDatabase } = require('./db/database');
const { apiLimiter, authLimiter } = require('./middleware/security');

const authRoutes = require('./routes/auth');
const supplierRoutes = require('./routes/suppliers');
const paymentRoutes = require('./routes/payments');
const customsRoutes = require('./routes/customs');
const notificationRoutes = require('./routes/notifications');
const userRoutes = require('./routes/users');
const importRoutes = require('./routes/import');
const consolidationRoutes = require('./routes/consolidation');
const vesselRoutes = require('./routes/vessels');

const app = express();
const PORT = process.env.PORT || 3000;

initializeDatabase();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://tile.openstreetmap.org", "https://router.project-osrm.org", "https://server.arcgisonline.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: (origin, callback) => {
    const allowed = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
    if (!origin || allowed.includes(origin)) return callback(null, true);
    callback(new Error('Origem não permitida pelo CORS'));
  },
  credentials: true,
}));

app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(express.static(path.join(__dirname, 'public'), {
  dotfiles: 'deny',
  index: false,
  etag: true,
}));

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/customs', customsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/import', importRoutes);
app.use('/api/consolidation', consolidationRoutes);
app.use('/api/vessels', vesselRoutes);

const pages = ['dashboard', 'suppliers', 'payments', 'customs', 'notifications', 'users', 'reports', 'import'];
pages.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', `${page}.html`));
  });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

app.use((req, res) => res.status(404).json({ error: 'Recurso não encontrado' }));

app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║   OKTZ ERP - Importação              ║`);
  console.log(`║   Servidor: http://localhost:${PORT}    ║`);
  console.log(`╚══════════════════════════════════════╝\n`);
});

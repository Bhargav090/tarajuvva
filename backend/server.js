const path = require('path');
// Load backend/.env explicitly (cwd-independent)
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { initializeDatabase } = require('./src/db/database');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;

// Security & performance middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
app.use(morgan('dev'));
const allowedOrigins = new Set([
  process.env.FRONTEND_URL,
  'https://tarajuvva.com',
  'https://www.tarajuvva.com',
  'http://tarajuvva.com',
  'http://www.tarajuvva.com',
  'http://localhost:5173',
].filter(Boolean));

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '80mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure uploads directory exists (required for multer disk storage)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files (local disk first)
app.use('/uploads', express.static(uploadsDir));

// When using a shared remote DB, product images often live only on production.
// Missing local files redirect there so shop/admin previews work in local dev.
const uploadsFallbackOrigin = String(process.env.UPLOADS_FALLBACK_ORIGIN || '').replace(/\/$/, '');
if (uploadsFallbackOrigin) {
  app.use('/uploads', (req, res) => {
    res.redirect(302, `${uploadsFallbackOrigin}${req.originalUrl}`);
  });
}

// Routes
app.use('/api/media', require('./src/routes/media'));
app.use('/api/auth',      require('./src/routes/auth'));
app.use('/api/users',     require('./src/routes/users'));
app.use('/api/shop',      require('./src/routes/shop'));
app.use('/api/reimagine', require('./src/routes/reimagine'));
app.use('/api/waitlist',  require('./src/routes/waitlist'));
app.use('/api/settings',  require('./src/routes/settings'));
// Register specific /api/admin/* routes before the generic admin router
// app.use('/api/admin/hero-images', require('./src/routes/heroImages')); // disabled — heroes use static frontend assets
app.use('/api/admin/reimagine-images', require('./src/routes/reimagineImages'));
app.use('/api/admin/testimonials', require('./src/routes/testimonials'));
app.use('/api/admin/settings', require('./src/routes/adminSettings'));
const { adminRouter: consultationSlotsAdmin } = require('./src/routes/consultationSlots');
app.use('/api/admin/consultation-slots', consultationSlotsAdmin);
app.use('/api/admin',     require('./src/routes/admin'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Tarajuvva API is running 🧵', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

async function start() {
  await initializeDatabase();
  app.listen(PORT, () => {
    console.log(`\n🧵 Tarajuvva API Server`);
    console.log(`✅ Running on http://localhost:${PORT}`);
    console.log(`📊 Admin: username=${process.env.ADMIN_USERNAME}`);
    console.log(`🌐 Frontend: ${process.env.FRONTEND_URL}`);
    const dbLoc = process.env.MYSQL_SOCKET_PATH?.trim()
      ? `socket:${process.env.MYSQL_SOCKET_PATH}`
      : `${process.env.MYSQL_HOST || '127.0.0.1'}:${process.env.MYSQL_PORT || 3306}`;
    console.log(`🗄️  MySQL: ${dbLoc}/${process.env.MYSQL_DATABASE || 'tarajuvva'}\n`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

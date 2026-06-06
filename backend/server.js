require('dotenv').config();
const { initializeDatabase } = require('./src/db/database');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;

// Security & performance middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '80mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure uploads directory exists (required for multer disk storage)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth',      require('./src/routes/auth'));
app.use('/api/users',     require('./src/routes/users'));
app.use('/api/shop',      require('./src/routes/shop'));
app.use('/api/reimagine', require('./src/routes/reimagine'));
app.use('/api/waitlist',  require('./src/routes/waitlist'));
app.use('/api/admin',     require('./src/routes/admin'));
app.use('/api/settings',  require('./src/routes/settings'));
app.use('/api/admin/hero-images', require('./src/routes/heroImages'));
app.use('/api/admin/reimagine-images', require('./src/routes/reimagineImages'));

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

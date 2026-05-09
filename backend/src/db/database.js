const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/tarajuvva.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeDatabase() {
  db.exec(`
    -- Users table (email/password + Google SSO)
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      email       TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      google_id   TEXT UNIQUE,
      avatar      TEXT,
      phone       TEXT,
      address     TEXT,
      role        TEXT DEFAULT 'user',
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Products
    CREATE TABLE IF NOT EXISTS products (
      id             TEXT PRIMARY KEY,
      name           TEXT NOT NULL,
      price          REAL NOT NULL,
      original_price REAL,
      category       TEXT NOT NULL,
      description    TEXT,
      ways_to_wear   TEXT,
      images         TEXT NOT NULL DEFAULT '[]',
      tags           TEXT DEFAULT '[]',
      stock          INTEGER DEFAULT 100,
      featured       INTEGER DEFAULT 0,
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Orders (linked to user, also allows guest checkout)
    CREATE TABLE IF NOT EXISTS orders (
      id             TEXT PRIMARY KEY,
      user_id        TEXT REFERENCES users(id) ON DELETE SET NULL,
      user_name      TEXT NOT NULL,
      user_email     TEXT,
      user_phone     TEXT NOT NULL,
      address        TEXT NOT NULL,
      items          TEXT NOT NULL,
      total          REAL NOT NULL,
      status         TEXT DEFAULT 'received',
      payment_method TEXT DEFAULT 'cod',
      notes          TEXT,
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Reimagine requests (linked to user)
    CREATE TABLE IF NOT EXISTS reimagine_requests (
      id                   TEXT PRIMARY KEY,
      user_id              TEXT REFERENCES users(id) ON DELETE SET NULL,
      user_name            TEXT NOT NULL,
      user_phone           TEXT NOT NULL,
      user_email           TEXT,
      address              TEXT,
      garment_type         TEXT NOT NULL,
      transformation       TEXT NOT NULL,
      notes                TEXT,
      images               TEXT DEFAULT '[]',
      status               TEXT DEFAULT 'pending_review',
      is_custom            INTEGER DEFAULT 0,
      consultation_paid    INTEGER DEFAULT 0,
      admin_notes          TEXT,
      created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Waitlist
    CREATE TABLE IF NOT EXISTS waitlist (
      id         TEXT PRIMARY KEY,
      type       TEXT NOT NULL,
      user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL,
      phone      TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Admin accounts (separate from users)
    CREATE TABLE IF NOT EXISTS admins (
      id            TEXT PRIMARY KEY,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (productCount.count === 0) seedProducts();
}

function seedProducts() {
  const products = [
    {
      id: 'p1', name: 'Indigo Block Print Kurta', price: 1299, original_price: 1799,
      category: 'Tops',
      description: 'Handcrafted block print kurta in deep indigo. Made from 100% organic cotton. Each piece is unique.',
      ways_to_wear: JSON.stringify(['Pair with palazzo pants for a relaxed day look', 'Tuck into high-waisted jeans for a modern silhouette', 'Wear as a dress with a belt at the waist']),
      images: JSON.stringify(['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80', 'https://images.unsplash.com/photo-1594938298603-c8148c4b4a18?w=600&q=80']),
      tags: JSON.stringify(['cotton', 'handcrafted', 'block-print', 'sustainable']), stock: 15, featured: 1
    },
    {
      id: 'p2', name: 'Rust Linen Co-ord Set', price: 2199, original_price: 2999,
      category: 'Co-ords',
      description: 'Breathable linen co-ord in earthy rust. Minimalist silhouette. Easy to style.',
      ways_to_wear: JSON.stringify(['Wear the set together for a put-together look', 'Mix the top with white trousers', 'Style the pants with a plain white tee']),
      images: JSON.stringify(['https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&q=80', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80']),
      tags: JSON.stringify(['linen', 'co-ord', 'sustainable']), stock: 8, featured: 1
    },
    {
      id: 'p3', name: 'Vintage Wash Denim Jacket', price: 1899, original_price: 2499,
      category: 'Outerwear',
      description: 'Upcycled denim jacket with vintage wash. No two pieces are identical.',
      ways_to_wear: JSON.stringify(['Layer over a floral dress for contrast', 'Pair with matching denim for a double-denim moment', 'Throw over a kurta for a fusion look']),
      images: JSON.stringify(['https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=600&q=80', 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=600&q=80']),
      tags: JSON.stringify(['denim', 'upcycled', 'vintage']), stock: 5, featured: 1
    },
    {
      id: 'p4', name: 'Cream Handloom Saree', price: 3499, original_price: 4500,
      category: 'Sarees',
      description: 'Pure handloom cotton saree from Andhra Pradesh weavers. Supporting artisan communities.',
      ways_to_wear: JSON.stringify(['Traditional drape for festive occasions', 'Pre-stitched style for everyday ease', 'Drape as a dhoti-style bottom with a crop top']),
      images: JSON.stringify(['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80']),
      tags: JSON.stringify(['handloom', 'saree', 'artisan']), stock: 10, featured: 1
    },
    {
      id: 'p5', name: 'Forest Green Wrap Dress', price: 1599, original_price: 2199,
      category: 'Dresses',
      description: 'Versatile wrap dress in deep forest green. One size fits most.',
      ways_to_wear: JSON.stringify(['Classic wrap tie at the waist', 'Off-shoulder by adjusting the neckline', 'As a skirt by tying at the hips']),
      images: JSON.stringify(['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&q=80']),
      tags: JSON.stringify(['wrap', 'versatile', 'dress']), stock: 12, featured: 0
    },
    {
      id: 'p6', name: 'Raw Edge Corset Top', price: 999, original_price: 1499,
      category: 'Tops',
      description: 'Edgy corset top with raw edges. Reimagined from upcycled fabric.',
      ways_to_wear: JSON.stringify(['Pair with high-waisted trousers', 'Layer over a fitted tee', 'Style with a midi skirt']),
      images: JSON.stringify(['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80']),
      tags: JSON.stringify(['corset', 'upcycled', 'edgy']), stock: 20, featured: 0
    }
  ];

  const insert = db.prepare(`INSERT INTO products (id,name,price,original_price,category,description,ways_to_wear,images,tags,stock,featured) VALUES (@id,@name,@price,@original_price,@category,@description,@ways_to_wear,@images,@tags,@stock,@featured)`);
  db.transaction(prods => prods.forEach(p => insert.run(p)))(products);
  console.log('✅ Products seeded');
}

initializeDatabase();
module.exports = db;

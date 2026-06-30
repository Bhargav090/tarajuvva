const mysql = require('mysql2/promise');

let pool;

function validateDbName(name) {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error('MYSQL_DATABASE must contain only letters, numbers, and underscores');
  }
  return name;
}

function baseConnectionConfig() {
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD ?? '';
  const socketPath = process.env.MYSQL_SOCKET_PATH?.trim();
  if (socketPath) {
    return { socketPath, user, password };
  }
  return {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user,
    password,
  };
}

async function ensureDatabaseExists() {
  const database = validateDbName(process.env.MYSQL_DATABASE || 'tarajuvva');
  const cfg = baseConnectionConfig();
  let conn;
  try {
    conn = await mysql.createConnection(cfg);
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } catch (e) {
    if (e.code === 'ER_ACCESS_DENIED_ERROR') {
      const viaSocket = !!cfg.socketPath;
      const hint = viaSocket
        ? 'Check MYSQL_USER, MYSQL_PASSWORD, and MYSQL_SOCKET_PATH.'
        : [
            'Password/user rejected for this MySQL server.',
            '• Docker (backend/docker-compose.yml): use MYSQL_PORT=3307 and MYSQL_PASSWORD equal to MYSQL_ROOT_PASSWORD (default tarajuvva_local). Start with: docker compose up -d',
            '• Native MySQL on 3306: set MYSQL_PASSWORD to that server’s root password (not the Docker default).',
            'Verify: mysql -h 127.0.0.1 -P <port> -u root -p',
          ].join('\n');
      e.message = `${e.sqlMessage || e.message}\n\n${hint}`;
    }
    throw e;
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}

async function get(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows[0] ?? null;
}

async function all(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function run(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return result;
}

/** Seed one admin from ADMIN_USERNAME / ADMIN_PASSWORD when `admins` is empty (bcrypt hash). */
async function ensureDefaultAdmin() {
  const countRow = await get('SELECT COUNT(*) AS c FROM admins');
  if (Number(countRow?.c) > 0) return;
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!username || password == null || password === '') return;
  const bcrypt = require('bcryptjs');
  const { v4: uuidv4 } = require('uuid');
  const hash = await bcrypt.hash(password, 10);
  const id = uuidv4();
  await run('INSERT INTO admins (id, username, password_hash) VALUES (?, ?, ?)', [id, username, hash]);
}

async function initializeDatabase() {
  await ensureDatabaseExists();
  const database = validateDbName(process.env.MYSQL_DATABASE || 'tarajuvva');
  pool = mysql.createPool({
    ...baseConnectionConfig(),
    database,
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    // Return DATE/DATETIME as strings — avoids IST/UTC off-by-one in slot calendars.
    dateStrings: true,
  });

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255),
      google_id VARCHAR(255),
      avatar TEXT,
      phone VARCHAR(64),
      address TEXT,
      role VARCHAR(32) DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_users_email (email),
      UNIQUE KEY uq_users_google_id (google_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price DOUBLE NOT NULL,
      original_price DOUBLE,
      category VARCHAR(128) NOT NULL,
      description TEXT,
      ways_to_wear TEXT,
      images LONGTEXT NOT NULL,
      tags TEXT,
      stock INT DEFAULT 100,
      featured TINYINT(1) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36),
      user_name VARCHAR(255) NOT NULL,
      user_email VARCHAR(255),
      user_phone VARCHAR(64) NOT NULL,
      address TEXT NOT NULL,
      items TEXT NOT NULL,
      total DOUBLE NOT NULL,
      status VARCHAR(32) DEFAULT 'received',
      payment_method VARCHAR(32) DEFAULT 'cod',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS reimagine_requests (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36),
      user_name VARCHAR(255) NOT NULL,
      user_phone VARCHAR(64) NOT NULL,
      user_email VARCHAR(255),
      address TEXT,
      garment_type VARCHAR(128) NOT NULL,
      transformation VARCHAR(255) NOT NULL,
      notes TEXT,
      images TEXT,
      status VARCHAR(32) DEFAULT 'pending_review',
      is_custom TINYINT(1) DEFAULT 0,
      consultation_paid TINYINT(1) DEFAULT 0,
      admin_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_reimagine_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS waitlist (
      id VARCHAR(36) PRIMARY KEY,
      type VARCHAR(32) NOT NULL,
      user_id VARCHAR(36),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(64),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_waitlist_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS admins (
      id VARCHAR(36) PRIMARY KEY,
      username VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_admins_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS hero_images (
      id VARCHAR(36) PRIMARY KEY,
      image_path VARCHAR(512) NOT NULL,
      width INT NOT NULL,
      height INT NOT NULL,
      aspect_label VARCHAR(16) NOT NULL,
      is_active TINYINT(1) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  try {
    await pool.execute(
      "ALTER TABLE hero_images ADD COLUMN context VARCHAR(32) NOT NULL DEFAULT 'home' AFTER aspect_label"
    );
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME' && e.errno !== 1060) {
      console.warn('[db] hero_images.context add skipped:', e.message);
    }
  }

  try {
    await pool.execute('CREATE INDEX idx_hero_images_context ON hero_images (context, is_active)');
  } catch (e) {
    if (e.code !== 'ER_DUP_KEYNAME' && e.errno !== 1061) {
      console.warn('[db] hero_images context index skipped:', e.message);
    }
  }

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS reimagine_images (
      id VARCHAR(36) PRIMARY KEY,
      garment_type VARCHAR(32) NOT NULL,
      transformation VARCHAR(128) NOT NULL DEFAULT '',
      image_path VARCHAR(512) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_reimagine_image (garment_type, transformation)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS testimonials (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      city VARCHAR(128) NOT NULL,
      quote TEXT NOT NULL,
      image_path VARCHAR(512) NULL,
      image_paths TEXT NULL,
      google_review_url VARCHAR(512) NULL,
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS consultation_slots (
      id VARCHAR(36) PRIMARY KEY,
      slot_date DATE NOT NULL,
      slot_time TIME NOT NULL,
      is_booked TINYINT(1) DEFAULT 0,
      booked_request_id VARCHAR(36) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_consultation_slot_datetime (slot_date, slot_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  try {
    await pool.execute('ALTER TABLE reimagine_requests ADD COLUMN consultation_slot_id VARCHAR(36) NULL AFTER consultation_paid');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME' && e.errno !== 1060) {
      console.warn('[db] reimagine_requests.consultation_slot_id add skipped:', e.message);
    }
  }
  try {
    await pool.execute('ALTER TABLE reimagine_requests ADD COLUMN consultation_date DATE NULL AFTER consultation_slot_id');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME' && e.errno !== 1060) {
      console.warn('[db] reimagine_requests.consultation_date add skipped:', e.message);
    }
  }
  try {
    await pool.execute('ALTER TABLE reimagine_requests ADD COLUMN consultation_time TIME NULL AFTER consultation_date');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME' && e.errno !== 1060) {
      console.warn('[db] reimagine_requests.consultation_time add skipped:', e.message);
    }
  }
  try {
    await pool.execute('ALTER TABLE reimagine_requests ADD COLUMN callback_requested TINYINT(1) DEFAULT 0 AFTER consultation_time');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME' && e.errno !== 1060) {
      console.warn('[db] reimagine_requests.callback_requested add skipped:', e.message);
    }
  }

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS site_settings (
      setting_key VARCHAR(64) PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureDefaultAdmin();

  try {
    await pool.execute('ALTER TABLE testimonials ADD COLUMN image_paths TEXT NULL AFTER image_path');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME' && e.errno !== 1060) {
      console.warn('[db] testimonials.image_paths column add skipped:', e.message);
    }
  }

  const legacyImages = await all('SELECT id, image_path, image_paths FROM testimonials');
  for (const row of legacyImages) {
    if (row.image_path && !row.image_paths) {
      await run('UPDATE testimonials SET image_paths = ? WHERE id = ?', [
        JSON.stringify([row.image_path]),
        row.id,
      ]);
    }
  }

  await ensureDefaultTestimonials();

  const { ensureDefaultReimagineCustomizeSettings } = require('../utils/siteSettings');
  await ensureDefaultReimagineCustomizeSettings();

  // Add sizes column to products (idempotent — skipped if already present).
  try {
    await pool.execute('ALTER TABLE products ADD COLUMN sizes TEXT AFTER stock');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME' && e.errno !== 1060) {
      console.warn('[db] products.sizes column add skipped:', e.message);
    }
  }

  // Allow large base64 data URLs in product images (existing DBs may still have TEXT).
  try {
    await pool.execute('ALTER TABLE products MODIFY COLUMN images LONGTEXT NOT NULL');
  } catch (e) {
    if (e.code !== 'ER_BAD_FIELD_ERROR' && e.errno !== 1054) {
      console.warn('[db] products.images column alter skipped:', e.message);
    }
  }

  // Widen image columns for base64 storage (idempotent).
  const imageColumnAlters = [
    'ALTER TABLE hero_images MODIFY COLUMN image_path LONGTEXT NOT NULL',
    'ALTER TABLE reimagine_images MODIFY COLUMN image_path LONGTEXT NOT NULL',
    'ALTER TABLE testimonials MODIFY COLUMN image_path LONGTEXT NULL',
    'ALTER TABLE testimonials MODIFY COLUMN image_paths LONGTEXT NULL',
    'ALTER TABLE reimagine_requests MODIFY COLUMN images LONGTEXT NULL',
  ];
  for (const sql of imageColumnAlters) {
    try {
      await pool.execute(sql);
    } catch (e) {
      console.warn('[db] image column widen skipped:', e.message);
    }
  }

  const orderPaymentAlters = [
    "ALTER TABLE orders ADD COLUMN payment_status VARCHAR(32) DEFAULT 'cod' AFTER payment_method",
    'ALTER TABLE orders ADD COLUMN razorpay_order_id VARCHAR(64) NULL AFTER payment_status',
    'ALTER TABLE orders ADD COLUMN razorpay_payment_id VARCHAR(64) NULL AFTER razorpay_order_id',
    'ALTER TABLE orders ADD COLUMN paid_at DATETIME NULL AFTER razorpay_payment_id',
  ];
  for (const sql of orderPaymentAlters) {
    try {
      await pool.execute(sql);
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME' && e.errno !== 1060) {
        console.warn('[db] orders payment column add skipped:', e.message);
      }
    }
  }

  const row = await get('SELECT COUNT(*) AS count FROM products');
  const productCount = Number(row.count);
  if (productCount === 0) await seedProducts();
}

const DEFAULT_TESTIMONIALS = [
  {
    id: 'testimonial-default-bengaluru',
    name: 'Ananya R.',
    city: 'Bengaluru',
    quote: 'I sent in three sarees. Got back two dresses and a co-ord. My mum cried. Good cry.',
    sort_order: 0,
  },
  {
    id: 'testimonial-default-hyderabad',
    name: 'Arjun M.',
    city: 'Hyderabad',
    quote: 'Reimagine turnaround was quick. Old kurti is now my favourite co-ord set — wears everywhere in Hyderabad heat.',
    sort_order: 1,
  },
  {
    id: 'testimonial-default-vijayawada',
    name: 'Lakshmi P.',
    city: 'Vijayawada',
    quote: 'First brand here that actually took my old pieces seriously. Already planning what to send next.',
    sort_order: 2,
  },
];

/** Keep exactly 3 curated defaults; remove ad-hoc rows; preserve admin-uploaded review images on defaults. */
async function ensureDefaultTestimonials() {
  const ids = DEFAULT_TESTIMONIALS.map((t) => t.id);
  const placeholders = ids.map(() => '?').join(', ');
  await run(`DELETE FROM testimonials WHERE id NOT IN (${placeholders})`, ids);

  for (const t of DEFAULT_TESTIMONIALS) {
    await run(
      `INSERT INTO testimonials (id, name, city, quote, image_paths, google_review_url, sort_order, is_active)
       VALUES (?, ?, ?, ?, NULL, NULL, ?, 1)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         city = VALUES(city),
         quote = VALUES(quote),
         sort_order = VALUES(sort_order),
         is_active = 1`,
      [t.id, t.name, t.city, t.quote, t.sort_order]
    );
  }
}

async function seedProducts() {
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

  const insertSql = `INSERT INTO products (id,name,price,original_price,category,description,ways_to_wear,images,tags,stock,featured) VALUES (?,?,?,?,?,?,?,?,?,?,?)`;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const p of products) {
      await conn.execute(insertSql, [
        p.id, p.name, p.price, p.original_price, p.category, p.description,
        p.ways_to_wear, p.images, p.tags, p.stock, p.featured
      ]);
    }
    await conn.commit();
    console.log('✅ Products seeded');
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

function getPool() {
  if (!pool) throw new Error('Database not initialized; call initializeDatabase() first');
  return pool;
}

module.exports = {
  initializeDatabase,
  getPool,
  get,
  all,
  run,
};

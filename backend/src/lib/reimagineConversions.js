const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { all, get, run } = require('../db/database');
const { isHttpUrl, isDataUrl, parseDataUrl } = require('./imageDataUrl');

const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

/** Max upload size before save (bytes). Keeps DB rows small and avoids packet limits. */
const MAX_CONVERSION_IMAGE_BYTES = 2 * 1024 * 1024;

function getConversionsUploadDir() {
  return path.join(__dirname, '../../uploads/conversions');
}

function writeConversionBuffer(buffer, mimetype) {
  if (!buffer?.length) return null;
  if (buffer.length > MAX_CONVERSION_IMAGE_BYTES) {
    const err = new Error(
      'Image is too large. Use a file under 2MB (recommended 1200×1200 or 1200×1500 px).'
    );
    err.status = 400;
    throw err;
  }
  const ext = EXT_BY_MIME[String(mimetype || '').toLowerCase()] || '.jpg';
  const dir = getConversionsUploadDir();
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${uuidv4()}${ext}`;
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/uploads/conversions/${filename}`;
}

/** Save upload to disk; DB stores a short path (not base64). */
function saveConversionImageFile(file) {
  if (!file?.buffer) return null;
  return writeConversionBuffer(file.buffer, file.mimetype || 'image/jpeg');
}

function saveDataUrlConversionImage(dataUrl) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;
  return writeConversionBuffer(parsed.buffer, parsed.mime);
}

/** Accept http(s) URL or /uploads/ path; legacy data URLs are migrated to disk on save. */
function normalizeConversionImageRef(value) {
  const s = String(value || '').trim();
  if (!s) return null;
  if (isDataUrl(s)) return saveDataUrlConversionImage(s);
  if (isHttpUrl(s) || s.startsWith('/uploads/')) return s;
  return null;
}

function conversionMediaUrl(id, side) {
  return `/api/media/conversion/${id}/${side === 'to' ? 'to' : 'from'}`;
}

/** Public/admin API: never ship raw data URLs — use stable media URLs. */
function publicImageRef(id, side, stored) {
  const s = String(stored || '').trim();
  if (!s) return null;
  if (isHttpUrl(s)) return s;
  if (isDataUrl(s) || s.startsWith('/uploads/')) return conversionMediaUrl(id, side);
  return s;
}

function parseConversion(row, { publicUrls = true } = {}) {
  if (!row) return null;
  return {
    ...row,
    price: Number(row.price) || 0,
    sort_order: Number(row.sort_order) || 0,
    active: row.active === 1 || row.active === true,
    from_image: publicUrls ? publicImageRef(row.id, 'from', row.from_image) : row.from_image || null,
    to_image: publicUrls ? publicImageRef(row.id, 'to', row.to_image) : row.to_image || null,
  };
}

/** Seed from legacy hardcoded pairs so production isn't empty after deploy. */
const SEED_PAIRS = [
  {
    from_label: 'Saree',
    to_label: 'Dress',
    from_image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=80',
    to_image: 'https://images.unsplash.com/photo-1572804013427-4d7ca7268217?auto=format&fit=crop&w=900&q=80',
    price: 299,
  },
  {
    from_label: 'Saree',
    to_label: 'Co-ord Set',
    from_image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=80',
    to_image: 'https://images.unsplash.com/photo-1496747611176-043222598a21?auto=format&fit=crop&w=900&q=80',
    price: 299,
  },
  {
    from_label: 'Saree',
    to_label: 'Blouse + Skirt',
    from_image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=80',
    to_image: 'https://images.unsplash.com/photo-1583496664630-893a1907744a?auto=format&fit=crop&w=900&q=80',
    price: 299,
  },
  {
    from_label: 'Kurti',
    to_label: 'Skirt',
    from_image: 'https://images.unsplash.com/photo-1745313452052-0e4e341f326c?auto=format&fit=crop&w=900&q=80',
    to_image: 'https://images.unsplash.com/photo-1583496664630-893a1907744a?auto=format&fit=crop&w=900&q=80',
    price: 299,
  },
  {
    from_label: 'Kurti',
    to_label: 'Halter Top',
    from_image: 'https://images.unsplash.com/photo-1745313452052-0e4e341f326c?auto=format&fit=crop&w=900&q=80',
    to_image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
    price: 299,
  },
  {
    from_label: 'Kurti',
    to_label: 'Crop Top',
    from_image: 'https://images.unsplash.com/photo-1745313452052-0e4e341f326c?auto=format&fit=crop&w=900&q=80',
    to_image: 'https://images.unsplash.com/photo-1509636319191-0a6ee0c2d471?auto=format&fit=crop&w=900&q=80',
    price: 299,
  },
  {
    from_label: 'Shirt',
    to_label: 'Japanese Shirt',
    from_image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
    to_image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80',
    price: 299,
  },
  {
    from_label: 'Shirt',
    to_label: 'Corset Back',
    from_image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
    to_image: 'https://images.unsplash.com/photo-1551488831-00ddce6d87df?auto=format&fit=crop&w=900&q=80',
    price: 299,
  },
  {
    from_label: 'Shirt',
    to_label: 'Tote Bag',
    from_image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
    to_image: 'https://images.unsplash.com/photo-1590874103328-eac95a1961f5?auto=format&fit=crop&w=900&q=80',
    price: 299,
  },
  {
    from_label: 'Pant',
    to_label: 'Jorts (Shorts)',
    from_image: 'https://images.unsplash.com/photo-1714143136372-ddaf8b606da7?auto=format&fit=crop&w=900&q=80',
    to_image: 'https://images.unsplash.com/photo-1542272604-787c683553de?auto=format&fit=crop&w=900&q=80',
    price: 299,
  },
  {
    from_label: 'Pant',
    to_label: 'Flared Pants',
    from_image: 'https://images.unsplash.com/photo-1714143136372-ddaf8b606da7?auto=format&fit=crop&w=900&q=80',
    to_image: 'https://images.unsplash.com/photo-1473966960820-9de5768aa532?auto=format&fit=crop&w=900&q=80',
    price: 299,
  },
  {
    from_label: 'Pant',
    to_label: 'Skirt',
    from_image: 'https://images.unsplash.com/photo-1714143136372-ddaf8b606da7?auto=format&fit=crop&w=900&q=80',
    to_image: 'https://images.unsplash.com/photo-1583496664630-893a1907744a?auto=format&fit=crop&w=900&q=80',
    price: 299,
  },
];

/** Known-broken URLs from earlier seed data → replace with current SEED_PAIRS. */
const BROKEN_URL_FRAGMENTS = [
  'photo-1595777455730-85bb253e2611',
  'photo-1596755094515-f0546a4179b?',
  'photo-1551488831-00f20ec8561d',
];

function isBrokenUrl(url) {
  const s = String(url || '');
  if (!s.trim()) return true;
  return BROKEN_URL_FRAGMENTS.some((frag) => s.includes(frag));
}

async function repairBrokenSeedImages() {
  const rows = await all('SELECT id, from_label, to_label, from_image, to_image FROM reimagine_conversions');
  let fixed = 0;
  for (const row of rows) {
    const seed = SEED_PAIRS.find(
      (p) => p.from_label === row.from_label && p.to_label === row.to_label
    );
    if (!seed) continue;
    const nextFrom = isBrokenUrl(row.from_image) ? seed.from_image : row.from_image;
    const nextTo = isBrokenUrl(row.to_image) ? seed.to_image : row.to_image;
    if (nextFrom === row.from_image && nextTo === row.to_image) continue;
    await run(
      'UPDATE reimagine_conversions SET from_image = ?, to_image = ? WHERE id = ?',
      [nextFrom, nextTo, row.id]
    );
    fixed += 1;
  }
  if (fixed > 0) console.log(`[db] Repaired ${fixed} reimagine conversion image URL(s)`);
}

async function ensureReimagineConversionsSeeded() {
  const row = await get('SELECT COUNT(*) AS c FROM reimagine_conversions');
  if (Number(row?.c) > 0) {
    await repairBrokenSeedImages();
    return;
  }

  let order = 0;
  for (const pair of SEED_PAIRS) {
    await run(
      `INSERT INTO reimagine_conversions
        (id, from_label, to_label, from_image, to_image, price, sort_order, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        uuidv4(),
        pair.from_label,
        pair.to_label,
        pair.from_image,
        pair.to_image,
        pair.price,
        order++,
      ]
    );
  }
  console.log(`[db] Seeded ${SEED_PAIRS.length} reimagine conversions`);
}

async function listConversions({ activeOnly = false, publicUrls = true } = {}) {
  let q = 'SELECT * FROM reimagine_conversions';
  if (activeOnly) q += ' WHERE active = 1';
  q += ' ORDER BY sort_order ASC, from_label ASC, to_label ASC';
  const rows = await all(q);
  return rows.map((row) => parseConversion(row, { publicUrls }));
}

async function getConversionById(id, { publicUrls = true } = {}) {
  const row = await get('SELECT * FROM reimagine_conversions WHERE id = ?', [id]);
  return parseConversion(row, { publicUrls });
}

module.exports = {
  ensureReimagineConversionsSeeded,
  listConversions,
  getConversionById,
  parseConversion,
  saveConversionImageFile,
  saveDataUrlConversionImage,
  normalizeConversionImageRef,
  conversionMediaUrl,
  MAX_CONVERSION_IMAGE_BYTES,
};

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { get, all, run } = require('../db/database');
const { authenticateAdmin } = require('../middleware/auth');
const { bufferToDataUrl, isDataUrl, isHttpUrl } = require('../lib/imageDataUrl');
const { testimonialMediaUrl } = require('../lib/mediaUrls');

const MAX_REVIEW_IMAGES = 3;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp)$/i.test(file.mimetype);
    cb(ok ? null : new Error('Only JPEG, PNG, or WebP images are allowed.'), ok);
  },
});

const imageFields = [
  { name: 'image_0', maxCount: 1 },
  { name: 'image_1', maxCount: 1 },
  { name: 'image_2', maxCount: 1 },
];

function parseImagePaths(raw, legacyPath) {
  if (raw) {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) {
        return parsed.filter((p) => typeof p === 'string' && p).slice(0, MAX_REVIEW_IMAGES);
      }
    } catch {
      /* fall through */
    }
  }
  if (legacyPath) return [legacyPath];
  return [];
}

function serializeImagePaths(paths) {
  const clean = paths.filter(Boolean).slice(0, MAX_REVIEW_IMAGES);
  return clean.length ? JSON.stringify(clean) : null;
}

function buildImagePathsFromRequest(req, existingPaths = []) {
  const paths = [];
  for (let i = 0; i < MAX_REVIEW_IMAGES; i += 1) {
    const file = req.files?.[`image_${i}`]?.[0];
    const retain = String(req.body[`retain_${i}`] || '').trim();
    if (file) {
      try {
        paths.push(bufferToDataUrl(file.buffer, file.mimetype));
      } catch (err) {
        throw new Error(err.message || 'Image too large.');
      }
    } else if (retain) {
      if (retain.startsWith('/api/media/testimonial/')) {
        if (existingPaths[i]) paths.push(existingPaths[i]);
      } else if (isDataUrl(retain) || retain.startsWith('/uploads/') || isHttpUrl(retain)) {
        paths.push(retain);
      }
    }
  }
  return paths;
}

function testimonialImageCount(row) {
  if (!row) return 0;
  if (row.image_count != null) return Math.min(Number(row.image_count) || 0, MAX_REVIEW_IMAGES);
  return parseImagePaths(row.image_paths, row.image_path).length;
}

function parseRow(row) {
  if (!row) return null;
  const count = testimonialImageCount(row);
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    quote: row.quote,
    image_paths: Array.from({ length: count }, (_, i) => testimonialMediaUrl(row.id, i)),
    google_review_url: row.google_review_url || null,
    sort_order: row.sort_order ?? 0,
    is_active: !!row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

router.use(authenticateAdmin);

router.get('/', async (req, res) => {
  const rows = await all(
    `SELECT id, name, city, quote, google_review_url, sort_order, is_active, created_at, updated_at,
      CASE
        WHEN image_paths IS NOT NULL AND image_paths != '' AND JSON_VALID(image_paths)
          THEN JSON_LENGTH(image_paths)
        WHEN image_path IS NOT NULL AND image_path != '' THEN 1
        ELSE 0
      END AS image_count
     FROM testimonials ORDER BY sort_order ASC, created_at DESC`
  );
  res.json({ success: true, testimonials: rows.map(parseRow) });
});

router.post('/', (req, res, next) => {
  upload.fields(imageFields)(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message || 'Upload failed.' });
    next();
  });
}, async (req, res) => {
  const name = String(req.body.name || '').trim();
  const city = String(req.body.city || '').trim();
  const quote = String(req.body.quote || '').trim();
  const google_review_url = String(req.body.google_review_url || '').trim() || null;
  const sort_order = parseInt(String(req.body.sort_order ?? 0), 10) || 0;
  const is_active = req.body.is_active === '0' || req.body.is_active === false ? 0 : 1;

  if (!name || !city || !quote) {
    return res.status(400).json({ success: false, message: 'Name, city, and quote are required.' });
  }

  let image_paths;
  try {
    image_paths = buildImagePathsFromRequest(req);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }

  const id = uuidv4();
  await run(
    `INSERT INTO testimonials (id, name, city, quote, image_paths, google_review_url, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, city, quote, serializeImagePaths(image_paths), google_review_url, sort_order, is_active]
  );

  const row = await get(
    `SELECT id, name, city, quote, google_review_url, sort_order, is_active, created_at, updated_at,
      CASE
        WHEN image_paths IS NOT NULL AND image_paths != '' AND JSON_VALID(image_paths)
          THEN JSON_LENGTH(image_paths)
        ELSE 0
      END AS image_count
     FROM testimonials WHERE id = ?`,
    [id]
  );
  res.status(201).json({ success: true, testimonial: parseRow(row) });
});

router.put('/:id', (req, res, next) => {
  upload.fields(imageFields)(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message || 'Upload failed.' });
    next();
  });
}, async (req, res) => {
  const existing = await get('SELECT * FROM testimonials WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Not found.' });
  }

  const name = String(req.body.name || '').trim();
  const city = String(req.body.city || '').trim();
  const quote = String(req.body.quote || '').trim();
  const google_review_url = String(req.body.google_review_url || '').trim() || null;
  const sort_order = parseInt(String(req.body.sort_order ?? existing.sort_order), 10) || 0;
  const is_active = req.body.is_active === '0' || req.body.is_active === false ? 0 : 1;

  if (!name || !city || !quote) {
    return res.status(400).json({ success: false, message: 'Name, city, and quote are required.' });
  }

  const existingBlobPaths = parseImagePaths(existing.image_paths, existing.image_path);

  let image_paths;
  try {
    image_paths = buildImagePathsFromRequest(req, existingBlobPaths);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }

  await run(
    `UPDATE testimonials SET name=?, city=?, quote=?, image_paths=?, image_path=NULL, google_review_url=?, sort_order=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [name, city, quote, serializeImagePaths(image_paths), google_review_url, sort_order, is_active, req.params.id]
  );

  const row = await get(
    `SELECT id, name, city, quote, google_review_url, sort_order, is_active, created_at, updated_at,
      CASE
        WHEN image_paths IS NOT NULL AND image_paths != '' AND JSON_VALID(image_paths)
          THEN JSON_LENGTH(image_paths)
        ELSE 0
      END AS image_count
     FROM testimonials WHERE id = ?`,
    [req.params.id]
  );
  res.json({ success: true, testimonial: parseRow(row) });
});

router.delete('/:id', async (req, res) => {
  const existing = await get('SELECT * FROM testimonials WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ success: false, message: 'Not found.' });
  await run('DELETE FROM testimonials WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { get, all, run } = require('../db/database');
const { authenticateAdmin } = require('../middleware/auth');
const { allSlots, isValidSlot } = require('../lib/reimaginePresets');

const uploadsDir = path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) =>
    cb(null, `reimagine-${uuidv4()}${path.extname(file.originalname).toLowerCase()}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp)$/i.test(file.mimetype);
    cb(ok ? null : new Error('Only JPEG, PNG, or WebP images are allowed.'), ok);
  },
});

function unlinkIfLocal(imagePath) {
  if (!imagePath || !imagePath.startsWith('/uploads/')) return;
  const full = path.join(uploadsDir, path.basename(imagePath));
  try {
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch {
    /* ignore */
  }
}

router.use(authenticateAdmin);

/** All garment + preset slots with any uploaded image. */
router.get('/', async (req, res) => {
  const rows = await all(
    `SELECT id, garment_type, transformation, image_path, updated_at
     FROM reimagine_images ORDER BY garment_type, transformation`
  );
  const { garments, presets } = allSlots();
  const byKey = new Map(rows.map((r) => [`${r.garment_type}|${r.transformation || ''}`, r]));

  const mapSlot = (slot) => {
    const row = byKey.get(`${slot.garment_type}|${slot.transformation || ''}`);
    return {
      ...slot,
      id: row?.id || null,
      image_path: row?.image_path || null,
      updated_at: row?.updated_at || null,
    };
  };

  res.json({
    success: true,
    garments: garments.map(mapSlot),
    presets: presets.map(mapSlot),
  });
});

/** Upload or replace image for a garment base or preset slot. */
router.post('/', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message || 'Upload failed.' });
    next();
  });
}, async (req, res) => {
  const garment_type = String(req.body.garment_type || '').trim().toLowerCase();
  const transformation = String(req.body.transformation ?? '').trim();

  if (!isValidSlot(garment_type, transformation)) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ success: false, message: 'Invalid garment or preset slot.' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image file provided.' });
  }

  const imagePath = `/uploads/${req.file.filename}`;
  const existing = await get(
    'SELECT id, image_path FROM reimagine_images WHERE garment_type = ? AND transformation = ?',
    [garment_type, transformation]
  );

  if (existing) {
    unlinkIfLocal(existing.image_path);
    await run(
      'UPDATE reimagine_images SET image_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [imagePath, existing.id]
    );
    const row = await get('SELECT * FROM reimagine_images WHERE id = ?', [existing.id]);
    return res.json({ success: true, image: row });
  }

  const id = uuidv4();
  await run(
    `INSERT INTO reimagine_images (id, garment_type, transformation, image_path) VALUES (?, ?, ?, ?)`,
    [id, garment_type, transformation, imagePath]
  );
  const row = await get('SELECT * FROM reimagine_images WHERE id = ?', [id]);
  res.status(201).json({ success: true, image: row });
});

/** Remove uploaded image for a slot (reverts to frontend fallback). */
router.delete('/slot', async (req, res) => {
  const garment_type = String(req.body.garment_type || '').trim().toLowerCase();
  const transformation = String(req.body.transformation ?? '').trim();

  if (!isValidSlot(garment_type, transformation)) {
    return res.status(400).json({ success: false, message: 'Invalid garment or preset slot.' });
  }

  const existing = await get(
    'SELECT id, image_path FROM reimagine_images WHERE garment_type = ? AND transformation = ?',
    [garment_type, transformation]
  );
  if (!existing) return res.json({ success: true });

  unlinkIfLocal(existing.image_path);
  await run('DELETE FROM reimagine_images WHERE id = ?', [existing.id]);
  res.json({ success: true });
});

module.exports = router;

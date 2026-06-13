const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { get, all, run } = require('../db/database');
const { authenticateAdmin } = require('../middleware/auth');
const { validateHeroImage, HERO_ASPECT_RATIOS, MIN_HERO_WIDTH, MIN_HERO_HEIGHT } = require('../utils/imageDimensions');

const VALID_CONTEXTS = ['home', 'reimagine'];
const uploadsDir = path.join(__dirname, '../../uploads');

function parseContext(value) {
  return VALID_CONTEXTS.includes(value) ? value : 'home';
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ctx = parseContext(req.query.context || req.body?.context);
    const prefix = ctx === 'reimagine' ? 'hero-reimagine' : 'hero';
    cb(null, `${prefix}-${uuidv4()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ctx = parseContext(req.query.context || req.body?.context);
    const allowGif = ctx === 'reimagine';
    const ok = allowGif
      ? /^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype)
      : /^image\/(jpeg|png|webp)$/i.test(file.mimetype);
    const msg = allowGif
      ? 'Only JPEG, PNG, WebP, or GIF images are allowed.'
      : 'Only JPEG, PNG, or WebP images are allowed.';
    cb(ok ? null : new Error(msg), ok);
  },
});

router.use(authenticateAdmin);

/** Upload requirements (for admin UI). */
router.get('/requirements', (req, res) => {
  const context = parseContext(req.query.context);
  const allowGif = context === 'reimagine';
  res.json({
    success: true,
    context,
    requirements: {
      aspectRatios: HERO_ASPECT_RATIOS.map((r) => r.label),
      minWidth: MIN_HERO_WIDTH,
      minHeight: MIN_HERO_HEIGHT,
      displayWidth: 640,
      displayHeight: 560,
      maxFileSizeMb: 8,
      formats: allowGif ? ['JPEG', 'PNG', 'WebP', 'GIF'] : ['JPEG', 'PNG', 'WebP'],
    },
  });
});

/** List hero images for a context (newest first). */
router.get('/', async (req, res) => {
  const context = parseContext(req.query.context);
  const images = await all(
    `SELECT id, image_path, width, height, aspect_label, context, is_active, created_at
     FROM hero_images WHERE context = ? ORDER BY created_at DESC`,
    [context]
  );
  res.json({ success: true, context, images });
});

/** Upload a new hero image (keeps history; does not auto-activate). */
router.post('/', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message || 'Upload failed.' });
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image file provided.' });
  }

  const context = parseContext(req.query.context || req.body?.context);
  const allowGif = context === 'reimagine';
  const filePath = req.file.path;
  let validation;
  try {
    const buffer = fs.readFileSync(filePath);
    validation = validateHeroImage(buffer, { allowGif });
  } catch {
    fs.unlinkSync(filePath);
    return res.status(400).json({ success: false, message: 'Could not process image file.' });
  }

  if (!validation.ok) {
    fs.unlinkSync(filePath);
    return res.status(400).json({ success: false, message: validation.message });
  }

  const id = uuidv4();
  const imagePath = `/uploads/${req.file.filename}`;

  await run(
    `INSERT INTO hero_images (id, image_path, width, height, aspect_label, context, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [id, imagePath, validation.width, validation.height, validation.aspectLabel, context]
  );

  const row = await get('SELECT * FROM hero_images WHERE id = ?', [id]);
  res.status(201).json({ success: true, image: row });
});

/** Set which hero image is live for its context. */
router.patch('/:id/activate', async (req, res) => {
  const row = await get('SELECT id, context FROM hero_images WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ success: false, message: 'Image not found.' });

  await run('UPDATE hero_images SET is_active = 0 WHERE context = ?', [row.context]);
  await run('UPDATE hero_images SET is_active = 1 WHERE id = ?', [req.params.id]);

  const active = await get('SELECT * FROM hero_images WHERE id = ?', [req.params.id]);
  res.json({ success: true, image: active });
});

module.exports = router;

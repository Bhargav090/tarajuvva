// Admin hero image routes disabled — heroes use static frontend assets
// (Home: web/src/assets/hero-banthibhojanam-ss2026.jpeg, Reimagine: reimagine.mov).
const express = require('express');
const router = express.Router();
module.exports = router;

/*
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { get, all, run } = require('../db/database');
const { authenticateAdmin } = require('../middleware/auth');
const { validateHeroImage, HERO_ASPECT_RATIOS, MIN_HERO_WIDTH, MIN_HERO_HEIGHT } = require('../utils/imageDimensions');
const { bufferToDataUrl } = require('../lib/imageDataUrl');
const { withHeroMediaUrl } = require('../lib/mediaUrls');

const VALID_CONTEXTS = ['home', 'reimagine'];

function parseContext(value) {
  return VALID_CONTEXTS.includes(value) ? value : 'home';
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ctx = parseContext(req.query.context || req.body?.context);
    const allowGif = ctx === 'reimagine';
    const ok = allowGif
      ? /^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype)
      : /^image\/(jpeg|png|webp)$/i.test(file.mimetype);
    const msg = allowGif
      ? 'Only JPEG, PNG, WebP, or GIF images are allowed.'
      : 'Only JPEG, PNG, WebP images are allowed.';
    cb(ok ? null : new Error(msg), ok);
  },
});

router.use(authenticateAdmin);

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

router.get('/', async (req, res) => {
  const context = parseContext(req.query.context);
  const images = await all(
    `SELECT id, width, height, aspect_label, context, is_active, created_at
     FROM hero_images WHERE context = ? ORDER BY created_at DESC`,
    [context]
  );
  res.json({
    success: true,
    context,
    images: images.map((row) => withHeroMediaUrl(row)),
  });
});

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
  let validation;
  try {
    validation = validateHeroImage(req.file.buffer, { allowGif });
  } catch {
    return res.status(400).json({ success: false, message: 'Could not process image file.' });
  }

  if (!validation.ok) {
    return res.status(400).json({ success: false, message: validation.message });
  }

  let imagePath;
  try {
    imagePath = bufferToDataUrl(req.file.buffer, req.file.mimetype);
  } catch (err) {
    return res.status(err.status || 400).json({ success: false, message: err.message });
  }

  const id = uuidv4();
  await run(
    `INSERT INTO hero_images (id, image_path, width, height, aspect_label, context, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [id, imagePath, validation.width, validation.height, validation.aspectLabel, context]
  );

  const row = await get(
    'SELECT id, width, height, aspect_label, context, is_active, created_at FROM hero_images WHERE id = ?',
    [id]
  );
  res.status(201).json({ success: true, image: withHeroMediaUrl(row) });
});

router.patch('/:id/activate', async (req, res) => {
  const row = await get('SELECT id, context FROM hero_images WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ success: false, message: 'Image not found.' });

  await run('UPDATE hero_images SET is_active = 0 WHERE context = ?', [row.context]);
  await run('UPDATE hero_images SET is_active = 1 WHERE id = ?', [req.params.id]);

  const active = await get(
    'SELECT id, width, height, aspect_label, context, is_active, created_at FROM hero_images WHERE id = ?',
    [req.params.id]
  );
  res.json({ success: true, image: withHeroMediaUrl(active) });
});
*/

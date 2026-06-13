const express = require('express');
const router = express.Router();
const { get } = require('../db/database');
const { sendStoredImage } = require('../lib/serveStoredImage');

function tryNotModified(req, res, etag) {
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.set('ETag', etag);
  if (req.headers['if-none-match'] === etag) {
    res.status(304).end();
    return true;
  }
  return false;
}

function parseTestimonialPaths(row) {
  if (!row) return [];
  if (row.image_paths) {
    try {
      const parsed = JSON.parse(row.image_paths);
      if (Array.isArray(parsed)) {
        return parsed.filter((p) => typeof p === 'string' && p).slice(0, 3);
      }
    } catch {
      /* fall through */
    }
  }
  if (row.image_path) return [row.image_path];
  return [];
}

router.get('/hero/:id', async (req, res) => {
  const etag = `"hero-${req.params.id}"`;
  if (tryNotModified(req, res, etag)) return;

  const row = await get('SELECT image_path FROM hero_images WHERE id = ?', [req.params.id]);
  if (!row?.image_path) {
    return res.status(404).json({ success: false, message: 'Image not found.' });
  }
  return sendStoredImage(req, res, row.image_path, etag);
});

router.get('/reimagine/:id', async (req, res) => {
  const etag = `"reimagine-${req.params.id}"`;
  if (tryNotModified(req, res, etag)) return;

  const row = await get('SELECT image_path FROM reimagine_images WHERE id = ?', [req.params.id]);
  if (!row?.image_path) {
    return res.status(404).json({ success: false, message: 'Image not found.' });
  }
  return sendStoredImage(req, res, row.image_path, etag);
});

router.get('/testimonial/:id/:index', async (req, res) => {
  const index = Number.parseInt(req.params.index, 10);
  if (!Number.isFinite(index) || index < 0 || index > 2) {
    return res.status(400).json({ success: false, message: 'Invalid image index.' });
  }

  const etag = `"testimonial-${req.params.id}-${index}"`;
  if (tryNotModified(req, res, etag)) return;

  const row = await get(
    'SELECT image_path, image_paths FROM testimonials WHERE id = ?',
    [req.params.id]
  );
  if (!row) {
    return res.status(404).json({ success: false, message: 'Image not found.' });
  }

  const paths = parseTestimonialPaths(row);
  const ref = paths[index];
  if (!ref) {
    return res.status(404).json({ success: false, message: 'Image not found.' });
  }

  return sendStoredImage(req, res, ref, etag);
});

module.exports = router;

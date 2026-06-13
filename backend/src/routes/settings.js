const express = require('express');
const router = express.Router();
const { get, all } = require('../db/database');
const { getReimagineCustomizeSettings } = require('../utils/siteSettings');
const { heroMediaUrl, reimagineMediaUrl, testimonialMediaUrl } = require('../lib/mediaUrls');

/** Public — active hero image for the landing page (metadata only; bytes at /api/media/hero/:id). */
router.get('/hero', async (req, res) => {
  const hero = await get(
    `SELECT id, width, height, aspect_label, created_at
     FROM hero_images WHERE context = 'home' AND is_active = 1 ORDER BY created_at DESC LIMIT 1`
  );
  res.json({
    success: true,
    hero: hero ? { ...hero, image_path: heroMediaUrl(hero.id) } : null,
  });
});

/** Public — active hero image / GIF for the Reimagine page. */
router.get('/reimagine-hero', async (req, res) => {
  const hero = await get(
    `SELECT id, width, height, aspect_label, created_at
     FROM hero_images WHERE context = 'reimagine' AND is_active = 1 ORDER BY created_at DESC LIMIT 1`
  );
  res.json({
    success: true,
    hero: hero ? { ...hero, image_path: heroMediaUrl(hero.id) } : null,
  });
});

/** Public — reimagine garment + preset images (URLs only). */
router.get('/reimagine-images', async (req, res) => {
  const rows = await all(
    `SELECT id, garment_type, transformation
     FROM reimagine_images ORDER BY garment_type, transformation`
  );

  const garments = {};
  const presets = {};

  for (const row of rows) {
    const url = reimagineMediaUrl(row.id);
    if (!row.transformation) {
      garments[row.garment_type] = url;
    } else {
      if (!presets[row.garment_type]) presets[row.garment_type] = {};
      presets[row.garment_type][row.transformation] = url;
    }
  }

  res.json({ success: true, garments, presets });
});

/** Public — active testimonials for homepage carousel (no inline image blobs). */
router.get('/testimonials', async (req, res) => {
  const rows = await all(
    `SELECT id, name, city, quote, google_review_url, sort_order,
      CASE
        WHEN image_paths IS NOT NULL AND image_paths != '' AND JSON_VALID(image_paths)
          THEN JSON_LENGTH(image_paths)
        WHEN image_path IS NOT NULL AND image_path != '' THEN 1
        ELSE 0
      END AS image_count
     FROM testimonials WHERE is_active = 1
     ORDER BY sort_order ASC, created_at DESC`
  );

  const testimonials = rows.map((row) => {
    const count = Math.min(Number(row.image_count) || 0, 3);
    return {
      id: row.id,
      name: row.name,
      city: row.city,
      quote: row.quote,
      image_paths: Array.from({ length: count }, (_, i) => testimonialMediaUrl(row.id, i)),
      google_review_url: row.google_review_url || null,
      sort_order: row.sort_order ?? 0,
    };
  });

  res.json({ success: true, testimonials });
});

/** Public — customize consultation pricing & features (Reimagine page). */
router.get('/reimagine-customize', async (req, res) => {
  const settings = await getReimagineCustomizeSettings();
  res.json({ success: true, settings });
});

const { publicRouter: consultationSlotsPublic } = require('./consultationSlots');
router.use('/consultation-slots', consultationSlotsPublic);

module.exports = router;

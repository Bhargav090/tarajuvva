const express = require('express');
const router = express.Router();
const { get, all } = require('../db/database');
const { getReimagineCustomizeSettings } = require('../utils/siteSettings');

/** Public — active hero image for the landing page. */
router.get('/hero', async (req, res) => {
  const hero = await get(
    `SELECT id, image_path, width, height, aspect_label, created_at
     FROM hero_images WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1`
  );
  res.json({ success: true, hero: hero || null });
});

/** Public — reimagine garment + preset images uploaded by admin. */
router.get('/reimagine-images', async (req, res) => {
  const rows = await all(
    `SELECT garment_type, transformation, image_path, updated_at
     FROM reimagine_images ORDER BY garment_type, transformation`
  );

  const garments = {};
  const presets = {};

  for (const row of rows) {
    if (!row.transformation) {
      garments[row.garment_type] = row.image_path;
    } else {
      if (!presets[row.garment_type]) presets[row.garment_type] = {};
      presets[row.garment_type][row.transformation] = row.image_path;
    }
  }

  res.json({ success: true, garments, presets });
});

/** Public — active testimonials for homepage carousel. */
router.get('/testimonials', async (req, res) => {
  const rows = await all(
    `SELECT id, name, city, quote, image_path, image_paths, google_review_url, sort_order
     FROM testimonials WHERE is_active = 1
     ORDER BY sort_order ASC, created_at DESC`
  );
  const testimonials = rows.map((row) => {
    let image_paths = [];
    if (row.image_paths) {
      try {
        const parsed = JSON.parse(row.image_paths);
        if (Array.isArray(parsed)) image_paths = parsed.filter(Boolean).slice(0, 3);
      } catch {
        /* ignore */
      }
    } else if (row.image_path) {
      image_paths = [row.image_path];
    }
    return {
      id: row.id,
      name: row.name,
      city: row.city,
      quote: row.quote,
      image_paths,
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

module.exports = router;

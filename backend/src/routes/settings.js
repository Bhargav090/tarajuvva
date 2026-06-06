const express = require('express');
const router = express.Router();
const { get, all } = require('../db/database');

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

module.exports = router;

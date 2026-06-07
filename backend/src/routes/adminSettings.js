const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const {
  getReimagineCustomizeSettings,
  saveReimagineCustomizeSettings,
} = require('../utils/siteSettings');

router.use(authenticateAdmin);

router.get('/reimagine-customize', async (req, res) => {
  const settings = await getReimagineCustomizeSettings();
  res.json({ success: true, settings });
});

router.put('/reimagine-customize', async (req, res) => {
  try {
    const settings = await saveReimagineCustomizeSettings(req.body);
    res.json({ success: true, settings });
  } catch (err) {
    res.status(err.status || 400).json({ success: false, message: err.message });
  }
});

module.exports = router;

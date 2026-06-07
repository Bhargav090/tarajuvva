const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer  = require('multer');
const path    = require('path');
const { run, all, get } = require('../db/database');
const { authenticateAdmin, optionalAuth } = require('../middleware/auth');
const { notifyReimagineRequest } = require('../utils/notifyEmail');
const { getReimagineCustomizeSettings } = require('../utils/siteSettings');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename:    (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const TRANSFORMATION_MAP = {
  saree: ['Dress', 'Co-ord Set', 'Blouse + Skirt', 'Custom'],
  kurti: ['Skirt', 'Halter Top', 'Crop Top', 'Custom'],
  shirt: ['Japanese Shirt', 'Corset Back', 'Tote Bag', 'Custom'],
  pant:  ['Jorts (Shorts)', 'Flared Pants', 'Skirt', 'Custom'],
};

router.get('/transformations/:garment', (req, res) => {
  const t = TRANSFORMATION_MAP[req.params.garment.toLowerCase()];
  if (!t) return res.status(404).json({ success: false });
  res.json({ success: true, transformations: t });
});

router.post('/requests', optionalAuth, upload.array('images', 5), async (req, res) => {
  const {
    user_name,
    user_phone,
    user_email,
    address,
    garment_type,
    transformation,
    notes,
    is_custom,
    is_consultation,
  } = req.body;

  if (!user_name?.trim() || !user_phone?.trim() || !garment_type?.trim() || !transformation?.trim()) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  if (!address?.trim()) {
    return res.status(400).json({ success: false, message: 'Pickup / delivery address is required' });
  }

  const images = req.files?.map((f) => `/uploads/${f.filename}`) || [];
  const id = uuidv4();
  const user_id = req.user?.id || null;
  const consultation =
    is_consultation === '1' || is_consultation === 1 || is_consultation === true;
  const custom =
    consultation ||
    is_custom === '1' ||
    is_custom === 1 ||
    is_custom === true ||
    transformation === 'Custom';

  let consultationPrice = null;
  if (consultation) {
    const settings = await getReimagineCustomizeSettings();
    consultationPrice = settings.price;
  }

  await run(
    `INSERT INTO reimagine_requests (id,user_id,user_name,user_phone,user_email,address,garment_type,transformation,notes,images,status,is_custom,consultation_paid) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      user_id,
      user_name.trim(),
      user_phone.trim(),
      user_email?.trim() || null,
      address.trim(),
      garment_type.trim(),
      transformation.trim(),
      notes?.trim() || null,
      JSON.stringify(images),
      'pending_review',
      custom ? 1 : 0,
      consultation ? 1 : 0,
    ]
  );

  const row = await get('SELECT * FROM reimagine_requests WHERE id = ?', [id]);
  notifyReimagineRequest({
    ...row,
    is_custom: custom,
    consultation_paid: consultation,
    consultation_price: consultationPrice,
    images,
  }).catch(() => {});

  res.status(201).json({
    success: true,
    message: "Thank you for reimagining with Tarajuvva. We'll review your request and get back within 24 hours.",
    requestId: id,
  });
});

router.get('/requests', authenticateAdmin, async (req, res) => {
  const { status } = req.query;
  let q = 'SELECT * FROM reimagine_requests WHERE 1=1';
  const params = [];
  if (status) { q += ' AND status=?'; params.push(status); }
  q += ' ORDER BY created_at DESC';
  const rows = await all(q, params);
  res.json({
    success: true,
    requests: rows.map((r) => ({
      ...r,
      is_custom: Boolean(r.is_custom),
      consultation_paid: Boolean(r.consultation_paid),
      images: JSON.parse(r.images || '[]'),
    })),
  });
});

router.patch('/requests/:id/status', authenticateAdmin, async (req, res) => {
  const { status, admin_notes } = req.body;
  const valid = ['pending_review', 'accepted', 'in_progress', 'completed', 'rejected'];
  if (!valid.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
  await run('UPDATE reimagine_requests SET status=?,admin_notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?', [status, admin_notes || null, req.params.id]);
  res.json({ success: true });
});

module.exports = router;

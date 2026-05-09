const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer  = require('multer');
const path    = require('path');
const db = require('../db/database');
const { authenticateAdmin, optionalAuth } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename:    (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/transformations/:garment', (req, res) => {
  const map = {
    saree: ['Dress','Co-ord Set','Blouse + Skirt','Cape + Palazzos','Custom'],
    kurti: ['Skirt','Halter Top','Crop Top','Peplum Top','Custom'],
    shirt: ['Japanese Shirt','Corset Back','Tote Bag','Patchwork','Custom'],
    pant:  ['Jorts (Shorts)','Flared Pants','Skirt','Palazzo','Custom'],
  };
  const t = map[req.params.garment.toLowerCase()];
  if (!t) return res.status(404).json({ success: false });
  res.json({ success: true, transformations: t });
});

router.post('/requests', optionalAuth, upload.array('images', 5), (req, res) => {
  const { user_name, user_phone, user_email, address, garment_type, transformation, notes, is_custom } = req.body;
  if (!user_name || !user_phone || !garment_type || !transformation)
    return res.status(400).json({ success: false, message: 'Missing required fields' });

  const images  = req.files?.map(f => `/uploads/${f.filename}`) || [];
  const id      = uuidv4();
  const user_id = req.user?.id || null;

  db.prepare(`INSERT INTO reimagine_requests (id,user_id,user_name,user_phone,user_email,address,garment_type,transformation,notes,images,is_custom) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, user_id, user_name, user_phone, user_email||null, address||null, garment_type, transformation, notes||null, JSON.stringify(images), is_custom?1:0);

  res.status(201).json({
    success: true,
    message: "Thank you for reimagining with Tarajuvva. We'll review your request and get back within 24 hours.",
    requestId: id
  });
});

router.get('/requests', authenticateAdmin, (req, res) => {
  const { status } = req.query;
  let q = 'SELECT * FROM reimagine_requests WHERE 1=1';
  const params = [];
  if (status) { q += ' AND status=?'; params.push(status); }
  q += ' ORDER BY created_at DESC';
  res.json({ success: true, requests: db.prepare(q).all(...params).map(r => ({ ...r, images: JSON.parse(r.images||'[]') })) });
});

router.patch('/requests/:id/status', authenticateAdmin, (req, res) => {
  const { status, admin_notes } = req.body;
  const valid = ['pending_review','accepted','in_progress','completed','rejected'];
  if (!valid.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
  db.prepare('UPDATE reimagine_requests SET status=?,admin_notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(status, admin_notes||null, req.params.id);
  res.json({ success: true });
});

module.exports = router;

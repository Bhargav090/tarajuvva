const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer  = require('multer');
const { run, all, get } = require('../db/database');
const { authenticateAdmin, authenticateUser } = require('../middleware/auth');
const { notifyReimagineRequest } = require('../utils/notifyEmail');
const { getReimagineCustomizeSettings } = require('../utils/siteSettings');
const { formatSlotLabel, toISODateString, toTimeString, normalizeReimagineRequest } = require('../utils/consultationSlots');
const { bufferToDataUrl } = require('../lib/imageDataUrl');
const { getRazorpayConfig, getRazorpayClient, verifyPaymentSignature, toPaise } = require('../utils/razorpay');
const {
  listConversions,
  getConversionById,
  parseConversion,
  saveConversionImageFile,
  normalizeConversionImageRef,
} = require('../lib/reimagineConversions');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype);
    cb(ok ? null : new Error('Only JPEG, PNG, WebP, or GIF images are allowed.'), ok);
  },
});

const conversionImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 2 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.mimetype);
    cb(ok ? null : new Error('Only JPEG, PNG, WebP, or GIF images are allowed.'), ok);
  },
});

function maybeConversionUpload(req, res, next) {
  const ct = String(req.headers['content-type'] || '');
  if (!ct.includes('multipart/form-data')) return next();
  conversionImageUpload.fields([
    { name: 'from_file', maxCount: 1 },
    { name: 'to_file', maxCount: 1 },
  ])(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Image upload failed.',
      });
    }
    next();
  });
}

function conversionDbErrorMessage(err) {
  if (!err) return 'Could not save conversion';
  if (err.status === 400 && err.message) return err.message;
  if (err.code === 'ER_DATA_TOO_LONG') {
    return 'Image data is too large. Upload a smaller file (under 2MB, ~1200px wide).';
  }
  return err.sqlMessage || err.message || 'Could not save conversion';
}

async function resolveConversionImages(req, existing = {}, from_label = '') {
  const fromFile = req.files?.from_file?.[0];
  const toFile = req.files?.to_file?.[0];
  const clearFrom = req.body.clear_from_image === '1' || req.body.clear_from_image === true;
  const clearTo = req.body.clear_to_image === '1' || req.body.clear_to_image === true;
  const inheritFrom =
    req.body.inherit_from_image === '1' || req.body.inherit_from_image === true;

  let from_image = existing.from_image ?? null;
  let to_image = existing.to_image ?? null;

  if (fromFile) from_image = saveConversionImageFile(fromFile);
  else if (clearFrom) from_image = null;
  else if (req.body.from_image != null && String(req.body.from_image).trim() !== '') {
    from_image = normalizeConversionImageRef(req.body.from_image);
  } else if (inheritFrom && !existing.from_image) {
    const label = String(from_label || req.body.from_label || '').trim();
    if (label) {
      const sibling = await get(
        `SELECT from_image FROM reimagine_conversions
         WHERE from_label = ? AND from_image IS NOT NULL AND TRIM(from_image) != ''
         LIMIT 1`,
        [label]
      );
      if (sibling?.from_image) from_image = sibling.from_image;
    }
  }

  if (toFile) to_image = saveConversionImageFile(toFile);
  else if (clearTo) to_image = null;
  else if (req.body.to_image != null && String(req.body.to_image).trim() !== '') {
    to_image = normalizeConversionImageRef(req.body.to_image);
  }

  return { from_image, to_image };
}


async function bookConsultationSlot(requestId, slotId) {
  const booked = await run(
    'UPDATE consultation_slots SET is_booked = 1, booked_request_id = ? WHERE id = ? AND is_booked = 0',
    [requestId, slotId]
  );
  return booked.affectedRows > 0;
}

async function buildNotifyPayload(row, extras = {}) {
  const images = (() => {
    try {
      return JSON.parse(row.images || '[]');
    } catch {
      return [];
    }
  })();
  return {
    ...row,
    images,
    ...extras,
  };
}

router.get('/conversions', async (req, res) => {
  try {
    const conversions = await listConversions({ activeOnly: true });
    res.json({ success: true, conversions });
  } catch (err) {
    console.error('[reimagine] GET /conversions failed:', err);
    res.status(500).json({ success: false, message: 'Could not load conversions' });
  }
});

router.get('/admin/conversions', authenticateAdmin, async (req, res) => {
  try {
    // Raw stored refs for editing (data URLs / uploads); public list uses media URLs.
    const conversions = await listConversions({ activeOnly: false, publicUrls: false });
    res.json({ success: true, conversions });
  } catch (err) {
    console.error('[reimagine] GET /admin/conversions failed:', err);
    res.status(500).json({ success: false, message: 'Could not load conversions' });
  }
});

router.post('/admin/conversions', authenticateAdmin, maybeConversionUpload, async (req, res) => {
  try {
    const from_label = String(req.body.from_label || '').trim();
    const to_label = String(req.body.to_label || '').trim();
    if (!from_label || !to_label) {
      return res.status(400).json({ success: false, message: 'From and to labels are required' });
    }
    if (from_label.length > 128 || to_label.length > 128) {
      return res.status(400).json({
        success: false,
        message: 'From and to names must be 128 characters or fewer.',
      });
    }
    const price = Math.max(0, parseInt(String(req.body.price ?? 0), 10) || 0);
    const sort_order = Math.max(0, parseInt(String(req.body.sort_order ?? 0), 10) || 0);
    const active = req.body.active === false || req.body.active === 0 || req.body.active === '0' ? 0 : 1;
    const { from_image, to_image } = await resolveConversionImages(req, {}, from_label);
    const id = uuidv4();
    await run(
      `INSERT INTO reimagine_conversions
        (id, from_label, to_label, from_image, to_image, price, sort_order, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, from_label, to_label, from_image, to_image, price, sort_order, active]
    );
    const row = await get('SELECT * FROM reimagine_conversions WHERE id = ?', [id]);
    res.status(201).json({ success: true, conversion: parseConversion(row) });
  } catch (err) {
    console.error('[reimagine] POST /admin/conversions failed:', err);
    res.status(err.status || 500).json({ success: false, message: conversionDbErrorMessage(err) });
  }
});

router.put('/admin/conversions/:id', authenticateAdmin, maybeConversionUpload, async (req, res) => {
  try {
    const existing = await get('SELECT * FROM reimagine_conversions WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

    const from_label = String(req.body.from_label ?? existing.from_label).trim();
    const to_label = String(req.body.to_label ?? existing.to_label).trim();
    if (!from_label || !to_label) {
      return res.status(400).json({ success: false, message: 'From and to labels are required' });
    }
    if (from_label.length > 128 || to_label.length > 128) {
      return res.status(400).json({
        success: false,
        message: 'From and to names must be 128 characters or fewer.',
      });
    }
    const price = Math.max(0, parseInt(String(req.body.price ?? existing.price), 10) || 0);
    const sort_order = Math.max(0, parseInt(String(req.body.sort_order ?? existing.sort_order), 10) || 0);
    let active = existing.active ? 1 : 0;
    if (req.body.active === false || req.body.active === 0 || req.body.active === '0') active = 0;
    if (req.body.active === true || req.body.active === 1 || req.body.active === '1') active = 1;

    const { from_image, to_image } = await resolveConversionImages(req, existing, from_label);

    await run(
      `UPDATE reimagine_conversions SET
        from_label=?, to_label=?, from_image=?, to_image=?, price=?, sort_order=?, active=?,
        updated_at=CURRENT_TIMESTAMP
       WHERE id=?`,
      [from_label, to_label, from_image, to_image, price, sort_order, active, req.params.id]
    );
    const row = await get('SELECT * FROM reimagine_conversions WHERE id = ?', [req.params.id]);
    res.json({ success: true, conversion: parseConversion(row) });
  } catch (err) {
    console.error('[reimagine] PUT /admin/conversions failed:', err);
    res.status(err.status || 500).json({ success: false, message: conversionDbErrorMessage(err) });
  }
});

router.delete('/admin/conversions/:id', authenticateAdmin, async (req, res) => {
  await run('DELETE FROM reimagine_conversions WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

router.get('/transformations/:garment', async (req, res) => {
  const garment = String(req.params.garment || '').trim().toLowerCase();
  const conversions = await listConversions({ activeOnly: true });
  const matches = conversions.filter((c) => c.from_label.toLowerCase() === garment);
  if (!matches.length) return res.status(404).json({ success: false });
  res.json({
    success: true,
    transformations: matches.map((c) => c.to_label),
    conversions: matches,
  });
});

router.post('/requests', authenticateUser, upload.array('images', 5), async (req, res) => {
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
    consultation_slot_id,
    request_callback,
    pickup_date,
    payment_method,
    conversion_id,
  } = req.body;

  if (!user_name?.trim() || !user_phone?.trim()) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  if (!conversion_id && (!garment_type?.trim() || !transformation?.trim())) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  if (!address?.trim()) {
    return res.status(400).json({ success: false, message: 'Pickup / delivery address is required' });
  }

  if (req.user.role === 'admin') {
    return res.status(403).json({ success: false, message: 'Sign in with a customer account to submit requests' });
  }

  const dbUser = await get('SELECT id FROM users WHERE id = ?', [req.user.id]);
  if (!dbUser) {
    return res.status(401).json({ success: false, message: 'Account not found. Please sign in again.' });
  }

  let images = [];
  try {
    images = (req.files || []).map((f) => bufferToDataUrl(f.buffer, f.mimetype));
  } catch (err) {
    return res.status(err.status || 400).json({ success: false, message: err.message || 'Image too large.' });
  }

  const id = uuidv4();
  const user_id = dbUser.id;
  const callbackRequested =
    request_callback === '1' || request_callback === 1 || request_callback === true;
  const consultation =
    !callbackRequested &&
    (is_consultation === '1' || is_consultation === 1 || is_consultation === true);
  const custom =
    consultation ||
    callbackRequested ||
    is_custom === '1' ||
    is_custom === 1 ||
    is_custom === true ||
    transformation === 'Custom';

  const settings = await getReimagineCustomizeSettings();
  const consultationFee = consultation ? settings.price : 0;

  let conversion = null;
  if (!consultation && !callbackRequested && conversion_id) {
    conversion = await getConversionById(String(conversion_id).trim());
    if (!conversion || !conversion.active) {
      return res.status(400).json({ success: false, message: 'Selected reimagine conversion is unavailable.' });
    }
  }

  const remakePrice = conversion ? Number(conversion.price) || 0 : 0;
  const paymentAmount = Math.max(0, consultation ? consultationFee : remakePrice);
  const wantsRazorpay = payment_method === 'razorpay' && paymentAmount > 0;

  const resolvedGarment = conversion ? conversion.from_label : garment_type.trim();
  const resolvedTransform = conversion
    ? conversion.to_label
    : callbackRequested
      ? 'Customize Consultation — Callback requested'
      : transformation.trim();

  let consultationDate = null;
  let consultationTime = null;
  let slotId = null;
  let slotLabel = null;

  if (consultation) {
    if (!consultation_slot_id?.trim()) {
      return res.status(400).json({ success: false, message: 'Please select a consultation time slot.' });
    }

    const slot = await get(
      'SELECT * FROM consultation_slots WHERE id = ? AND is_booked = 0',
      [consultation_slot_id.trim()]
    );
    if (!slot) {
      return res.status(400).json({ success: false, message: 'Selected time slot is no longer available.' });
    }

    consultationDate = toISODateString(slot.slot_date);
    consultationTime = toTimeString(slot.slot_time);
    slotId = slot.id;
    slotLabel = formatSlotLabel(consultationDate, consultationTime);
  }

  const pickupDate = pickup_date?.trim() ? toISODateString(pickup_date.trim()) : null;
  const transformationLabel = resolvedTransform;

  const status = wantsRazorpay ? 'pending_payment' : 'pending_review';
  const paymentStatus = wantsRazorpay ? 'pending' : callbackRequested || consultationFee === 0 ? 'not_required' : 'pending';

  await run(
    `INSERT INTO reimagine_requests (
      id,user_id,user_name,user_phone,user_email,address,garment_type,transformation,conversion_id,notes,images,status,
      is_custom,consultation_paid,consultation_slot_id,consultation_date,consultation_time,callback_requested,
      pickup_date,payment_status,consultation_fee
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      user_id,
      user_name.trim(),
      user_phone.trim(),
      user_email?.trim() || null,
      address.trim(),
      resolvedGarment,
      transformationLabel,
      conversion ? conversion.id : null,
      notes?.trim() || null,
      JSON.stringify(images),
      status,
      custom ? 1 : 0,
      consultation && !wantsRazorpay ? 1 : 0,
      slotId,
      consultationDate,
      consultationTime,
      callbackRequested ? 1 : 0,
      pickupDate,
      paymentStatus,
      paymentAmount || null,
    ]
  );

  if (wantsRazorpay) {
    const rzp = getRazorpayClient();
    if (!rzp) {
      await run('DELETE FROM reimagine_requests WHERE id = ?', [id]);
      return res.status(503).json({ success: false, message: 'Online payments are not configured' });
    }

    let rzpOrder;
    try {
      rzpOrder = await rzp.orders.create({
        amount: toPaise(paymentAmount),
        currency: 'INR',
        receipt: id.slice(0, 32),
        notes: { request_id: id, user_id },
      });
    } catch (err) {
      await run('DELETE FROM reimagine_requests WHERE id = ?', [id]);
      console.error('[razorpay] reimagine order create failed:', err);
      return res.status(502).json({ success: false, message: 'Could not start payment. Please try again.' });
    }

    await run('UPDATE reimagine_requests SET razorpay_order_id = ? WHERE id = ?', [rzpOrder.id, id]);
    const cfg = getRazorpayConfig();

    return res.status(201).json({
      success: true,
      requestId: id,
      requires_payment: true,
      razorpay: {
        key_id: cfg.key_id,
        order_id: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
      },
    });
  }

  if (consultation && slotId) {
    const ok = await bookConsultationSlot(id, slotId);
    if (!ok) {
      await run('DELETE FROM reimagine_requests WHERE id = ?', [id]);
      return res.status(409).json({ success: false, message: 'Selected time slot was just booked. Please pick another.' });
    }
  }

  const row = await get('SELECT * FROM reimagine_requests WHERE id = ?', [id]);
  notifyReimagineRequest(
    await buildNotifyPayload(row, {
      is_custom: custom,
      consultation_paid: consultation,
      callback_requested: callbackRequested,
      consultation_price: consultationFee || null,
      consultation_slot_label: slotLabel,
      pickup_date: pickupDate,
    })
  ).catch(() => {});

  res.status(201).json({
    success: true,
    message: callbackRequested
      ? "Thank you! Our team will contact you within 24 hours to schedule your consultation."
      : "Thank you for reimagining with Tarajuvva. We'll review your request and get back within 24 hours.",
    requestId: id,
    callback_requested: callbackRequested,
  });
});

router.post('/requests/:id/razorpay/verify', authenticateUser, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Missing payment details' });
  }

  const row = await get('SELECT * FROM reimagine_requests WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ success: false, message: 'Request not found' });
  if (row.user_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Not your request' });
  }
  if (row.payment_status === 'paid') {
    return res.json({
      success: true,
      message: 'Payment already confirmed',
      requestId: row.id,
    });
  }
  if (row.razorpay_order_id && row.razorpay_order_id !== razorpay_order_id) {
    return res.status(400).json({ success: false, message: 'Payment order mismatch' });
  }

  if (!verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature })) {
    return res.status(400).json({ success: false, message: 'Payment verification failed' });
  }

  if (row.consultation_slot_id) {
    const ok = await bookConsultationSlot(row.id, row.consultation_slot_id);
    if (!ok) {
      await run(
        `UPDATE reimagine_requests SET status = 'cancelled', payment_status = 'paid_slot_lost', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [row.id]
      );
      return res.status(409).json({
        success: false,
        message: 'Payment received but the consultation slot was taken. Our team will contact you to reschedule.',
      });
    }
  }

  await run(
    `UPDATE reimagine_requests SET
      status = 'pending_review',
      payment_status = 'paid',
      consultation_paid = 1,
      razorpay_payment_id = ?,
      paid_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [razorpay_payment_id, row.id]
  );

  const updated = await get('SELECT * FROM reimagine_requests WHERE id = ?', [row.id]);
  const slotLabel =
    updated.consultation_date && updated.consultation_time
      ? formatSlotLabel(updated.consultation_date, updated.consultation_time)
      : null;

  notifyReimagineRequest(
    await buildNotifyPayload(updated, {
      is_custom: Boolean(updated.is_custom),
      consultation_paid: true,
      callback_requested: Boolean(updated.callback_requested),
      consultation_price: updated.consultation_fee,
      consultation_slot_label: slotLabel,
      pickup_date: updated.pickup_date,
      payment_status: 'paid',
    })
  ).catch(() => {});

  res.json({
    success: true,
    message: "Payment confirmed. Thank you for reimagining with Tarajuvva — we'll review your request within 24 hours.",
    requestId: row.id,
  });
});

const { parsePagination, paginationMeta } = require('../lib/pagination');

/** Columns for list views — excludes heavy `images` LONGTEXT (base64 payloads). */
const REIMAGINE_LIST_SELECT = `
  id, user_id, user_name, user_phone, user_email, address, garment_type, transformation,
  conversion_id, notes, status, admin_notes, pickup_date, payment_status, consultation_fee,
  is_custom, consultation_paid, callback_requested, consultation_date, consultation_time,
  consultation_slot_id, created_at, updated_at,
  CASE
    WHEN images IS NULL OR TRIM(images) IN ('', '[]', 'null') THEN 0
    ELSE JSON_LENGTH(images)
  END AS image_count
`;

function mapReimagineListRow(r) {
  const normalized = normalizeReimagineRequest(r);
  const { image_count, ...rest } = normalized;
  return {
    ...rest,
    is_custom: Boolean(r.is_custom),
    consultation_paid: Boolean(r.consultation_paid),
    callback_requested: Boolean(r.callback_requested),
    image_count: Number(image_count) || 0,
    images: [],
  };
}

router.get('/requests', authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });
    const where = [];
    const params = [];
    if (status) {
      where.push('status = ?');
      params.push(status);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRow = await get(
      `SELECT COUNT(*) AS total FROM reimagine_requests ${whereSql}`,
      params
    );
    const total = Number(countRow?.total) || 0;

    const rows = await all(
      `SELECT ${REIMAGINE_LIST_SELECT}
       FROM reimagine_requests
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    res.json({
      success: true,
      requests: rows.map(mapReimagineListRow),
      pagination: paginationMeta({ page, limit, total }),
    });
  } catch (err) {
    console.error('[reimagine] GET /requests failed:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to load requests' });
  }
});

/** Lazy-load garment photos for one request (avoids shipping all base64 on list). */
router.get('/requests/:id/images', authenticateAdmin, async (req, res) => {
  try {
    const row = await get('SELECT id, images FROM reimagine_requests WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Request not found' });
    let images = [];
    try {
      images = JSON.parse(row.images || '[]');
      if (!Array.isArray(images)) images = [];
    } catch {
      images = [];
    }
    res.json({ success: true, id: row.id, images });
  } catch (err) {
    console.error('[reimagine] GET /requests/:id/images failed:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to load images' });
  }
});

router.patch('/requests/:id/status', authenticateAdmin, async (req, res) => {
  const { status, admin_notes } = req.body;
  const valid = ['pending_review', 'accepted', 'in_progress', 'completed', 'rejected'];
  if (!valid.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
  await run('UPDATE reimagine_requests SET status=?,admin_notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?', [status, admin_notes || null, req.params.id]);
  res.json({ success: true });
});

module.exports = router;

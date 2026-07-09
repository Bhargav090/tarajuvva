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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype);
    cb(ok ? null : new Error('Only JPEG, PNG, WebP, or GIF images are allowed.'), ok);
  },
});

const TRANSFORMATION_MAP = {
  saree: ['Dress', 'Co-ord Set', 'Blouse + Skirt'],
  kurti: ['Skirt', 'Halter Top', 'Crop Top'],
  shirt: ['Japanese Shirt', 'Corset Back', 'Tote Bag'],
  pant:  ['Jorts (Shorts)', 'Flared Pants', 'Skirt'],
};

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

router.get('/transformations/:garment', (req, res) => {
  const t = TRANSFORMATION_MAP[req.params.garment.toLowerCase()];
  if (!t) return res.status(404).json({ success: false });
  res.json({ success: true, transformations: t });
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
  } = req.body;

  if (!user_name?.trim() || !user_phone?.trim() || !garment_type?.trim() || !transformation?.trim()) {
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
  const paymentAmount = Math.max(
    0,
    consultation ? consultationFee : Number(req.body.payment_amount) || 0
  );
  const wantsRazorpay = payment_method === 'razorpay' && paymentAmount > 0;

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
  const transformationLabel = callbackRequested
    ? 'Customize Consultation — Callback requested'
    : transformation.trim();

  const status = wantsRazorpay ? 'pending_payment' : 'pending_review';
  const paymentStatus = wantsRazorpay ? 'pending' : callbackRequested || consultationFee === 0 ? 'not_required' : 'pending';

  await run(
    `INSERT INTO reimagine_requests (
      id,user_id,user_name,user_phone,user_email,address,garment_type,transformation,notes,images,status,
      is_custom,consultation_paid,consultation_slot_id,consultation_date,consultation_time,callback_requested,
      pickup_date,payment_status,consultation_fee
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      user_id,
      user_name.trim(),
      user_phone.trim(),
      user_email?.trim() || null,
      address.trim(),
      garment_type.trim(),
      transformationLabel,
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

router.get('/requests', authenticateAdmin, async (req, res) => {
  const { status } = req.query;
  let q = 'SELECT * FROM reimagine_requests WHERE 1=1';
  const params = [];
  if (status) { q += ' AND status=?'; params.push(status); }
  q += ' ORDER BY created_at DESC';
  const rows = await all(q, params);
  res.json({
    success: true,
    requests: rows.map((r) => {
      const normalized = normalizeReimagineRequest(r);
      return {
        ...normalized,
        is_custom: Boolean(r.is_custom),
        consultation_paid: Boolean(r.consultation_paid),
        callback_requested: Boolean(r.callback_requested),
        images: JSON.parse(r.images || '[]'),
      };
    }),
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

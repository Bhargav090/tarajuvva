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
const { mediaStorageIsS3, uploadBuffer } = require('../lib/s3Storage');
const { getRazorpayConfig, getRazorpayClient, verifyPaymentSignature, toPaise } = require('../utils/razorpay');
const { normalizeDeliveryZone, getDeliveryFee, DELIVERY_ZONE_LABELS } = require('../utils/delivery');
const {
  listConversions,
  getConversionById,
  parseConversion,
  saveConversionImageFile,
  normalizeConversionImageRef,
} = require('../lib/reimagineConversions');
const { mapImageList, loadLegacyMap } = require('../lib/publicImageUrl');
const { mediaReadMode } = require('../lib/s3Storage');
const {
  computePromotions,
  reserveRedemptions,
  markRedemptionsApplied,
  releaseRedemptions,
  deleteRedemptionsForOrder,
  listAvailableGiftCards,
} = require('../lib/promotions');

/** Customer account for promo checks — gift cards / user-specific coupons match the account email. */
async function loadCheckoutUser(req, res) {
  if (req.user.role === 'admin') {
    res.status(403).json({
      success: false,
      message: 'Sign in with a customer account to submit requests',
    });
    return null;
  }
  const dbUser = await get('SELECT id, email FROM users WHERE id = ?', [req.user.id]);
  if (!dbUser) {
    res.status(401).json({ success: false, message: 'Account not found. Please sign in again.' });
    return null;
  }
  return dbUser;
}

/**
 * Resolve remake / consultation base amount + remake delivery fee.
 * Used by promotions preview and request create.
 */
async function resolveReimaginePricing({
  conversion_id,
  is_consultation,
  request_callback,
  delivery_zone,
  is_custom,
  transformation,
}) {
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
      const err = new Error('Selected reimagine conversion is unavailable.');
      err.status = 400;
      throw err;
    }
  }

  const remakePrice = conversion ? Number(conversion.price) || 0 : 0;
  const isRemake = !consultation && !callbackRequested;
  let deliveryZone = normalizeDeliveryZone(delivery_zone);
  let deliveryFee = 0;

  if (isRemake) {
    if (!deliveryZone) {
      const err = new Error(
        'Please select whether pickup/delivery is in Hyderabad & around or outside Hyderabad.'
      );
      err.status = 400;
      throw err;
    }
    deliveryFee = await getDeliveryFee('reimagine', deliveryZone);
  } else {
    deliveryZone = deliveryZone || null;
    deliveryFee = 0;
  }

  const baseAmount = Math.max(0, consultation ? consultationFee : remakePrice);
  return {
    callbackRequested,
    consultation,
    custom,
    settings,
    consultationFee,
    conversion,
    remakePrice,
    isRemake,
    deliveryZone,
    deliveryFee,
    baseAmount,
  };
}

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

  if (fromFile) from_image = await saveConversionImageFile(fromFile);
  else if (clearFrom) from_image = null;
  else if (req.body.from_image != null && String(req.body.from_image).trim() !== '') {
    from_image = await normalizeConversionImageRef(req.body.from_image);
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

  if (toFile) to_image = await saveConversionImageFile(toFile);
  else if (clearTo) to_image = null;
  else if (req.body.to_image != null && String(req.body.to_image).trim() !== '') {
    to_image = await normalizeConversionImageRef(req.body.to_image);
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
  // Emails only need a photo count - never load multi‑MB base64 into the notify payload.
  let imageCount = 0;
  try {
    const parsed = JSON.parse(row.images || '[]');
    imageCount = Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    imageCount = 0;
  }
  const { images: _images, ...rest } = row;
  return {
    ...rest,
    images: Array.from({ length: imageCount }, () => true),
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

router.get('/gift-cards/mine', authenticateUser, async (req, res) => {
  try {
    const dbUser = await loadCheckoutUser(req, res);
    if (!dbUser) return;
    res.json({ success: true, gift_cards: await listAvailableGiftCards(dbUser.email) });
  } catch (err) {
    console.error('[reimagine] GET /gift-cards/mine failed:', err);
    res.status(500).json({ success: false, message: 'Could not load gift cards' });
  }
});

router.post('/promotions/preview', authenticateUser, async (req, res) => {
  try {
    const dbUser = await loadCheckoutUser(req, res);
    if (!dbUser) return;

    let pricingBase;
    try {
      pricingBase = await resolveReimaginePricing({
        conversion_id: req.body.conversion_id,
        is_consultation: req.body.is_consultation,
        request_callback: req.body.request_callback,
        delivery_zone: req.body.delivery_zone,
        is_custom: req.body.is_custom,
        transformation: req.body.transformation,
      });
    } catch (err) {
      return res.status(err.status || 400).json({ success: false, message: err.message });
    }

    if (pricingBase.callbackRequested) {
      return res.json({
        success: true,
        summary: {
          subtotal: 0,
          delivery_fee: 0,
          coupon: null,
          coupon_discount: 0,
          gift_card: null,
          gift_card_discount: 0,
          total: 0,
        },
        errors: {},
      });
    }

    const deliveryFee = pricingBase.isRemake ? pricingBase.deliveryFee : 0;
    const summary = await computePromotions({
      userId: dbUser.id,
      userEmail: dbUser.email,
      subtotal: pricingBase.baseAmount,
      deliveryFee,
      couponCode: req.body.coupon_code,
      giftCardCode: req.body.gift_card_code,
      lenient: true,
    });
    const { errors, ...rest } = summary;
    res.json({ success: true, summary: rest, errors });
  } catch (err) {
    console.error('[reimagine] POST /promotions/preview failed:', err);
    res.status(500).json({ success: false, message: 'Could not apply discount. Please try again.' });
  }
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

  const pickup_period = String(req.body.pickup_period || '').trim().toLowerCase();
  const garment_size = String(req.body.garment_size || '').trim().toUpperCase();
  const transformation_size = String(req.body.transformation_size || '').trim().toUpperCase();
  const height_ft = req.body.height_ft != null && req.body.height_ft !== ''
    ? parseInt(String(req.body.height_ft), 10)
    : null;
  const height_in = req.body.height_in != null && req.body.height_in !== ''
    ? parseInt(String(req.body.height_in), 10)
    : null;

  if (!user_name?.trim() || !user_phone?.trim()) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  if (!conversion_id && (!garment_type?.trim() || !transformation?.trim())) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  if (!address?.trim()) {
    return res.status(400).json({ success: false, message: 'Pickup / delivery address is required' });
  }

  const dbUser = await loadCheckoutUser(req, res);
  if (!dbUser) return;

  let images = [];
  try {
    if (mediaStorageIsS3()) {
      images = await Promise.all(
        (req.files || []).map((f) => uploadBuffer(f.buffer, f.mimetype, 'requests'))
      );
    } else {
      images = (req.files || []).map((f) => bufferToDataUrl(f.buffer, f.mimetype));
    }
  } catch (err) {
    return res.status(err.status || 400).json({ success: false, message: err.message || 'Image too large.' });
  }

  const id = uuidv4();
  const user_id = dbUser.id;

  let pricingBase;
  try {
    pricingBase = await resolveReimaginePricing({
      conversion_id,
      is_consultation,
      request_callback,
      delivery_zone: req.body.delivery_zone,
      is_custom,
      transformation,
    });
  } catch (err) {
    return res.status(err.status || 400).json({ success: false, message: err.message });
  }

  const {
    callbackRequested,
    consultation,
    custom,
    consultationFee,
    conversion,
    isRemake,
    deliveryZone,
    deliveryFee,
    baseAmount,
  } = pricingBase;

  let pricing = {
    coupon: null,
    coupon_discount: 0,
    gift_card: null,
    gift_card_discount: 0,
    total: baseAmount + (isRemake ? deliveryFee : 0),
  };

  if (!callbackRequested && (req.body.coupon_code || req.body.gift_card_code || payment_method === 'razorpay')) {
    try {
      pricing = await computePromotions({
        userId: dbUser.id,
        userEmail: dbUser.email,
        subtotal: baseAmount,
        deliveryFee: isRemake ? deliveryFee : 0,
        couponCode: req.body.coupon_code,
        giftCardCode: req.body.gift_card_code,
      });
    } catch (err) {
      if (err.status && err.status < 500) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      console.error('[reimagine] promotion check failed:', err);
      return res.status(500).json({ success: false, message: 'Could not apply discount. Please try again.' });
    }
  }

  const paymentAmount = pricing.total;
  const fullyCovered =
    !callbackRequested && payment_method === 'razorpay' && paymentAmount <= 0 && baseAmount + (isRemake ? deliveryFee : 0) > 0;
  const wantsRazorpay = payment_method === 'razorpay' && paymentAmount > 0 && !fullyCovered;

  const resolvedGarment = conversion ? conversion.from_label : garment_type.trim();
  const resolvedTransform = conversion
    ? conversion.to_label
    : callbackRequested
      ? 'Customize Consultation - Callback requested'
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
  const allowedPeriods = new Set(['morning', 'afternoon', 'evening']);
  const pickupPeriod = allowedPeriods.has(pickup_period) ? pickup_period : null;

  if (!consultation && !callbackRequested) {
    if (!pickupDate) {
      return res.status(400).json({ success: false, message: 'Preferred pickup date is required.' });
    }
    if (!pickupPeriod) {
      return res.status(400).json({
        success: false,
        message: 'Please choose a pickup time of day (morning, afternoon, or evening).',
      });
    }
    const letterSizes = new Set(['XS', 'S', 'M', 'L', 'XL', 'XXL']);
    if (!letterSizes.has(garment_size) || !letterSizes.has(transformation_size)) {
      return res.status(400).json({
        success: false,
        message: 'Please select current and desired garment sizes (XS-XXL).',
      });
    }
    if (
      height_ft == null ||
      height_in == null ||
      Number.isNaN(height_ft) ||
      Number.isNaN(height_in) ||
      height_ft < 4 ||
      height_ft > 7 ||
      height_in < 0 ||
      height_in > 11
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your height in feet and inches.',
      });
    }
  }

  const transformationLabel = resolvedTransform;

  const status = wantsRazorpay ? 'pending_payment' : 'pending_review';
  const paymentStatus = wantsRazorpay
    ? 'pending'
    : fullyCovered
      ? 'paid'
      : callbackRequested || consultationFee === 0
        ? 'not_required'
        : 'pending';

  await run(
    `INSERT INTO reimagine_requests (
      id,user_id,user_name,user_phone,user_email,address,delivery_zone,delivery_fee,
      garment_type,transformation,conversion_id,notes,
      garment_size,transformation_size,height_ft,height_in,
      images,status,
      is_custom,consultation_paid,consultation_slot_id,consultation_date,consultation_time,callback_requested,
      pickup_date,pickup_period,payment_status,consultation_fee,
      coupon_code,coupon_discount,gift_card_code,gift_card_discount,
      paid_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,${fullyCovered ? 'CURRENT_TIMESTAMP' : 'NULL'})`,
    [
      id,
      user_id,
      user_name.trim(),
      user_phone.trim(),
      user_email?.trim() || null,
      address.trim(),
      deliveryZone,
      deliveryFee,
      resolvedGarment,
      transformationLabel,
      conversion ? conversion.id : null,
      notes?.trim() || null,
      !consultation && !callbackRequested ? garment_size : null,
      !consultation && !callbackRequested ? transformation_size : null,
      !consultation && !callbackRequested ? height_ft : null,
      !consultation && !callbackRequested ? height_in : null,
      JSON.stringify(images),
      status,
      custom ? 1 : 0,
      consultation && (fullyCovered || !wantsRazorpay) ? 1 : 0,
      slotId,
      consultationDate,
      consultationTime,
      callbackRequested ? 1 : 0,
      pickupDate,
      pickupPeriod,
      paymentStatus,
      baseAmount || null,
      pricing.coupon ? pricing.coupon.code : null,
      pricing.coupon_discount || 0,
      pricing.gift_card ? pricing.gift_card.code : null,
      pricing.gift_card_discount || 0,
    ]
  );

  if (pricing.coupon || pricing.gift_card) {
    await reserveRedemptions({
      orderId: id,
      userId: user_id,
      userEmail: dbUser.email,
      breakdown: pricing,
      status: fullyCovered ? 'applied' : wantsRazorpay ? 'pending' : 'applied',
    });
  }

  const deliveryPayload = isRemake
    ? {
        zone: deliveryZone,
        zone_label: DELIVERY_ZONE_LABELS[deliveryZone],
        fee: deliveryFee,
        subtotal: baseAmount,
        coupon_discount: pricing.coupon_discount,
        gift_card_discount: pricing.gift_card_discount,
        total: paymentAmount,
      }
    : {
        zone: null,
        fee: 0,
        subtotal: baseAmount,
        coupon_discount: pricing.coupon_discount,
        gift_card_discount: pricing.gift_card_discount,
        total: paymentAmount,
      };

  if (fullyCovered) {
    if (consultation && slotId) {
      const ok = await bookConsultationSlot(id, slotId);
      if (!ok) {
        await deleteRedemptionsForOrder(id);
        await run('DELETE FROM reimagine_requests WHERE id = ?', [id]);
        return res.status(409).json({
          success: false,
          message: 'Selected time slot was just booked. Please pick another.',
        });
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
        pickup_period: pickupPeriod,
      })
    ).catch((err) => {
      console.error('[reimagine] notifyReimagineRequest (promo) failed:', err?.message || err);
    });

    return res.status(201).json({
      success: true,
      paid: true,
      message: 'Request placed. Your coupon / gift card covered the full amount.',
      requestId: id,
      delivery: deliveryPayload,
    });
  }

  if (wantsRazorpay) {
    const rzp = getRazorpayClient();
    if (!rzp) {
      await deleteRedemptionsForOrder(id);
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
      await deleteRedemptionsForOrder(id);
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
      delivery: deliveryPayload,
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
      await deleteRedemptionsForOrder(id);
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
      pickup_period: pickupPeriod,
    })
  ).catch((err) => {
    console.error('[reimagine] notifyReimagineRequest (create) failed:', err?.message || err);
  });

  res.status(201).json({
    success: true,
    message: callbackRequested
      ? "Thank you! Our team will contact you within 24 hours to schedule your consultation."
      : "Thank you for reimagining with Tarajuvva. We'll review your order and get back within 24 hours.",
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
    await run(
      'UPDATE reimagine_requests SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['failed', req.params.id]
    );
    await releaseRedemptions(req.params.id);
    return res.status(400).json({ success: false, message: 'Payment verification failed' });
  }

  if (row.consultation_slot_id) {
    const ok = await bookConsultationSlot(row.id, row.consultation_slot_id);
    if (!ok) {
      await run(
        `UPDATE reimagine_requests SET status = 'cancelled', payment_status = 'paid_slot_lost', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [row.id]
      );
      await markRedemptionsApplied(row.id);
      return res.status(409).json({
        success: false,
        message: 'Payment received but the consultation slot was taken. Our team will contact you to reschedule.',
      });
    }
  }

  // Only mark consultation_paid for real consultations (slot booking / customize).
  // Remake Razorpay payments must stay consultation_paid=0 or they land under Consultations.
  const wasConsultation =
    Boolean(row.consultation_slot_id) || Boolean(Number(row.callback_requested));

  await run(
    `UPDATE reimagine_requests SET
      status = 'pending_review',
      payment_status = 'paid',
      consultation_paid = ?,
      razorpay_payment_id = ?,
      paid_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [wasConsultation ? 1 : 0, razorpay_payment_id, row.id]
  );
  await markRedemptionsApplied(row.id);

  const updated = await get('SELECT * FROM reimagine_requests WHERE id = ?', [row.id]);
  const slotLabel =
    updated.consultation_date && updated.consultation_time
      ? formatSlotLabel(updated.consultation_date, updated.consultation_time)
      : null;
  const consultationPaid = Boolean(Number(updated.consultation_paid));

  notifyReimagineRequest(
    await buildNotifyPayload(updated, {
      is_custom: Boolean(Number(updated.is_custom)),
      consultation_paid: consultationPaid,
      callback_requested: Boolean(Number(updated.callback_requested)),
      consultation_price: consultationPaid ? updated.consultation_fee : null,
      consultation_slot_label: slotLabel,
      pickup_date: updated.pickup_date,
      pickup_period: updated.pickup_period,
      payment_status: 'paid',
    })
  ).catch((err) => {
    console.error('[reimagine] notifyReimagineRequest (verify) failed:', err?.message || err);
  });

  res.json({
    success: true,
    message: "Payment confirmed. Thank you for reimagining with Tarajuvva - we'll review your order within 24 hours.",
    requestId: row.id,
  });
});

const { parsePagination, paginationMeta } = require('../lib/pagination');

/** Columns for list views - excludes heavy `images` LONGTEXT (base64 payloads). */
const REIMAGINE_LIST_SELECT = `
  id, user_id, user_name, user_phone, user_email, address, delivery_zone, delivery_fee,
  garment_type, transformation,
  conversion_id, notes, garment_size, transformation_size, height_ft, height_in,
  status, admin_notes, pickup_date, pickup_period, payment_status, consultation_fee,
  coupon_code, coupon_discount, gift_card_code, gift_card_discount,
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

const CONSULTATION_WHERE =
  '(COALESCE(consultation_paid, 0) = 1 OR COALESCE(callback_requested, 0) = 1)';
const REMAKE_WHERE =
  '(COALESCE(consultation_paid, 0) = 0 AND COALESCE(callback_requested, 0) = 0)';

router.get('/requests', authenticateAdmin, async (req, res) => {
  try {
    const { status, kind } = req.query;
    const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });
    const where = [];
    const params = [];

    // Default: remake orders only. Consultations live under kind=consultations.
    if (kind === 'consultations') {
      where.push(CONSULTATION_WHERE);
    } else if (kind === 'all') {
      // no kind filter
    } else {
      where.push(REMAKE_WHERE);
    }

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
    if (mediaReadMode() === 'legacy') await loadLegacyMap();
    res.json({ success: true, id: row.id, images: mapImageList(images) });
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

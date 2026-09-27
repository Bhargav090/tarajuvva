const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { get, all, run } = require('../db/database');
const { authenticateAdmin } = require('../middleware/auth');
const { parsePagination, paginationMeta } = require('../lib/pagination');
const {
  CODE_RE,
  promoError,
  normalizeCode,
  normalizeEmail,
  parseEmailList,
  parseStoredEmails,
  parseOptionalDate,
  parseMoney,
  parseOptionalInt,
  parseBool,
  dateOnly,
  generateUniqueGiftCardCode,
} = require('../lib/promotions');
const { notifyGiftCardIssued } = require('../utils/notifyEmail');

router.use(authenticateAdmin);

function sendError(res, err, fallback) {
  if (err?.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'That code already exists. Use a different code.' });
  }
  const status = err?.status || 500;
  if (status >= 500) console.error('[promotions]', err);
  return res.status(status).json({ success: false, message: status >= 500 ? fallback : err.message });
}

// ── Coupons ───────────────────────────────────────────────────────────────────

function parseCouponBody(body) {
  const code = normalizeCode(body.code);
  if (!CODE_RE.test(code)) {
    throw promoError('Coupon code must be 3–32 characters: letters, numbers, - or _');
  }
  const discountType = body.discount_type === 'flat' ? 'flat' : body.discount_type === 'percent' ? 'percent' : null;
  if (!discountType) throw promoError('Choose a discount type (percentage or flat amount)');
  const discountValue = parseMoney(body.discount_value, 'Discount value', { min: 0.01, required: true });
  if (discountType === 'percent' && discountValue > 100) throw promoError('Percentage discount cannot exceed 100');
  const maxDiscount = discountType === 'percent' ? parseMoney(body.max_discount, 'Maximum discount') : null;
  const minCart = parseMoney(body.min_cart_value, 'Minimum cart value') ?? 0;
  const audience = body.audience === 'specific' ? 'specific' : 'all';
  let emails = [];
  if (audience === 'specific') {
    const { valid, invalid } = parseEmailList(body.emails ?? body.allowed_emails);
    if (invalid.length) throw promoError(`Invalid email(s): ${invalid.slice(0, 5).join(', ')}`);
    if (!valid.length) throw promoError('Add at least one customer email for a user-specific coupon');
    emails = valid;
  }
  const startsAt = parseOptionalDate(body.starts_at, 'Start date');
  const expiresAt = parseOptionalDate(body.expires_at, 'Expiry date');
  if (startsAt && expiresAt && expiresAt < startsAt) throw promoError('Expiry date must be on or after the start date');
  const description = String(body.description || '').trim().slice(0, 255) || null;

  return {
    code,
    description,
    discount_type: discountType,
    discount_value: discountValue,
    max_discount: maxDiscount && maxDiscount > 0 ? maxDiscount : null,
    min_cart_value: minCart,
    audience,
    allowed_emails: audience === 'specific' ? JSON.stringify(emails) : null,
    usage_limit: parseOptionalInt(body.usage_limit, 'Total usage limit'),
    per_user_limit: parseOptionalInt(body.per_user_limit, 'Uses per customer'),
    starts_at: startsAt,
    expires_at: expiresAt,
    active: parseBool(body.active, true) ? 1 : 0,
  };
}

const COUPON_STATS_SQL = `
  SELECT c.*,
    COALESCE(r.uses, 0) AS used_count,
    COALESCE(r.discount, 0) AS total_discount,
    COALESCE(r.revenue, 0) AS revenue,
    COALESCE(r.customers, 0) AS unique_customers,
    r.last_used_at
  FROM coupons c
  LEFT JOIN (
    SELECT pr.promo_id,
      COUNT(*) AS uses,
      SUM(pr.discount_amount) AS discount,
      SUM(COALESCE(o.total, 0)) AS revenue,
      COUNT(DISTINCT pr.user_id) AS customers,
      MAX(pr.created_at) AS last_used_at
    FROM promo_redemptions pr
    LEFT JOIN orders o ON o.id = pr.order_id
    WHERE pr.kind = 'coupon' AND pr.status = 'applied'
    GROUP BY pr.promo_id
  ) r ON r.promo_id = c.id`;

function serializeCoupon(row) {
  return {
    ...row,
    discount_value: Number(row.discount_value),
    max_discount: row.max_discount == null ? null : Number(row.max_discount),
    min_cart_value: Number(row.min_cart_value) || 0,
    usage_limit: row.usage_limit == null ? null : Number(row.usage_limit),
    per_user_limit: row.per_user_limit == null ? null : Number(row.per_user_limit),
    allowed_emails: parseStoredEmails(row.allowed_emails),
    starts_at: dateOnly(row.starts_at),
    expires_at: dateOnly(row.expires_at),
    active: Boolean(Number(row.active)),
    used_count: Number(row.used_count) || 0,
    total_discount: Number(row.total_discount) || 0,
    revenue: Number(row.revenue) || 0,
    unique_customers: Number(row.unique_customers) || 0,
  };
}

async function loadCoupon(id) {
  const row = await get(`${COUPON_STATS_SQL} WHERE c.id = ?`, [id]);
  return row ? serializeCoupon(row) : null;
}

router.get('/coupons', async (req, res) => {
  try {
    const rows = await all(`${COUPON_STATS_SQL} ORDER BY c.created_at DESC`);
    res.json({ success: true, coupons: rows.map(serializeCoupon) });
  } catch (err) {
    sendError(res, err, 'Could not load coupons');
  }
});

router.post('/coupons', async (req, res) => {
  try {
    const c = parseCouponBody(req.body || {});
    const id = uuidv4();
    await run(
      `INSERT INTO coupons (id, code, description, discount_type, discount_value, max_discount, min_cart_value,
        audience, allowed_emails, usage_limit, per_user_limit, starts_at, expires_at, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, c.code, c.description, c.discount_type, c.discount_value, c.max_discount, c.min_cart_value,
        c.audience, c.allowed_emails, c.usage_limit, c.per_user_limit, c.starts_at, c.expires_at, c.active,
      ]
    );
    res.status(201).json({ success: true, coupon: await loadCoupon(id) });
  } catch (err) {
    sendError(res, err, 'Could not create coupon');
  }
});

router.put('/coupons/:id', async (req, res) => {
  try {
    const existing = await get('SELECT id FROM coupons WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Coupon not found' });
    const c = parseCouponBody(req.body || {});
    await run(
      `UPDATE coupons SET code=?, description=?, discount_type=?, discount_value=?, max_discount=?, min_cart_value=?,
        audience=?, allowed_emails=?, usage_limit=?, per_user_limit=?, starts_at=?, expires_at=?, active=?
       WHERE id=?`,
      [
        c.code, c.description, c.discount_type, c.discount_value, c.max_discount, c.min_cart_value,
        c.audience, c.allowed_emails, c.usage_limit, c.per_user_limit, c.starts_at, c.expires_at, c.active,
        req.params.id,
      ]
    );
    res.json({ success: true, coupon: await loadCoupon(req.params.id) });
  } catch (err) {
    sendError(res, err, 'Could not update coupon');
  }
});

router.patch('/coupons/:id/active', async (req, res) => {
  try {
    const result = await run('UPDATE coupons SET active = ? WHERE id = ?', [
      parseBool(req.body?.active, false) ? 1 : 0,
      req.params.id,
    ]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Coupon not found' });
    res.json({ success: true, coupon: await loadCoupon(req.params.id) });
  } catch (err) {
    sendError(res, err, 'Could not update coupon');
  }
});

router.delete('/coupons/:id', async (req, res) => {
  try {
    const used = await get(
      "SELECT COUNT(*) AS c FROM promo_redemptions WHERE kind = 'coupon' AND promo_id = ? AND status = 'applied'",
      [req.params.id]
    );
    if (Number(used?.c) > 0) {
      return res.status(409).json({
        success: false,
        message: 'This coupon has been used on orders. Deactivate it instead so its stats are kept.',
      });
    }
    await run("DELETE FROM promo_redemptions WHERE kind = 'coupon' AND promo_id = ?", [req.params.id]);
    await run('DELETE FROM coupons WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    sendError(res, err, 'Could not delete coupon');
  }
});

// ── Gift cards ────────────────────────────────────────────────────────────────

function parseGiftCardFields(body, { requireAll = true } = {}) {
  const value = parseMoney(body.value, 'Gift card value', { min: 1, required: requireAll });
  const maxUses = parseOptionalInt(body.max_uses, 'Number of uses');
  if (requireAll && maxUses == null) throw promoError('Number of uses is required');
  return {
    value,
    max_uses: maxUses,
    min_cart_value: parseMoney(body.min_cart_value, 'Minimum cart value') ?? 0,
    expires_at: parseOptionalDate(body.expires_at, 'Expiry date'),
    note: String(body.note || '').trim().slice(0, 255) || null,
    active: parseBool(body.active, true) ? 1 : 0,
  };
}

const GIFT_STATS_SQL = `
  SELECT g.*,
    COALESCE(r.uses, 0) AS used_count,
    COALESCE(r.redeemed, 0) AS total_redeemed,
    r.last_used_at
  FROM gift_cards g
  LEFT JOIN (
    SELECT promo_id, COUNT(*) AS uses, SUM(discount_amount) AS redeemed, MAX(created_at) AS last_used_at
    FROM promo_redemptions
    WHERE kind = 'gift_card' AND status = 'applied'
    GROUP BY promo_id
  ) r ON r.promo_id = g.id`;

function serializeGiftCard(row) {
  const used = Number(row.used_count) || 0;
  const maxUses = Number(row.max_uses) || 0;
  return {
    ...row,
    value: Number(row.value),
    max_uses: maxUses,
    min_cart_value: Number(row.min_cart_value) || 0,
    expires_at: dateOnly(row.expires_at),
    active: Boolean(Number(row.active)),
    used_count: used,
    remaining_uses: Math.max(0, maxUses - used),
    total_redeemed: Number(row.total_redeemed) || 0,
  };
}

async function loadGiftCard(id) {
  const row = await get(`${GIFT_STATS_SQL} WHERE g.id = ?`, [id]);
  return row ? serializeGiftCard(row) : null;
}

router.get('/gift-cards', async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
    const where = [];
    const params = [];
    const search = String(req.query.search || '').trim();
    if (search) {
      where.push('(g.code LIKE ? OR g.recipient_email LIKE ? OR g.note LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    const status = String(req.query.status || '');
    if (status === 'active') where.push('g.active = 1 AND COALESCE(r.uses, 0) < g.max_uses');
    if (status === 'inactive') where.push('g.active = 0');
    if (status === 'used') where.push('COALESCE(r.uses, 0) >= g.max_uses');
    const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : '';

    const countRow = await get(`SELECT COUNT(*) AS total FROM (${GIFT_STATS_SQL}${whereSql}) t`, params);
    const rows = await all(
      `${GIFT_STATS_SQL}${whereSql} ORDER BY g.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    );
    res.json({
      success: true,
      gift_cards: rows.map(serializeGiftCard),
      pagination: paginationMeta({ page, limit, total: Number(countRow?.total) || 0 }),
    });
  } catch (err) {
    sendError(res, err, 'Could not load gift cards');
  }
});

router.post('/gift-cards', async (req, res) => {
  try {
    const body = req.body || {};
    const fields = parseGiftCardFields(body);
    const audience = body.audience === 'all' ? 'all' : 'specific';
    const batchId = uuidv4();
    const created = [];

    if (audience === 'all') {
      const customCode = normalizeCode(body.code);
      if (customCode && !CODE_RE.test(customCode)) {
        throw promoError('Gift card code must be 3–32 characters: letters, numbers, - or _');
      }
      const code = customCode || (await generateUniqueGiftCardCode());
      const id = uuidv4();
      await run(
        `INSERT INTO gift_cards (id, code, batch_id, recipient_email, value, max_uses, min_cart_value, expires_at, note, active)
         VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
        [id, code, batchId, fields.value, fields.max_uses, fields.min_cart_value, fields.expires_at, fields.note, fields.active]
      );
      created.push(await loadGiftCard(id));
    } else {
      const { valid, invalid } = parseEmailList(body.emails);
      if (invalid.length) throw promoError(`Invalid email(s): ${invalid.slice(0, 5).join(', ')}`);
      if (!valid.length) throw promoError('Add at least one recipient email');
      if (valid.length > 500) throw promoError('Add at most 500 emails at a time');
      for (const email of valid) {
        const id = uuidv4();
        const code = await generateUniqueGiftCardCode();
        await run(
          `INSERT INTO gift_cards (id, code, batch_id, recipient_email, value, max_uses, min_cart_value, expires_at, note, active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, code, batchId, email, fields.value, fields.max_uses, fields.min_cart_value, fields.expires_at, fields.note, fields.active]
        );
        created.push(await loadGiftCard(id));
      }
      if (parseBool(body.notify, true) && fields.active) {
        for (const card of created) {
          notifyGiftCardIssued(card).catch((err) =>
            console.error('[promotions] gift card email failed:', err?.message || err)
          );
        }
      }
    }

    res.status(201).json({ success: true, gift_cards: created, batch_id: batchId });
  } catch (err) {
    sendError(res, err, 'Could not create gift cards');
  }
});

router.put('/gift-cards/:id', async (req, res) => {
  try {
    const existing = await loadGiftCard(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Gift card not found' });
    const fields = parseGiftCardFields(req.body || {});
    if (fields.max_uses < existing.used_count) {
      throw promoError(`This card has already been used ${existing.used_count} time(s); uses cannot be lower than that`);
    }
    let recipient = existing.recipient_email;
    if (existing.recipient_email && req.body?.recipient_email != null) {
      const { valid } = parseEmailList([req.body.recipient_email]);
      if (!valid.length) throw promoError('Enter a valid recipient email');
      recipient = valid[0];
    }
    await run(
      `UPDATE gift_cards SET recipient_email=?, value=?, max_uses=?, min_cart_value=?, expires_at=?, note=?, active=?
       WHERE id=?`,
      [recipient, fields.value, fields.max_uses, fields.min_cart_value, fields.expires_at, fields.note, fields.active, req.params.id]
    );
    res.json({ success: true, gift_card: await loadGiftCard(req.params.id) });
  } catch (err) {
    sendError(res, err, 'Could not update gift card');
  }
});

router.patch('/gift-cards/:id/active', async (req, res) => {
  try {
    const result = await run('UPDATE gift_cards SET active = ? WHERE id = ?', [
      parseBool(req.body?.active, false) ? 1 : 0,
      req.params.id,
    ]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Gift card not found' });
    res.json({ success: true, gift_card: await loadGiftCard(req.params.id) });
  } catch (err) {
    sendError(res, err, 'Could not update gift card');
  }
});

router.post('/gift-cards/:id/resend', async (req, res) => {
  try {
    const card = await loadGiftCard(req.params.id);
    if (!card) return res.status(404).json({ success: false, message: 'Gift card not found' });
    if (!card.recipient_email) {
      return res.status(400).json({ success: false, message: 'Open gift cards have no recipient to email' });
    }
    const result = await notifyGiftCardIssued(card);
    if (!result?.ok) {
      return res.status(502).json({ success: false, message: result?.error || 'Email could not be sent' });
    }
    res.json({ success: true });
  } catch (err) {
    sendError(res, err, 'Could not send gift card email');
  }
});

router.delete('/gift-cards/:id', async (req, res) => {
  try {
    const used = await get(
      "SELECT COUNT(*) AS c FROM promo_redemptions WHERE kind = 'gift_card' AND promo_id = ? AND status = 'applied'",
      [req.params.id]
    );
    if (Number(used?.c) > 0) {
      return res.status(409).json({
        success: false,
        message: 'This gift card has been redeemed. Deactivate it instead so its history is kept.',
      });
    }
    await run("DELETE FROM promo_redemptions WHERE kind = 'gift_card' AND promo_id = ?", [req.params.id]);
    await run('DELETE FROM gift_cards WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    sendError(res, err, 'Could not delete gift card');
  }
});

// ── Stats ─────────────────────────────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(String(req.query.days || 30), 10) || 30, 1), 365);

    const couponTotals = await get(
      'SELECT COUNT(*) AS total, SUM(active = 1) AS active FROM coupons'
    );
    const couponUse = await get(
      `SELECT COUNT(*) AS redemptions, COALESCE(SUM(pr.discount_amount), 0) AS discount,
        COALESCE(SUM(o.total), 0) AS revenue, COUNT(DISTINCT pr.user_id) AS customers
       FROM promo_redemptions pr LEFT JOIN orders o ON o.id = pr.order_id
       WHERE pr.kind = 'coupon' AND pr.status = 'applied'`
    );
    const giftTotals = await get(
      `SELECT COUNT(*) AS total, SUM(g.active = 1) AS active,
        COALESCE(SUM(g.value * g.max_uses), 0) AS issued_value,
        SUM(COALESCE(r.uses, 0) >= g.max_uses) AS fully_redeemed,
        COALESCE(SUM(GREATEST(g.max_uses - COALESCE(r.uses, 0), 0)), 0) AS outstanding_uses
       FROM gift_cards g
       LEFT JOIN (
         SELECT promo_id, COUNT(*) AS uses FROM promo_redemptions
         WHERE kind = 'gift_card' AND status = 'applied' GROUP BY promo_id
       ) r ON r.promo_id = g.id`
    );
    const giftUse = await get(
      `SELECT COUNT(*) AS redemptions, COALESCE(SUM(pr.discount_amount), 0) AS redeemed,
        COALESCE(SUM(o.total), 0) AS revenue
       FROM promo_redemptions pr LEFT JOIN orders o ON o.id = pr.order_id
       WHERE pr.kind = 'gift_card' AND pr.status = 'applied'`
    );
    const topCoupons = await all(
      `SELECT pr.code, COUNT(*) AS uses, SUM(pr.discount_amount) AS discount, SUM(COALESCE(o.total, 0)) AS revenue
       FROM promo_redemptions pr LEFT JOIN orders o ON o.id = pr.order_id
       WHERE pr.kind = 'coupon' AND pr.status = 'applied'
       GROUP BY pr.code ORDER BY uses DESC, discount DESC LIMIT 5`
    );
    const daily = await all(
      `SELECT DATE(pr.created_at) AS day,
        SUM(pr.kind = 'coupon') AS coupon_uses,
        SUM(pr.kind = 'gift_card') AS gift_card_uses,
        SUM(pr.discount_amount) AS discount
       FROM promo_redemptions pr
       WHERE pr.status = 'applied' AND pr.created_at >= (NOW() - INTERVAL ${days} DAY)
       GROUP BY DATE(pr.created_at) ORDER BY day ASC`
    );
    const recent = await all(
      `SELECT pr.id, pr.kind, pr.code, pr.user_email, pr.discount_amount, pr.created_at, pr.order_id,
        o.total AS order_total, o.user_name
       FROM promo_redemptions pr LEFT JOIN orders o ON o.id = pr.order_id
       WHERE pr.status = 'applied'
       ORDER BY pr.created_at DESC LIMIT 20`
    );

    const num = (v) => Number(v) || 0;
    res.json({
      success: true,
      stats: {
        coupons: {
          total: num(couponTotals?.total),
          active: num(couponTotals?.active),
          redemptions: num(couponUse?.redemptions),
          discount_given: num(couponUse?.discount),
          revenue: num(couponUse?.revenue),
          customers: num(couponUse?.customers),
        },
        gift_cards: {
          total: num(giftTotals?.total),
          active: num(giftTotals?.active),
          fully_redeemed: num(giftTotals?.fully_redeemed),
          issued_value: num(giftTotals?.issued_value),
          outstanding_uses: num(giftTotals?.outstanding_uses),
          redemptions: num(giftUse?.redemptions),
          redeemed_value: num(giftUse?.redeemed),
          revenue: num(giftUse?.revenue),
        },
        top_coupons: topCoupons.map((r) => ({
          code: r.code,
          uses: num(r.uses),
          discount: num(r.discount),
          revenue: num(r.revenue),
        })),
        daily: daily.map((d) => ({
          day: dateOnly(d.day),
          coupon_uses: num(d.coupon_uses),
          gift_card_uses: num(d.gift_card_uses),
          discount: num(d.discount),
        })),
        recent: recent.map((r) => ({
          ...r,
          user_email: r.user_email ? normalizeEmail(r.user_email) : null,
          discount_amount: num(r.discount_amount),
          order_total: r.order_total == null ? null : num(r.order_total),
        })),
        days,
      },
    });
  } catch (err) {
    sendError(res, err, 'Could not load promotion stats');
  }
});

module.exports = router;

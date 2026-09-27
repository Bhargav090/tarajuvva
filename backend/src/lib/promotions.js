const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { get, all, run } = require('../db/database');

/** Unpaid checkouts hold their coupon / gift card use for this long before it is released. */
const RESERVATION_MINUTES = 30;
const CODE_RE = /^[A-Z0-9_-]{3,32}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function promoError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function normalizeCode(raw) {
  return String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
}

function normalizeEmail(raw) {
  return String(raw || '').trim().toLowerCase();
}

function roundMoney(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

/** Split a pasted list (comma / newline / space / semicolon) into unique valid + invalid emails. */
function parseEmailList(raw) {
  const parts = Array.isArray(raw) ? raw : String(raw || '').split(/[\s,;]+/);
  const valid = [];
  const invalid = [];
  const seen = new Set();
  for (const part of parts) {
    const email = normalizeEmail(part);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    if (EMAIL_RE.test(email)) valid.push(email);
    else invalid.push(email);
  }
  return { valid, invalid };
}

function parseStoredEmails(value) {
  if (!value) return [];
  try {
    const list = JSON.parse(value);
    return Array.isArray(list) ? list.map(normalizeEmail).filter(Boolean) : [];
  } catch {
    return [];
  }
}

/** Calendar date in India — coupon / gift card dates are entered as IST days. */
function todayIST() {
  return new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);
}

function dateOnly(value) {
  if (!value) return null;
  const s = String(value).slice(0, 10);
  return DATE_RE.test(s) ? s : null;
}

function parseOptionalDate(raw, label) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (!DATE_RE.test(s) || Number.isNaN(new Date(`${s}T00:00:00Z`).getTime())) {
    throw promoError(`${label} must be a valid date (YYYY-MM-DD)`);
  }
  return s;
}

function parseMoney(raw, label, { min = 0, required = false } = {}) {
  if (raw == null || String(raw).trim() === '') {
    if (required) throw promoError(`${label} is required`);
    return null;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min) throw promoError(`${label} must be ${min > 0 ? `at least ${min}` : '0 or more'}`);
  return roundMoney(n);
}

function parseOptionalInt(raw, label, { min = 1 } = {}) {
  if (raw == null || String(raw).trim() === '') return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min) throw promoError(`${label} must be a whole number of at least ${min}`);
  return n;
}

function parseBool(raw, fallback) {
  if (raw == null) return fallback;
  if (raw === true || raw === 1 || raw === '1' || raw === 'true') return true;
  if (raw === false || raw === 0 || raw === '0' || raw === 'false') return false;
  return fallback;
}

function randomCode(prefix) {
  const pick = () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  const block = () => Array.from({ length: 4 }, pick).join('');
  return `${prefix}-${block()}-${block()}`;
}

async function generateUniqueGiftCardCode() {
  for (let i = 0; i < 20; i += 1) {
    const code = randomCode('GIFT');
    const exists = await get('SELECT id FROM gift_cards WHERE code = ?', [code]);
    if (!exists) return code;
  }
  throw promoError('Could not generate a unique gift card code. Try again.', 500);
}

/** Uses that count against limits: confirmed, plus unpaid checkouts still inside the hold window. */
async function countActiveUses(kind, promoId, userId = null) {
  let sql = `SELECT COUNT(*) AS c FROM promo_redemptions
    WHERE kind = ? AND promo_id = ?
      AND (status = 'applied' OR (status = 'pending' AND created_at > (NOW() - INTERVAL ${RESERVATION_MINUTES} MINUTE)))`;
  const params = [kind, promoId];
  if (userId) {
    sql += ' AND user_id = ?';
    params.push(userId);
  }
  const row = await get(sql, params);
  return Number(row?.c) || 0;
}

function assertDateWindow(row, label) {
  const today = todayIST();
  const starts = dateOnly(row.starts_at);
  const expires = dateOnly(row.expires_at);
  if (starts && today < starts) throw promoError(`This ${label} is not active yet`);
  if (expires && today > expires) throw promoError(`This ${label} has expired`);
}

function assertMinCart(row, subtotal, label) {
  const min = Number(row.min_cart_value) || 0;
  if (min > 0 && subtotal < min) {
    throw promoError(
      `This ${label} needs a cart value of at least ${money(min)}. Add ${money(roundMoney(min - subtotal))} more to use it.`
    );
  }
}

function couponDiscountFor(row, subtotal) {
  const value = Number(row.discount_value) || 0;
  let discount = row.discount_type === 'percent' ? (subtotal * value) / 100 : value;
  const cap = row.max_discount == null ? null : Number(row.max_discount);
  if (row.discount_type === 'percent' && cap != null && cap > 0) discount = Math.min(discount, cap);
  return Math.floor(Math.max(0, Math.min(discount, subtotal)));
}

async function validateCoupon({ code, userId, userEmail, subtotal }) {
  const normalized = normalizeCode(code);
  if (!normalized) throw promoError('Enter a coupon code');
  const row = await get('SELECT * FROM coupons WHERE code = ?', [normalized]);
  if (!row) throw promoError('Invalid coupon code');
  if (!Number(row.active)) throw promoError('This coupon is no longer active');
  assertDateWindow(row, 'coupon');
  if (row.audience === 'specific') {
    const allowed = parseStoredEmails(row.allowed_emails);
    if (!allowed.includes(normalizeEmail(userEmail))) {
      throw promoError('This coupon is not available for your account');
    }
  }
  assertMinCart(row, subtotal, 'coupon');
  if (row.usage_limit != null && (await countActiveUses('coupon', row.id)) >= Number(row.usage_limit)) {
    throw promoError('This coupon has reached its usage limit');
  }
  if (
    row.per_user_limit != null &&
    userId &&
    (await countActiveUses('coupon', row.id, userId)) >= Number(row.per_user_limit)
  ) {
    throw promoError(
      Number(row.per_user_limit) === 1
        ? 'You have already used this coupon'
        : `You can use this coupon only ${row.per_user_limit} times`
    );
  }
  return { row, discount: couponDiscountFor(row, subtotal) };
}

async function validateGiftCard({ code, userEmail, subtotal, remaining }) {
  const normalized = normalizeCode(code);
  if (!normalized) throw promoError('Enter a gift card code');
  const row = await get('SELECT * FROM gift_cards WHERE code = ?', [normalized]);
  if (!row) throw promoError('Invalid gift card code');
  if (!Number(row.active)) throw promoError('This gift card is no longer active');
  assertDateWindow(row, 'gift card');
  if (row.recipient_email && normalizeEmail(row.recipient_email) !== normalizeEmail(userEmail)) {
    throw promoError('This gift card belongs to a different account');
  }
  assertMinCart(row, subtotal, 'gift card');
  const used = await countActiveUses('gift_card', row.id);
  if (used >= Number(row.max_uses)) throw promoError('This gift card has already been fully redeemed');
  const discount = roundMoney(Math.max(0, Math.min(Number(row.value) || 0, remaining)));
  return { row, discount, remainingUses: Number(row.max_uses) - used };
}

/**
 * Server-side price breakdown for a cart. Coupon applies to the item subtotal; the gift card then
 * covers the remaining payable amount (delivery included).
 * `lenient` collects per-field errors instead of throwing (checkout preview).
 */
async function computePromotions({
  userId,
  userEmail,
  subtotal,
  deliveryFee = 0,
  couponCode,
  giftCardCode,
  lenient = false,
}) {
  const sub = roundMoney(subtotal);
  const fee = roundMoney(deliveryFee);
  const errors = {};
  let coupon = null;
  let couponDiscount = 0;
  let gift = null;
  let giftDiscount = 0;

  if (normalizeCode(couponCode)) {
    try {
      const res = await validateCoupon({ code: couponCode, userId, userEmail, subtotal: sub });
      coupon = res.row;
      couponDiscount = res.discount;
    } catch (err) {
      if (!lenient) throw err;
      errors.coupon = err.message;
    }
  }

  const afterCoupon = roundMoney(sub - couponDiscount + fee);

  if (normalizeCode(giftCardCode)) {
    try {
      const res = await validateGiftCard({ code: giftCardCode, userEmail, subtotal: sub, remaining: afterCoupon });
      gift = { ...res.row, remaining_uses: res.remainingUses };
      giftDiscount = res.discount;
    } catch (err) {
      if (!lenient) throw err;
      errors.gift_card = err.message;
    }
  }

  let total = roundMoney(afterCoupon - giftDiscount);
  // Razorpay cannot charge under ₹1 — absorb a sub-rupee remainder into the discount.
  if (total > 0 && total < 1 && (gift || coupon)) {
    if (gift) giftDiscount = roundMoney(giftDiscount + total);
    else couponDiscount = roundMoney(couponDiscount + total);
    total = 0;
  }

  return {
    subtotal: sub,
    delivery_fee: fee,
    coupon: coupon
      ? {
          id: coupon.id,
          code: coupon.code,
          description: coupon.description || null,
          discount_type: coupon.discount_type,
          discount_value: Number(coupon.discount_value),
          discount: couponDiscount,
        }
      : null,
    gift_card: gift
      ? {
          id: gift.id,
          code: gift.code,
          value: Number(gift.value),
          remaining_uses: gift.remaining_uses,
          discount: giftDiscount,
        }
      : null,
    coupon_discount: couponDiscount,
    gift_card_discount: giftDiscount,
    discount_total: roundMoney(couponDiscount + giftDiscount),
    total: Math.max(0, total),
    errors,
  };
}

async function reserveRedemptions({ orderId, userId, userEmail, breakdown, status = 'pending' }) {
  const rows = [];
  if (breakdown.coupon) {
    rows.push(['coupon', breakdown.coupon.id, breakdown.coupon.code, breakdown.coupon_discount]);
  }
  if (breakdown.gift_card) {
    rows.push(['gift_card', breakdown.gift_card.id, breakdown.gift_card.code, breakdown.gift_card_discount]);
  }
  for (const [kind, promoId, code, amount] of rows) {
    await run(
      `INSERT INTO promo_redemptions (id, kind, promo_id, code, order_id, user_id, user_email, discount_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), kind, promoId, code, orderId, userId || null, normalizeEmail(userEmail) || null, amount, status]
    );
  }
}

async function markRedemptionsApplied(orderId) {
  await run(
    "UPDATE promo_redemptions SET status = 'applied' WHERE order_id = ? AND status = 'pending'",
    [orderId]
  );
}

async function releaseRedemptions(orderId) {
  await run(
    "UPDATE promo_redemptions SET status = 'released' WHERE order_id = ? AND status = 'pending'",
    [orderId]
  );
}

async function deleteRedemptionsForOrder(orderId) {
  await run('DELETE FROM promo_redemptions WHERE order_id = ?', [orderId]);
}

/** Gift cards addressed to this account that still have uses left. */
async function listAvailableGiftCards(userEmail) {
  const email = normalizeEmail(userEmail);
  if (!email) return [];
  const rows = await all(
    `SELECT id, code, value, max_uses, min_cart_value, expires_at, note
     FROM gift_cards WHERE LOWER(recipient_email) = ? AND active = 1
     ORDER BY created_at DESC`,
    [email]
  );
  const today = todayIST();
  const out = [];
  for (const row of rows) {
    const expires = dateOnly(row.expires_at);
    if (expires && today > expires) continue;
    const used = await countActiveUses('gift_card', row.id);
    const remaining = Number(row.max_uses) - used;
    if (remaining <= 0) continue;
    out.push({
      code: row.code,
      value: Number(row.value),
      remaining_uses: remaining,
      max_uses: Number(row.max_uses),
      min_cart_value: Number(row.min_cart_value) || 0,
      expires_at: expires,
      note: row.note || null,
    });
  }
  return out;
}

module.exports = {
  RESERVATION_MINUTES,
  CODE_RE,
  promoError,
  normalizeCode,
  normalizeEmail,
  roundMoney,
  parseEmailList,
  parseStoredEmails,
  parseOptionalDate,
  parseMoney,
  parseOptionalInt,
  parseBool,
  dateOnly,
  todayIST,
  generateUniqueGiftCardCode,
  countActiveUses,
  computePromotions,
  reserveRedemptions,
  markRedemptionsApplied,
  releaseRedemptions,
  deleteRedemptionsForOrder,
  listAvailableGiftCards,
};

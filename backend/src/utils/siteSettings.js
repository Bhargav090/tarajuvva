const { get, run } = require('../db/database');

const REIMAGINE_CUSTOMIZE_DEFAULTS = {
  reimagine_customize_price: '299',
  reimagine_customize_feature: '15 min consultation call',
  reimagine_customize_description:
    'Book a one-on-one call with our remake team. Show us your garment, share references, and get a clear plan — fit, fabric, timeline, and quote — before we cut a single thread.',
};

const DELIVERY_FEES_KEY = 'delivery_fees';

const DELIVERY_FEES_DEFAULTS = {
  shop: { hyderabad: 99, outside: 249 },
  reimagine: { hyderabad: 399, outside: 149 },
};

function normalizeFee(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(n);
}

function normalizeDeliveryFees(raw) {
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }
  const shop = parsed?.shop || {};
  const reimagine = parsed?.reimagine || {};
  return {
    shop: {
      hyderabad: normalizeFee(shop.hyderabad, DELIVERY_FEES_DEFAULTS.shop.hyderabad),
      outside: normalizeFee(shop.outside, DELIVERY_FEES_DEFAULTS.shop.outside),
    },
    reimagine: {
      hyderabad: normalizeFee(reimagine.hyderabad, DELIVERY_FEES_DEFAULTS.reimagine.hyderabad),
      outside: normalizeFee(reimagine.outside, DELIVERY_FEES_DEFAULTS.reimagine.outside),
    },
  };
}

async function getSetting(key, fallback = null) {
  const row = await get('SELECT setting_value FROM site_settings WHERE setting_key = ?', [key]);
  if (!row) return fallback;
  return row.setting_value;
}

async function setSetting(key, value) {
  await run(
    `INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
    [key, String(value)]
  );
}

async function getReimagineCustomizeSettings() {
  const price = Number(await getSetting('reimagine_customize_price', REIMAGINE_CUSTOMIZE_DEFAULTS.reimagine_customize_price));
  return {
    price: Number.isFinite(price) && price >= 0 ? price : 299,
    feature: (await getSetting('reimagine_customize_feature', REIMAGINE_CUSTOMIZE_DEFAULTS.reimagine_customize_feature)) || REIMAGINE_CUSTOMIZE_DEFAULTS.reimagine_customize_feature,
    description:
      (await getSetting('reimagine_customize_description', REIMAGINE_CUSTOMIZE_DEFAULTS.reimagine_customize_description)) ||
      REIMAGINE_CUSTOMIZE_DEFAULTS.reimagine_customize_description,
  };
}

async function saveReimagineCustomizeSettings({ price, feature, description }) {
  const priceNum = Number(price);
  if (!Number.isFinite(priceNum) || priceNum < 0) {
    const err = new Error('Valid price is required');
    err.status = 400;
    throw err;
  }
  if (!String(feature || '').trim()) {
    const err = new Error('Feature title is required');
    err.status = 400;
    throw err;
  }
  await setSetting('reimagine_customize_price', String(Math.round(priceNum)));
  await setSetting('reimagine_customize_feature', String(feature).trim());
  await setSetting('reimagine_customize_description', String(description || '').trim());
  return getReimagineCustomizeSettings();
}

async function ensureDefaultReimagineCustomizeSettings() {
  for (const [key, value] of Object.entries(REIMAGINE_CUSTOMIZE_DEFAULTS)) {
    const existing = await get('SELECT setting_key FROM site_settings WHERE setting_key = ?', [key]);
    if (!existing) await setSetting(key, value);
  }
}

async function getDeliverySettings() {
  const raw = await getSetting(DELIVERY_FEES_KEY, null);
  if (!raw) return { ...DELIVERY_FEES_DEFAULTS, shop: { ...DELIVERY_FEES_DEFAULTS.shop }, reimagine: { ...DELIVERY_FEES_DEFAULTS.reimagine } };
  return normalizeDeliveryFees(raw);
}

async function saveDeliverySettings(body) {
  const fees = normalizeDeliveryFees(body);
  // Reject incomplete payloads so we don't silently fall back to defaults on bad admin input
  const required = [
    body?.shop?.hyderabad,
    body?.shop?.outside,
    body?.reimagine?.hyderabad,
    body?.reimagine?.outside,
  ];
  for (const value of required) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      const err = new Error('All delivery fees must be valid non-negative numbers');
      err.status = 400;
      throw err;
    }
  }
  await setSetting(DELIVERY_FEES_KEY, JSON.stringify(fees));
  return fees;
}

async function ensureDefaultDeliverySettings() {
  const existing = await get('SELECT setting_key FROM site_settings WHERE setting_key = ?', [DELIVERY_FEES_KEY]);
  if (!existing) await setSetting(DELIVERY_FEES_KEY, JSON.stringify(DELIVERY_FEES_DEFAULTS));
}

module.exports = {
  REIMAGINE_CUSTOMIZE_DEFAULTS,
  DELIVERY_FEES_DEFAULTS,
  getSetting,
  setSetting,
  getReimagineCustomizeSettings,
  saveReimagineCustomizeSettings,
  ensureDefaultReimagineCustomizeSettings,
  getDeliverySettings,
  saveDeliverySettings,
  ensureDefaultDeliverySettings,
};

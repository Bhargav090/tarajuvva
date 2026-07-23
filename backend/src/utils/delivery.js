/** Delivery zones & fee helpers. Fee amounts live in site_settings (admin-configurable). */

const { getDeliverySettings, DELIVERY_FEES_DEFAULTS } = require('./siteSettings');

const DELIVERY_ZONES = {
  HYDERABAD: 'hyderabad',
  OUTSIDE: 'outside',
};

const DELIVERY_ZONE_LABELS = {
  [DELIVERY_ZONES.HYDERABAD]: 'Hyderabad & around',
  [DELIVERY_ZONES.OUTSIDE]: 'Outside Hyderabad',
};

function isValidDeliveryZone(zone) {
  return zone === DELIVERY_ZONES.HYDERABAD || zone === DELIVERY_ZONES.OUTSIDE;
}

/** Sync lookup against a fees table (defaults if omitted). */
function getDeliveryFeeFromTable(channel, zone, fees = DELIVERY_FEES_DEFAULTS) {
  if (!isValidDeliveryZone(zone)) return 0;
  const table = fees?.[channel];
  return Number(table?.[zone]) || 0;
}

/** Async — loads current admin-configured fees from site_settings. */
async function getDeliveryFee(channel, zone) {
  if (!isValidDeliveryZone(zone)) return 0;
  const fees = await getDeliverySettings();
  return getDeliveryFeeFromTable(channel, zone, fees);
}

function normalizeDeliveryZone(raw) {
  const zone = String(raw || '').trim().toLowerCase();
  return isValidDeliveryZone(zone) ? zone : null;
}

module.exports = {
  DELIVERY_ZONES,
  DELIVERY_FEES: DELIVERY_FEES_DEFAULTS,
  DELIVERY_ZONE_LABELS,
  isValidDeliveryZone,
  getDeliveryFee,
  getDeliveryFeeFromTable,
  normalizeDeliveryZone,
};

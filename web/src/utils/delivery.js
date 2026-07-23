/** Delivery zones & fee helpers. Amounts come from admin settings; defaults match backend seed. */

export const DELIVERY_ZONES = {
  HYDERABAD: 'hyderabad',
  OUTSIDE: 'outside',
};

export const DELIVERY_ZONE_OPTIONS = [
  {
    value: DELIVERY_ZONES.HYDERABAD,
    label: 'Hyderabad & around',
    hint: 'Within Hyderabad metro / surrounding areas',
  },
  {
    value: DELIVERY_ZONES.OUTSIDE,
    label: 'Outside Hyderabad',
    hint: 'Rest of India',
  },
];

export const DELIVERY_FEES = {
  shop: {
    [DELIVERY_ZONES.HYDERABAD]: 99,
    [DELIVERY_ZONES.OUTSIDE]: 249,
  },
  reimagine: {
    [DELIVERY_ZONES.HYDERABAD]: 399,
    [DELIVERY_ZONES.OUTSIDE]: 149,
  },
};

export const DELIVERY_ZONE_LABELS = {
  [DELIVERY_ZONES.HYDERABAD]: 'Hyderabad & around',
  [DELIVERY_ZONES.OUTSIDE]: 'Outside Hyderabad',
};

export function isValidDeliveryZone(zone) {
  return zone === DELIVERY_ZONES.HYDERABAD || zone === DELIVERY_ZONES.OUTSIDE;
}

/**
 * @param {'shop' | 'reimagine'} channel
 * @param {string} zone
 * @param {typeof DELIVERY_FEES} [fees]
 */
export function getDeliveryFee(channel, zone, fees = DELIVERY_FEES) {
  if (!isValidDeliveryZone(zone)) return 0;
  const table = fees?.[channel] ?? DELIVERY_FEES[channel];
  return Number(table?.[zone]) || 0;
}

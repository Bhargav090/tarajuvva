const sharp = require('sharp');

/** Longest edge for product card / grid WebP variants. */
const CARD_MAX_EDGE = 900;
const CARD_WEBP_QUALITY = 78;

/**
 * Build a card-sized WebP buffer from an image buffer.
 * @param {Buffer} buffer
 * @returns {Promise<Buffer>}
 */
async function toCardWebp(buffer) {
  if (!buffer?.length) {
    const err = new Error('Empty image buffer');
    err.status = 400;
    throw err;
  }
  return sharp(buffer, { failOn: 'none' })
    .rotate()
    .resize({
      width: CARD_MAX_EDGE,
      height: CARD_MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: CARD_WEBP_QUALITY, effort: 4 })
    .toBuffer();
}

/**
 * Sibling card key/path for a product original.
 * products/uuid.jpg → products/uuid.card.webp
 * /uploads/products/uuid.jpg → /uploads/products/uuid.card.webp
 */
function cardSiblingPath(originalPathOrKey) {
  const v = String(originalPathOrKey || '').trim();
  if (!v) return null;
  if (/\.card\.webp$/i.test(v)) return v;
  if (!/\/products\//i.test(v) && !/^products\//i.test(v)) return null;
  const next = v.replace(/\.[a-z0-9]+$/i, '.card.webp');
  return next === v ? null : next;
}

module.exports = {
  CARD_MAX_EDGE,
  CARD_WEBP_QUALITY,
  toCardWebp,
  cardSiblingPath,
};

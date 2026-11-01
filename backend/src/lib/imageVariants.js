const sharp = require('sharp');

/** Longest edge for product card / grid WebP variants. */
const CARD_MAX_EDGE = 900;
const CARD_WEBP_QUALITY = 78;

/** Longest edge for product detail / gallery WebP variants. */
const GALLERY_MAX_EDGE = 1600;
const GALLERY_WEBP_QUALITY = 80;

/**
 * Resize + encode a WebP variant from an image buffer.
 * @param {Buffer} buffer
 * @param {{ maxEdge: number, quality: number }} opts
 * @returns {Promise<Buffer>}
 */
async function toWebpVariant(buffer, { maxEdge, quality }) {
  if (!buffer?.length) {
    const err = new Error('Empty image buffer');
    err.status = 400;
    throw err;
  }
  return sharp(buffer, { failOn: 'none' })
    .rotate()
    .resize({
      width: maxEdge,
      height: maxEdge,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality, effort: 4 })
    .toBuffer();
}

/**
 * Build a card-sized WebP buffer from an image buffer.
 * @param {Buffer} buffer
 * @returns {Promise<Buffer>}
 */
async function toCardWebp(buffer) {
  return toWebpVariant(buffer, { maxEdge: CARD_MAX_EDGE, quality: CARD_WEBP_QUALITY });
}

/**
 * Build a gallery/detail-sized WebP buffer from an image buffer.
 * @param {Buffer} buffer
 * @returns {Promise<Buffer>}
 */
async function toGalleryWebp(buffer) {
  return toWebpVariant(buffer, { maxEdge: GALLERY_MAX_EDGE, quality: GALLERY_WEBP_QUALITY });
}

/**
 * Sibling variant key/path for a product original.
 * products/uuid.jpg → products/uuid.card.webp | products/uuid.gallery.webp
 */
function variantSiblingPath(originalPathOrKey, variant) {
  const v = String(originalPathOrKey || '').trim();
  if (!v) return null;
  if (!/\/products\//i.test(v) && !/^products\//i.test(v)) return null;
  const suffix = `.${variant}.webp`;
  if (new RegExp(`\\.${variant}\\.webp$`, 'i').test(v)) return v;
  if (/\.card\.webp$/i.test(v)) return v.replace(/\.card\.webp$/i, suffix);
  if (/\.gallery\.webp$/i.test(v)) return v.replace(/\.gallery\.webp$/i, suffix);
  const next = v.replace(/\.[a-z0-9]+$/i, suffix);
  return next === v ? null : next;
}

function cardSiblingPath(originalPathOrKey) {
  return variantSiblingPath(originalPathOrKey, 'card');
}

function gallerySiblingPath(originalPathOrKey) {
  return variantSiblingPath(originalPathOrKey, 'gallery');
}

module.exports = {
  CARD_MAX_EDGE,
  CARD_WEBP_QUALITY,
  GALLERY_MAX_EDGE,
  GALLERY_WEBP_QUALITY,
  toCardWebp,
  toGalleryWebp,
  cardSiblingPath,
  gallerySiblingPath,
  variantSiblingPath,
};

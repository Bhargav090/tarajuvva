import { uploadUrl } from './uploadUrl';

/** Fallback when a product has no usable image string. */
export const PRODUCT_IMAGE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&q=80';

/**
 * Sibling WebP path for a product original.
 * products/uuid.jpg → products/uuid.card.webp | products/uuid.gallery.webp
 * (also works for /uploads/products/... and https CDN URLs)
 */
function toProductVariantPath(src, variant) {
  if (!src || typeof src !== 'string') return '';
  if (/^data:image\//i.test(src)) return '';
  const suffix = `.${variant}.webp`;
  if (new RegExp(`\\.${variant}\\.webp($|\\?)`, 'i').test(src)) return src;
  // Only rewrite product originals (disk or S3)
  if (!/\/products\//i.test(src) && !/^s3:\/\/products\//i.test(src)) return '';
  if (/\.card\.webp($|\?)/i.test(src)) {
    return src.replace(/\.card\.webp($|\?)/i, `${suffix}$1`);
  }
  if (/\.gallery\.webp($|\?)/i.test(src)) {
    return src.replace(/\.gallery\.webp($|\?)/i, `${suffix}$1`);
  }
  return src.replace(/\.[a-z0-9]+($|\?)/i, `${suffix}$1`);
}

export function toProductCardPath(src) {
  return toProductVariantPath(src, 'card');
}

export function toProductGalleryPath(src) {
  return toProductVariantPath(src, 'gallery');
}

function resolveVariantSrc(src, toPath) {
  const full = resolveProductImageSrc(src);
  if (!full) return '';
  const variantPath = toPath(full);
  if (!variantPath) return '';
  if (/^https?:\/\//i.test(variantPath) || /^data:image\//i.test(variantPath)) return variantPath;
  return uploadUrl(variantPath);
}

/** Resolve stored product image ref for <img src> (full original). */
export function resolveProductImageSrc(src) {
  if (!src || typeof src !== 'string') return '';
  if (/^data:image\//i.test(src) || /^https?:\/\//i.test(src)) return src;
  return uploadUrl(src);
}

/**
 * Card-sized WebP for grids/carousels. Falls back to empty string when no
 * sibling convention applies (caller should use original as fallbackSrc).
 */
export function resolveProductCardSrc(src) {
  return resolveVariantSrc(src, toProductCardPath);
}

/**
 * Gallery/detail WebP for product pages (~1600px). Empty when convention
 * does not apply — caller should fall back to card, then original.
 */
export function resolveProductGallerySrc(src) {
  return resolveVariantSrc(src, toProductGalleryPath);
}

/**
 * Best display URL for the PDP main image: card → gallery → original.
 * Card is preferred first because those siblings already exist in production.
 */
export function resolveProductDisplaySrc(src) {
  return (
    resolveProductCardSrc(src) ||
    resolveProductGallerySrc(src) ||
    resolveProductImageSrc(src) ||
    ''
  );
}

/**
 * First gallery entry suitable for <img src> - data URL, https URL, or /uploads path.
 */
export function productHeroImage(images) {
  const u = images?.[0];
  if (typeof u === 'string' && u.length > 0) return resolveProductImageSrc(u);
  return PRODUCT_IMAGE_PLACEHOLDER;
}

/** Card hero for product grids. */
export function productCardHeroImage(images) {
  const u = images?.[0];
  if (typeof u !== 'string' || !u.length) return PRODUCT_IMAGE_PLACEHOLDER;
  return resolveProductCardSrc(u) || resolveProductImageSrc(u) || PRODUCT_IMAGE_PLACEHOLDER;
}

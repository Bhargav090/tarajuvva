import { uploadUrl } from './uploadUrl';

/** Fallback when a product has no usable image string. */
export const PRODUCT_IMAGE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&q=80';

/**
 * Sibling card WebP path for a product original.
 * products/uuid.jpg → products/uuid.card.webp
 * (also works for /uploads/products/... and https CDN URLs)
 */
export function toProductCardPath(src) {
  if (!src || typeof src !== 'string') return '';
  if (/^data:image\//i.test(src)) return '';
  // Already a card variant
  if (/\.card\.webp($|\?)/i.test(src)) return src;
  // Only rewrite product originals (disk or S3)
  if (!/\/products\//i.test(src) && !/^s3:\/\/products\//i.test(src)) return '';
  return src.replace(/\.[a-z0-9]+($|\?)/i, '.card.webp$1');
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
  const full = resolveProductImageSrc(src);
  if (!full) return '';
  const cardPath = toProductCardPath(full);
  if (!cardPath) return '';
  if (/^https?:\/\//i.test(cardPath) || /^data:image\//i.test(cardPath)) return cardPath;
  return uploadUrl(cardPath);
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

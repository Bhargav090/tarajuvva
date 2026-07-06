import { uploadUrl } from './uploadUrl';

/** Fallback when a product has no usable image string. */
export const PRODUCT_IMAGE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&q=80';

/** Resolve stored product image ref for <img src>. */
export function resolveProductImageSrc(src) {
  if (!src || typeof src !== 'string') return '';
  if (/^data:image\//i.test(src) || /^https?:\/\//i.test(src)) return src;
  return uploadUrl(src);
}

/**
 * First gallery entry suitable for <img src> — data URL, https URL, or /uploads path.
 */
export function productHeroImage(images) {
  const u = images?.[0];
  if (typeof u === 'string' && u.length > 0) return resolveProductImageSrc(u);
  return PRODUCT_IMAGE_PLACEHOLDER;
}

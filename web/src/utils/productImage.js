/** Fallback when a product has no usable image string. */
export const PRODUCT_IMAGE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&q=80';

/**
 * First gallery entry suitable for <img src> — data URL, https URL, or /uploads path.
 */
export function productHeroImage(images) {
  const u = images?.[0];
  if (typeof u === 'string' && u.length > 0) return u;
  return PRODUCT_IMAGE_PLACEHOLDER;
}

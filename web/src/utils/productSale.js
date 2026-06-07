/** Discount vs original_price (0 if no valid original). */
export function productDiscountPercent(product) {
  const original = Number(product?.original_price);
  const price = Number(product?.price);
  if (!original || original <= 0 || Number.isNaN(price) || price >= original) return 0;
  return Math.round(((original - price) / original) * 100);
}

/** True when original_price exists and discount is >= minPercent (default 50%). */
export function isSaleProduct(product, minPercent = 50) {
  return productDiscountPercent(product) >= minPercent;
}

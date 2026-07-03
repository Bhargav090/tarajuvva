export const LETTER_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
export const NUMERIC_SIZES = ['28', '30', '32', '34', '36', '38', '40', '42', '44', '46'];

export const SIZE_CHART_OPTIONS = [
  { key: 'letter_top', label: 'Letter sizes · Top', sizeType: 'letter', garmentType: 'top' },
  { key: 'letter_bottom', label: 'Letter sizes · Bottom', sizeType: 'letter', garmentType: 'bottom' },
  { key: 'numeric_top', label: 'Numeric sizes · Top', sizeType: 'numeric', garmentType: 'top' },
  { key: 'numeric_bottom', label: 'Numeric sizes · Bottom', sizeType: 'numeric', garmentType: 'bottom' },
];

export function chartKey(sizeType, garmentType) {
  if (!sizeType || !garmentType) return null;
  return `${sizeType}_${garmentType}`;
}

export function inferGarmentType(category) {
  const c = String(category || '').toLowerCase();
  if (c.includes('bottom')) return 'bottom';
  return 'top';
}

export function inferSizeType(product) {
  if (product?.size_type === 'letter' || product?.size_type === 'numeric') {
    return product.size_type;
  }
  const first = product?.sizes?.[0]?.label;
  if (first && /^\d{1,2}$/.test(String(first))) return 'numeric';
  if (Array.isArray(product?.sizes) && product.sizes.length > 0) return 'letter';
  return null;
}

/** Chart key for a product — uses saved fields or infers from sizes + category. */
export function resolveChartKey(product) {
  const sizeType = inferSizeType(product);
  const garmentType = product?.garment_type || inferGarmentType(product?.category);
  return chartKey(sizeType, garmentType);
}

/**
 * Public URL for a product page. The API sends seo.path (/shop/<type>/<slug>); older cached data
 * without it uses /shop/<slug-or-id>, which the product page then swaps for the full URL.
 */
export function productPath(product) {
  if (!product) return '/shop';
  if (product.seo?.path) return product.seo.path;
  const key = product.slug || product.id;
  return key ? `/shop/${encodeURIComponent(key)}` : '/shop';
}

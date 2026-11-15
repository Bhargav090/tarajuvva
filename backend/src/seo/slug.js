/** URL slugs for product pages: lowercase ASCII words joined by hyphens. */

const MAX_SLUG_LENGTH = 80;

function slugify(value) {
  const slug = String(value || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length <= MAX_SLUG_LENGTH) return slug;
  return slug.slice(0, MAX_SLUG_LENGTH).replace(/-[^-]*$/, '') || slug.slice(0, MAX_SLUG_LENGTH);
}

function isValidSlug(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value || '')) && String(value).length <= MAX_SLUG_LENGTH;
}

/**
 * Returns `base`, or `base-2`, `base-3`… — the first candidate `isTaken` rejects.
 * `isTaken` is async so callers can check both products.slug and slug aliases.
 */
async function uniqueSlug(base, isTaken) {
  const root = base || 'product';
  if (!(await isTaken(root))) return root;
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${root}-${n}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error(`Could not find a free slug for "${root}"`);
}

module.exports = { slugify, isValidSlug, uniqueSlug, MAX_SLUG_LENGTH };

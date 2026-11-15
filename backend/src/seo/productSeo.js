/**
 * Search metadata for a product: title, H1, meta description and canonical path.
 * An admin-entered meta_description wins; otherwise it is derived from the catalog.
 */
const { SITE, BRAND } = require('./site');
const { slugify } = require('./slug');

const META_DESCRIPTION_MAX = 155;

const CATEGORY_LABELS = {
  tops: 'Top',
  bottoms: 'Bottoms',
  outerwear: 'Outerwear',
  accessories: 'Accessory',
  'co-ords': 'Co-ord Set',
};

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function categoryLabel(category) {
  const key = clean(category).toLowerCase();
  return CATEGORY_LABELS[key] || clean(category) || 'Clothing';
}

/**
 * Product descriptions use "|" or blank lines between blocks and a "Fabric: …" line.
 * Returns the prose paragraphs and the fabric line separately.
 */
function parseDescription(description) {
  const blocks = String(description || '')
    .split(/\|/)
    .flatMap((part) => part.split(/\n\s*\n/))
    .map((part) => part.trim())
    .filter(Boolean);
  const paragraphs = [];
  let fabric = null;
  for (const block of blocks) {
    const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean);
    const prose = [];
    for (const line of lines) {
      const m = line.match(/^fabric\s*:\s*(.+)$/i);
      if (m) fabric = clean(m[1]);
      else prose.push(line);
    }
    if (prose.length) paragraphs.push(prose.join(' '));
  }
  return { paragraphs, fabric };
}

/** Trim to `max` chars, preferring a sentence end, then a word boundary (with an ellipsis). */
function truncateText(text, max = META_DESCRIPTION_MAX) {
  const s = clean(text);
  if (s.length <= max) return s;
  const slice = s.slice(0, max);
  const sentenceEnd = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
  if (sentenceEnd >= max * 0.6) return slice.slice(0, sentenceEnd + 1);
  const wordEnd = s.slice(0, max - 1).replace(/\s+\S*$/, '').replace(/[\s,;:–—-]+$/, '');
  return `${wordEnd}…`;
}

/** URL segment for a product type: "Bottoms" → "bottoms", "Co-ords" → "co-ords". */
function categorySlug(category) {
  return slugify(category) || 'products';
}

/** /shop/<type>/<slug>, e.g. /shop/bottoms/lungi-eh. Falls back to the id before a slug exists. */
function productPath(product) {
  const key = clean(product?.slug) || clean(product?.id);
  return `/shop/${categorySlug(product?.category)}/${encodeURIComponent(key)}`;
}

function buildProductSeo(product) {
  // Admins write descriptive product names; the name is the title and the heading as-is.
  const name = clean(product?.name) || 'Product';
  const label = categoryLabel(product?.category);
  const { paragraphs, fabric } = parseDescription(product?.description);
  const path = productPath(product);

  const title = `${name} | ${BRAND} Shop`;
  const h1 = name;

  let description = clean(product?.meta_description);
  if (!description) {
    const lead = paragraphs[0] || '';
    // The name leads every auto description, so products sharing copy still get unique snippets.
    let text;
    if (lead) {
      text = `${name} – ${label}. ${lead}`;
    } else {
      text = `${name} – ${label} by ${BRAND}. Handmade in Hyderabad and delivered across India.`;
    }
    if (fabric && text.length + fabric.length + 10 <= META_DESCRIPTION_MAX) {
      text = `${text.replace(/\s*$/, '')} Fabric: ${fabric}.`;
    }
    description = truncateText(text);
  } else {
    description = truncateText(description);
  }

  return {
    title,
    h1,
    description,
    categoryLabel: label,
    path,
    canonical: `${SITE}${path}`,
    imageAlt: `${name} – ${label} by ${BRAND}`,
    paragraphs,
    fabric,
  };
}

module.exports = {
  buildProductSeo,
  parseDescription,
  truncateText,
  productPath,
  categorySlug,
  categoryLabel,
  META_DESCRIPTION_MAX,
};

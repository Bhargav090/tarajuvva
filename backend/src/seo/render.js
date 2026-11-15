/**
 * Server-rendered SEO HTML for public pages.
 *
 * Takes the built SPA shell (web/dist/index.html) and fills two marked regions:
 *   <!--seo-head-->…<!--/seo-head-->   title, description, canonical, Open Graph, JSON-LD
 *   <!--seo-body-->                     static page copy inside #root (React replaces it on mount)
 * Crawlers that do not run JavaScript get a real H1, copy and links; browsers get the app as before.
 */
const fs = require('fs');
const path = require('path');
const {
  SITE,
  BRAND,
  CONTACT_EMAIL,
  SOCIAL_LINKS,
  DEFAULT_OG_IMAGE,
  SITE_NAV,
  FAQ,
} = require('./site');
const { buildProductSeo, categoryLabel } = require('./productSeo');
const { shareImageUrl, SHARE_WIDTH, SHARE_HEIGHT } = require('./shareImage');

const HEAD_RE = /<!--seo-head-->[\s\S]*?<!--\/seo-head-->/;
const BODY_MARKER = '<!--seo-body-->';

// ─── Template ────────────────────────────────────────────────────────────────

function templateCandidates() {
  return [
    process.env.WEB_DIST_DIR && path.join(process.env.WEB_DIST_DIR, 'index.html'),
    '/var/www/html/index.html',
    path.join(__dirname, '../../../web/dist/index.html'),
  ].filter(Boolean);
}

let templateCache = { file: null, mtimeMs: 0, html: null };

/** Built SPA index.html, re-read whenever a deploy replaces it. Null when none is found. */
function loadTemplate() {
  for (const file of templateCandidates()) {
    let stat;
    try {
      stat = fs.statSync(file);
    } catch {
      continue;
    }
    if (templateCache.file !== file || templateCache.mtimeMs !== stat.mtimeMs) {
      templateCache = { file, mtimeMs: stat.mtimeMs, html: fs.readFileSync(file, 'utf8') };
    }
    return templateCache.html;
  }
  return null;
}

/** False for a template built before the SEO markers existed (mid-deploy). */
function templateHasMarkers(html) {
  return Boolean(html && HEAD_RE.test(html) && html.includes(BODY_MARKER));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function absoluteUrl(href) {
  if (!href) return '';
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith('/')) return `${SITE}${href}`;
  return '';
}

function canonicalFor(pathname) {
  return pathname === '/' ? `${SITE}/` : `${SITE}${pathname}`;
}

function money(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return '';
  return `₹${num.toLocaleString('en-IN')}`;
}

function jsonLdScript(data) {
  // Escape "<" so catalog text can never close the script tag.
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}

function productImage(product) {
  const first = (product.images || []).find((src) => typeof src === 'string' && !src.startsWith('data:'));
  return absoluteUrl(first);
}

// ─── Head ────────────────────────────────────────────────────────────────────

function buildHead({ title, description, canonical, ogType = 'website', image, noindex = false, jsonLd = [] }) {
  const img = image || DEFAULT_OG_IMAGE;
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    noindex ? '<meta name="robots" content="noindex" />' : '',
    canonical ? `<link rel="canonical" href="${esc(canonical)}" />` : '',
    `<meta property="og:site_name" content="${BRAND}" />`,
    `<meta property="og:type" content="${esc(ogType)}" />`,
    canonical ? `<meta property="og:url" content="${esc(canonical)}" />` : '',
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:image" content="${esc(img.url)}" />`,
    img.width ? `<meta property="og:image:width" content="${img.width}" />` : '',
    img.height ? `<meta property="og:image:height" content="${img.height}" />` : '',
    img.alt ? `<meta property="og:image:alt" content="${esc(img.alt)}" />` : '',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(img.url)}" />`,
    ...jsonLd.map(jsonLdScript),
  ].filter(Boolean);
  return `<!--seo-head-->\n    ${tags.join('\n    ')}\n    <!--/seo-head-->`;
}

// ─── Body building blocks ────────────────────────────────────────────────────

function siteHeader() {
  const links = SITE_NAV.filter((l) => l.href !== '/sitemap.html')
    .map((l) => `<a href="${l.href}">${esc(l.label)}</a>`)
    .join(' ');
  return `<header class="seo-header"><a class="seo-brand" href="/">${BRAND}</a><nav aria-label="Main">${links}</nav></header>`;
}

function siteFooter() {
  const links = SITE_NAV.map((l) => `<a href="${l.href}">${esc(l.label)}</a>`).join(' · ');
  return `<footer class="seo-footer"><nav aria-label="Footer">${links}</nav><p>${BRAND} · Sainikpuri, Hyderabad · <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p></footer>`;
}

function breadcrumbs(trail) {
  const items = trail
    .map((c, i) =>
      i < trail.length - 1 ? `<li><a href="${c.href}">${esc(c.label)}</a></li>` : `<li aria-current="page">${esc(c.label)}</li>`
    )
    .join('');
  return `<nav class="seo-breadcrumbs" aria-label="Breadcrumb"><ol>${items}</ol></nav>`;
}

function breadcrumbJsonLd(trail) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      item: absoluteUrl(c.href),
    })),
  };
}

function paragraphs(list) {
  return (list || []).map((p) => `<p>${esc(p)}</p>`).join('\n');
}

function itemList(items) {
  if (!items?.length) return '';
  const lis = items
    .map((it) => {
      const label = it.href ? `<a href="${it.href}">${esc(it.label)}</a>` : `<strong>${esc(it.label)}</strong>`;
      return `<li>${label}${it.text ? ` – ${esc(it.text)}` : ''}</li>`;
    })
    .join('');
  return `<ul>${lis}</ul>`;
}

function faqBlock(keys) {
  return (keys || [])
    .map((k) => FAQ[k])
    .filter(Boolean)
    .map((f) => `<h3>${esc(f.q)}</h3>\n<p>${esc(f.a)}</p>`)
    .join('\n');
}

function faqJsonLd(keys) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: keys
      .map((k) => FAQ[k])
      .filter(Boolean)
      .map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

function section({ h2, paragraphs: paras, items, faq }) {
  return [
    `<section>`,
    `<h2>${esc(h2)}</h2>`,
    paragraphs(paras),
    itemList(items),
    faqBlock(faq),
    `</section>`,
  ]
    .filter(Boolean)
    .join('\n');
}

function productLinkItem(product) {
  const seo = buildProductSeo(product);
  return {
    href: seo.path,
    label: product.name,
    text: [seo.categoryLabel, money(product.price)].filter(Boolean).join(', '),
  };
}

const CATEGORY_ORDER = ['Tops', 'Bottoms', 'Co-ords', 'Outerwear', 'Accessories'];

function productsByCategory(products) {
  const groups = new Map();
  for (const p of products) {
    const cat = String(p.category || 'Other').trim() || 'Other';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(p);
  }
  const rank = (c) => {
    const i = CATEGORY_ORDER.indexOf(c);
    return i === -1 ? CATEGORY_ORDER.length : i;
  };
  return [...groups.entries()].sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]));
}

function wrapBody(inner) {
  return `<div class="seo-shell">\n${siteHeader()}\n<main>\n${inner}\n</main>\n${siteFooter()}\n</div>`;
}

function fill(template, head, body) {
  // Function replacers: catalog text may contain "$&"-style sequences.
  return template.replace(HEAD_RE, () => head).replace(BODY_MARKER, () => body);
}

// ─── Pages ───────────────────────────────────────────────────────────────────

function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND,
    url: `${SITE}/`,
    logo: `${SITE}/brand-logo.png`,
    email: CONTACT_EMAIL,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Hyderabad',
      addressRegion: 'Telangana',
      addressCountry: 'IN',
    },
    sameAs: SOCIAL_LINKS,
  };
}

function renderStaticPage(template, pathname, page, products = []) {
  const trail =
    pathname === '/'
      ? null
      : [
          { href: '/', label: 'Home' },
          { href: pathname, label: SITE_NAV.find((l) => l.href === pathname)?.label || page.h1 },
        ];

  const parts = [];
  if (trail) parts.push(breadcrumbs(trail));
  parts.push(`<h1>${esc(page.h1)}</h1>`, paragraphs(page.paragraphs));
  for (const s of page.sections || []) parts.push(section(s));

  if (page.productListByCategory) {
    for (const [cat, list] of productsByCategory(products)) {
      parts.push(section({ h2: cat, items: list.map(productLinkItem) }));
    }
  } else if (page.productListHeading && products.length) {
    const list = products.slice(0, page.productListLimit || 8);
    parts.push(
      section({
        h2: page.productListHeading,
        items: [...list.map(productLinkItem), { href: '/shop', label: 'See the full shop' }],
      })
    );
  }

  const jsonLd = [];
  if (pathname === '/') {
    jsonLd.push(organizationJsonLd(), {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: BRAND,
      url: `${SITE}/`,
    });
  }
  if (trail) jsonLd.push(breadcrumbJsonLd(trail));
  if (page.faqJsonLd) {
    const keys = (page.sections || []).flatMap((s) => s.faq || []);
    jsonLd.push(faqJsonLd(keys));
  }

  const head = buildHead({
    title: page.title,
    description: page.description,
    canonical: canonicalFor(pathname),
    jsonLd,
  });
  return fill(template, head, wrapBody(parts.join('\n')));
}

function isInStock(product) {
  if (Array.isArray(product.sizes) && product.sizes.length) {
    return product.sizes.some((s) => (typeof s.stock === 'number' ? s.stock > 0 : s.available !== false));
  }
  return !(typeof product.stock === 'number' && product.stock <= 0);
}

function renderProductPage(template, product, related = []) {
  const seo = buildProductSeo(product);
  const category = String(product.category || '').trim();
  const trail = [
    { href: '/', label: 'Home' },
    { href: '/shop', label: 'Shop' },
    { href: seo.path, label: product.name },
  ];
  const image = productImage(product);
  const inStock = isInStock(product);
  const sizeLabels = (product.sizes || []).map((s) => s?.label).filter(Boolean);

  const parts = [breadcrumbs(trail), '<article>'];
  if (category) parts.push(`<p class="seo-eyebrow">${esc(category)}</p>`);
  parts.push(`<h1>${esc(seo.h1)}</h1>`);
  parts.push(
    `<p class="seo-price">${esc(money(product.price))}${product.original_price ? ` <s>${esc(money(product.original_price))}</s>` : ''} · ${inStock ? 'In stock' : 'Out of stock'}</p>`
  );
  if (image) {
    parts.push(`<img src="${esc(image)}" alt="${esc(seo.imageAlt)}" loading="eager" decoding="async" />`);
  }
  parts.push(paragraphs(seo.paragraphs.length ? seo.paragraphs : [`${product.name} – ${seo.categoryLabel} by ${BRAND}, handmade in Hyderabad.`]));

  const fitItems = [];
  if (seo.fabric) fitItems.push({ label: 'Fabric', text: seo.fabric });
  if (sizeLabels.length) fitItems.push({ label: 'Sizes', text: sizeLabels.join(', ') });
  if (product.custom_sizing && product.size_type) {
    fitItems.push({ label: 'Custom sizing', text: 'Available – choose Custom and enter your measurements from the size chart.' });
  }
  for (const tag of product.tags || []) fitItems.push({ label: String(tag) });
  if (fitItems.length) parts.push(section({ h2: 'Fabric and fit', items: fitItems }));

  const ways = (product.ways_to_wear || []).map((w) => String(w).trim()).filter(Boolean);
  if (ways.length) parts.push(section({ h2: 'Ways to wear', items: ways.map((w) => ({ label: w })) }));

  const care = String(product.details_and_care || '').split(/\n+/).map((l) => l.trim()).filter(Boolean);
  parts.push(
    section({
      h2: 'Details and care',
      paragraphs: [
        ...care,
        'Every Tarajuvva garment is handmade. Slight variations in colour, weave, texture and finishing are natural and should not be considered defects.',
      ],
    })
  );

  parts.push(
    section({
      h2: 'Keep it in the loop',
      paragraphs: [
        'Every item purchased includes 2 complimentary repairs. When you want a change, our Reimagine service can upcycle it into something new, and when it is done with you, Donate will find it a next life.',
      ],
      items: [
        { href: '/repair', label: 'Repair', text: 'mend it' },
        { href: '/reimagine', label: 'Reimagine', text: 'upcycle it' },
        { href: '/donate', label: 'Donate', text: 'pass it on' },
      ],
    })
  );

  parts.push(section({ h2: 'Frequently asked questions', faq: ['handmade', 'leadTime', 'shipping', 'repairs', 'cancel'] }));

  if (related.length) {
    parts.push(section({ h2: 'You may also like', items: related.map(productLinkItem) }));
  }
  parts.push('</article>');

  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: seo.paragraphs[0] || seo.description,
    sku: String(product.id),
    url: seo.canonical,
    category: category || undefined,
    brand: { '@type': 'Brand', name: BRAND },
    image: (product.images || []).map(absoluteUrl).filter(Boolean).slice(0, 6),
    material: seo.fabric || undefined,
    offers: {
      '@type': 'Offer',
      url: seo.canonical,
      price: Number(product.price),
      priceCurrency: 'INR',
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };

  const head = buildHead({
    title: seo.title,
    description: seo.description,
    canonical: seo.canonical,
    ogType: 'product',
    // Small 1200x630 JPEG (shareImage.js): full-size originals are too heavy for WhatsApp previews.
    image: image ? { url: shareImageUrl(product), width: SHARE_WIDTH, height: SHARE_HEIGHT, alt: seo.imageAlt } : null,
    jsonLd: [productLd, breadcrumbJsonLd(trail)],
  });
  return fill(template, head, wrapBody(parts.join('\n')));
}

function renderNotFound(template, pathname) {
  const head = buildHead({
    title: `Page not found | ${BRAND}`,
    description: 'This page could not be found. Browse the Tarajuvva shop instead.',
    canonical: null,
    noindex: true,
  });
  const body = wrapBody(
    `<h1>Page not found</h1>\n<p>We couldn’t find ${esc(pathname)}.</p>\n${itemList([{ href: '/shop', label: 'Browse the shop' }])}`
  );
  return fill(template, head, body);
}

function renderSitemapPage(template, products) {
  const pages = SITE_NAV.filter((l) => l.href !== '/sitemap.html');
  const body = wrapBody(
    [
      `<h1>${BRAND} sitemap</h1>`,
      section({ h2: 'Pages', items: pages.map((l) => ({ href: l.href, label: l.label })) }),
      ...productsByCategory(products).map(([cat, list]) =>
        section({ h2: `Shop: ${cat}`, items: list.map(productLinkItem) })
      ),
    ].join('\n')
  );
  const head = buildHead({
    title: `Sitemap | ${BRAND}`,
    description: 'Every public page and product on tarajuvva.com.',
    canonical: `${SITE}/sitemap.html`,
  });
  return fill(template, head, body);
}

module.exports = {
  loadTemplate,
  templateHasMarkers,
  renderStaticPage,
  renderProductPage,
  renderNotFound,
  renderSitemapPage,
  canonicalFor,
  categoryLabel,
};

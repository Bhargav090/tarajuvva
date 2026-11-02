#!/usr/bin/env node
/**
 * Post-build: write per-route HTML shells so crawlers see unique canonical/title
 * and can discover every public product URL without executing JavaScript.
 *
 * Runs after `vite build`. During deploy, prefers the local API; falls back to
 * the live site if localhost is unavailable.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '../dist');
const SITE = (process.env.SEO_SITE_ORIGIN || 'https://tarajuvva.com').replace(/\/$/, '');
const API_CANDIDATES = [
  process.env.SEO_API_BASE,
  'http://127.0.0.1:4000/api',
  'http://localhost:4000/api',
  `${SITE}/api`,
].filter(Boolean);

const STATIC_PAGES = [
  {
    path: '/',
    file: 'index.html',
    title: 'Tarajuvva - Circular Fashion OS',
    description:
      'Tarajuvva - A circular fashion system built around your wardrobe. Shop, Reimagine, Repair, Donate.',
  },
  {
    path: '/shop',
    file: 'shop/index.html',
    title: 'Shop | Tarajuvva',
    description: 'Shop circular fashion pieces from Tarajuvva — designed to be worn, repaired, reimagined, and donated.',
  },
  {
    path: '/reimagine',
    file: 'reimagine/index.html',
    title: 'Reimagine | Tarajuvva',
    description: 'Reimagine old garments into something new with Tarajuvva’s circular fashion studio.',
  },
  {
    path: '/repair',
    file: 'repair/index.html',
    title: 'Repair | Tarajuvva',
    description: 'Repair and mend clothing with Tarajuvva — keep pieces in circulation longer.',
  },
  {
    path: '/donate',
    file: 'donate/index.html',
    title: 'Donate | Tarajuvva',
    description: 'Donate garments through Tarajuvva and keep textiles out of landfill.',
  },
  {
    path: '/about',
    file: 'about/index.html',
    title: 'About Us | Tarajuvva',
    description: 'About Tarajuvva — a circular fashion operating system built in India.',
  },
  {
    path: '/help',
    file: 'help/index.html',
    title: 'Help Centre | Tarajuvva',
    description: 'Help and FAQs for shopping, reimagining, repairing, and donating with Tarajuvva.',
  },
];

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function absoluteUrl(pathname) {
  if (!pathname || pathname === '/') return `${SITE}/`;
  return `${SITE}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

async function fetchProducts() {
  let lastErr;
  for (const base of API_CANDIDATES) {
    const url = `${String(base).replace(/\/$/, '')}/shop/products?limit=500`;
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      const products = Array.isArray(data?.products) ? data.products : [];
      console.log(`  products: ${products.length} from ${url}`);
      return products;
    } catch (err) {
      lastErr = err;
      console.warn(`  product fetch failed (${url}): ${err.message}`);
    }
  }
  console.warn(`  continuing without product pages (${lastErr?.message || 'no API'})`);
  return [];
}

function buildCrawlNav(links) {
  const items = links
    .map(({ href, label }) => `      <a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`)
    .join('\n');
  return `<nav id="crawl-nav" aria-label="Site">\n${items}\n    </nav>`;
}

function applyPageMeta(html, { path: pagePath, title, description, crawlNavHtml }) {
  const canonical = absoluteUrl(pagePath);
  let out = html;

  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

  out = out.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(description)}" />`
  );

  if (/rel="canonical"/i.test(out)) {
    out = out.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${escapeHtml(canonical)}" />`
    );
  } else {
    out = out.replace('</head>', `    <link rel="canonical" href="${escapeHtml(canonical)}" />\n  </head>`);
  }

  out = out.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`
  );
  out = out.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${escapeHtml(title)}" />`
  );
  out = out.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtml(description)}" />`
  );
  out = out.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`
  );
  out = out.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`
  );

  out = out.replace(/<nav id="crawl-nav"[\s\S]*?<\/nav>/i, crawlNavHtml);
  return out;
}

function writeHtml(relFile, contents) {
  const abs = path.join(DIST, relFile);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, contents);
}

function buildSitemapHtml(links) {
  const items = links
    .map(
      ({ href, label }) =>
        `    <li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`
    )
    .join('\n');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sitemap | Tarajuvva</title>
    <meta name="description" content="HTML sitemap of public Tarajuvva pages." />
    <link rel="canonical" href="${SITE}/sitemap.html" />
  </head>
  <body>
    <h1>Tarajuvva sitemap</h1>
    <p>Public pages on <a href="${SITE}/">tarajuvva.com</a>.</p>
    <ul>
${items}
    </ul>
  </body>
</html>
`;
}

async function main() {
  const templatePath = path.join(DIST, 'index.html');
  if (!fs.existsSync(templatePath)) {
    console.error(`Missing ${templatePath}. Run vite build first.`);
    process.exit(1);
  }

  console.log('==> Generating SEO HTML shells');
  const template = fs.readFileSync(templatePath, 'utf8');
  const products = await fetchProducts();

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/shop', label: 'Shop' },
    { href: '/reimagine', label: 'Reimagine' },
    { href: '/repair', label: 'Repair' },
    { href: '/donate', label: 'Donate' },
    { href: '/about', label: 'About' },
    { href: '/help', label: 'Help' },
    { href: '/sitemap.html', label: 'HTML Sitemap' },
    { href: '/sitemap.xml', label: 'XML Sitemap' },
    ...products.map((p) => ({
      href: `/shop/${p.id}`,
      label: String(p.name || `Product ${p.id}`).trim() || `Product ${p.id}`,
    })),
  ];
  const crawlNavHtml = buildCrawlNav(navLinks);

  let written = 0;
  for (const page of STATIC_PAGES) {
    const html = applyPageMeta(template, { ...page, crawlNavHtml });
    writeHtml(page.file, html);
    written += 1;
  }

  for (const product of products) {
    const id = String(product.id || '').trim();
    if (!id) continue;
    const name = String(product.name || 'Product').trim() || 'Product';
    const description = String(product.description || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160) || `${name} — shop circular fashion at Tarajuvva.`;
    const html = applyPageMeta(template, {
      path: `/shop/${id}`,
      title: `${name} | Tarajuvva Shop`,
      description,
      crawlNavHtml,
    });
    writeHtml(`shop/${id}/index.html`, html);
    written += 1;
  }

  writeHtml('sitemap.html', buildSitemapHtml(navLinks));
  written += 1;

  console.log(`  wrote ${written} HTML files (${STATIC_PAGES.length} static + ${products.length} products + sitemap.html)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

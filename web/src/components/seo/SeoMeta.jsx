import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../utils/api';

const SITE = 'https://tarajuvva.com';

/** Used for private pages (cart, profile…) and when the meta lookup fails. */
const DEFAULT_META = {
  title: 'Tarajuvva - Circular Fashion OS',
  description:
    'Tarajuvva - A circular fashion system built around your wardrobe. Shop, Reimagine, Repair, Donate.',
};

/** Only these paths have server-rendered SEO pages (backend/src/routes/seoPages.js). */
const PUBLIC_PATH_RE = /^\/(?:shop(?:\/[^/]+){0,2}|reimagine|repair|donate|about|help)?$/;

const metaCache = new Map();

function upsertMeta(selector, attr, key, value) {
  if (!value) return;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function setCanonical(url) {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

function applyMeta({ title, description, canonical }) {
  if (title) {
    document.title = title;
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', title);
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
  }
  if (description) {
    upsertMeta('meta[name="description"]', 'name', 'description', description);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
  }
  if (canonical) {
    setCanonical(canonical);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonical);
  }
}

/**
 * Keeps title/description/canonical in sync on in-app navigations, using the same values the
 * backend renders into the HTML for crawlers (GET /api/seo/meta).
 */
export default function SeoMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    const path = pathname.replace(/\/+$/, '') || '/';
    const fallbackCanonical = path === '/' ? `${SITE}/` : `${SITE}${path}`;

    if (!PUBLIC_PATH_RE.test(path)) {
      applyMeta({ ...DEFAULT_META, canonical: fallbackCanonical });
      return undefined;
    }

    if (metaCache.has(path)) {
      applyMeta(metaCache.get(path));
      return undefined;
    }

    let cancelled = false;
    api
      .get('/seo/meta', { params: { path } })
      .then((res) => {
        const { title, description, canonical } = res.data || {};
        const meta = { title, description, canonical: canonical || fallbackCanonical };
        metaCache.set(path, meta);
        if (!cancelled) applyMeta(meta);
      })
      .catch(() => {
        if (!cancelled) applyMeta({ ...DEFAULT_META, canonical: fallbackCanonical });
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}

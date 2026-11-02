import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../utils/api';

const SITE = 'https://tarajuvva.com';

const STATIC_META = {
  '/': {
    title: 'Tarajuvva - Circular Fashion OS',
    description:
      'Tarajuvva - A circular fashion system built around your wardrobe. Shop, Reimagine, Repair, Donate.',
  },
  '/shop': {
    title: 'Shop | Tarajuvva',
    description:
      'Shop circular fashion pieces from Tarajuvva — designed to be worn, repaired, reimagined, and donated.',
  },
  '/reimagine': {
    title: 'Reimagine | Tarajuvva',
    description: 'Reimagine old garments into something new with Tarajuvva’s circular fashion studio.',
  },
  '/repair': {
    title: 'Repair | Tarajuvva',
    description: 'Repair and mend clothing with Tarajuvva — keep pieces in circulation longer.',
  },
  '/donate': {
    title: 'Donate | Tarajuvva',
    description: 'Donate garments through Tarajuvva and keep textiles out of landfill.',
  },
  '/about': {
    title: 'About Us | Tarajuvva',
    description: 'About Tarajuvva — a circular fashion operating system built in India.',
  },
  '/help': {
    title: 'Help Centre | Tarajuvva',
    description: 'Help and FAQs for shopping, reimagining, repairing, and donating with Tarajuvva.',
  },
};

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
  if (title) document.title = title;
  if (description) {
    upsertMeta('meta[name="description"]', 'name', 'description', description);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
  }
  if (title) {
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', title);
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
  }
  if (canonical) {
    setCanonical(canonical);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonical);
  }
}

/**
 * Keeps title/canonical in sync for JS-capable crawlers and in-app navigations.
 * Static HTML shells from generate-seo-pages.mjs cover non-JS crawlers.
 */
export default function SeoMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    const canonical = pathname === '/' ? `${SITE}/` : `${SITE}${pathname}`;
    const staticMeta = STATIC_META[pathname];

    if (staticMeta) {
      applyMeta({ ...staticMeta, canonical });
      return undefined;
    }

    const productMatch = pathname.match(/^\/shop\/([^/]+)$/);
    if (!productMatch) {
      applyMeta({
        title: 'Tarajuvva - Circular Fashion OS',
        description:
          'Tarajuvva - A circular fashion system built around your wardrobe. Shop, Reimagine, Repair, Donate.',
        canonical,
      });
      return undefined;
    }

    const productId = productMatch[1];
    let cancelled = false;
    applyMeta({
      title: 'Shop | Tarajuvva',
      description: 'Shop circular fashion at Tarajuvva.',
      canonical,
    });

    api
      .get(`/shop/products/${productId}`)
      .then((res) => {
        if (cancelled) return;
        const product = res.data?.product;
        if (!product?.name) return;
        const description = String(product.description || '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 160);
        applyMeta({
          title: `${product.name} | Tarajuvva Shop`,
          description: description || `${product.name} — shop circular fashion at Tarajuvva.`,
          canonical,
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}

/**
 * Copy and metadata for the public pages' server-rendered SEO HTML.
 *
 * All copy here is taken from the live site (page components, Help centre, utils/constants.js).
 * Keep it in step with those pages when the wording there changes.
 */

const SITE = (process.env.SEO_SITE_ORIGIN || 'https://tarajuvva.com').replace(/\/$/, '');
const BRAND = 'Tarajuvva';
const CONTACT_EMAIL = 'contact@tarajuvva.com';
const SOCIAL_LINKS = [
  'https://www.instagram.com/tarajuvvaaa/',
  'https://www.linkedin.com/company/tarajuvva/',
];
const DEFAULT_OG_IMAGE = {
  url: `${SITE}/og-image-1200x630.jpg`,
  width: 1200,
  height: 630,
  alt: 'Tarajuvva logo',
};

/** Shared nav rendered in every SEO shell (also what the audit flagged as missing: contact). */
const SITE_NAV = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' },
  { href: '/reimagine', label: 'Reimagine' },
  { href: '/repair', label: 'Repair' },
  { href: '/donate', label: 'Donate' },
  { href: '/about', label: 'About' },
  { href: '/help', label: 'Help & Contact' },
  { href: '/sitemap.html', label: 'Sitemap' },
];

/** From the Help centre FAQ (web/src/pages/Help/index.jsx). */
const FAQ = {
  handmade: {
    q: 'Are your garments handmade?',
    a: 'Yes. Every Tarajuvva garment is handmade with care by skilled artisans.',
  },
  leadTime: {
    q: 'Why does my order take longer than regular fashion brands?',
    a: 'Many of our garments are made after you place your order, allowing us to reduce waste while maintaining quality.',
  },
  sizes: {
    q: 'What sizes do you offer?',
    a: 'Many of our garments are thoughtfully designed to comfortably fit across two adjacent sizes.',
  },
  customise: {
    q: 'Can I customise a Shop garment?',
    a: 'Some garments may offer customisation options. If you have a specific request, please get in touch with us.',
  },
  reimagine: {
    q: 'What is Reimagine?',
    a: 'Reimagine is our design-led upcycling service that upcycles garments you already own into something entirely new.',
  },
  reimagineAny: {
    q: 'Can I send any garment for Reimagine?',
    a: 'In most cases, yes. We’ll first assess whether your garment is suitable for an upcycle.',
  },
  reimagineTime: {
    q: 'How long does Reimagine take?',
    a: 'The timeline depends on the complexity of your project. We’ll share an estimated completion date after assessing your garment.',
  },
  repairs: {
    q: 'Do you offer repairs?',
    a: 'Yes. Eligible Tarajuvva garments can be repaired under our Repair Policy, and every item purchased includes 2 complimentary repairs.',
  },
  shipping: {
    q: 'Do you ship across India?',
    a: 'Yes, we currently deliver across India. Ready-to-ship products are processed in 2-4 business days and made-to-order garments in 7-14 business days.',
  },
  cancel: {
    q: 'Can I cancel my order?',
    a: 'Orders may be cancelled within 24 hours if production has not yet begun. Once production has started, cancellations may no longer be possible.',
  },
  payment: {
    q: 'What payment methods do you accept?',
    a: 'We accept UPI, debit cards, credit cards, net banking and other secure payment methods available during checkout.',
  },
};

/**
 * Static public pages. `sections` items: { h2, paragraphs?, items?: [{ href?, label, text? }] }.
 * The shop and home pages get product lists appended by the renderer.
 */
const STATIC_PAGES = {
  '/': {
    title: 'Tarajuvva - Circular Fashion OS',
    description:
      'Tarajuvva - A circular fashion system built around your wardrobe. Shop, Reimagine, Repair, Donate.',
    h1: 'Tarajuvva: handmade circular fashion from Hyderabad',
    paragraphs: [
      'At Tarajuvva, we turn wardrobes into ecosystems, where pieces grow with you and outlive seasons.',
      'Tarajuvva is built around keeping clothes in use. Every garment is designed to be worn, reworked, repaired, and recirculated so nothing reaches the end of the line.',
    ],
    sections: [
      {
        h2: 'Four ways to keep clothes in the loop',
        items: [
          {
            href: '/shop',
            label: 'Shop',
            text: 'Reversible, adjustable, or packed with utility loops and playful pockets - garments that adapt with you.',
          },
          {
            href: '/reimagine',
            label: 'Reimagine',
            text: 'Our design-led upcycling service turns garments you already own into something entirely new.',
          },
          {
            href: '/repair',
            label: 'Repair (coming soon)',
            text: "Buttons, hems, holes, hearts. Send us anything that's broken and we'll bring it back - visible repairs encouraged.",
          },
          {
            href: '/donate',
            label: 'Donate (coming soon)',
            text: 'We sort, route to NGOs, repurpose with maker collectives, or recycle yarns. Documented, tracked, no greenwashing.',
          },
        ],
      },
      {
        h2: "Most wardrobes don't have a clothing problem. They have a usage problem.",
        paragraphs: [
          'The average wardrobe has 77 items. Most people regularly wear only 20% of them. We exist to close that gap - through better buying, creative reimagining, and honest repurposing.',
        ],
      },
    ],
    productListHeading: 'From the shop',
    productListLimit: 8,
  },
  '/shop': {
    title: 'Shop Handmade Reversible & Upcycled Clothing | Tarajuvva',
    description:
      'Shop handmade tops, bottoms, jackets and upcycled accessories. Reversible, adjustable pieces in handloom ikat and cotton, delivered across India.',
    h1: 'Shop handmade circular fashion',
    paragraphs: [
      'Reversible, adjustable, or packed with utility loops and playful pockets - garments that adapt with you.',
      'Every Tarajuvva garment is handmade with care by skilled artisans, and many pieces are made only after you place an order to reduce waste. We deliver across India.',
    ],
    sections: [
      { h2: 'Shopping FAQ', faq: ['sizes', 'leadTime', 'shipping', 'repairs'] },
    ],
    productListByCategory: true,
  },
  '/reimagine': {
    title: 'Reimagine: Upcycle Your Old Clothes | Tarajuvva',
    description:
      'Send us a garment you already own and our design-led upcycling service turns it into something entirely new. Pick a base, pick an upcycle, we do the rest.',
    h1: 'Reimagine: upcycle the clothes you already own',
    paragraphs: [
      'Reimagine is our design-led upcycling service that upcycles garments you already own into something entirely new.',
      'Pick a base. Pick an upcycle. We do the cutting, sewing, and slight emotional labour.',
    ],
    sections: [
      {
        h2: 'How Reimagine works',
        paragraphs: [
          'Choose one of our upcycle presets, or book a one-on-one consultation with our remake team to plan a custom piece. We’ll first assess whether your garment is suitable for an upcycle, then share an estimated completion date.',
        ],
      },
      {
        h2: 'Part of the Tarajuvva loop',
        paragraphs: [
          'Reimagine keeps clothes you already love in use. If a garment only needs fixing, Repair can mend it; when it is done with you, Donate finds it a new home.',
        ],
        items: [
          { href: '/repair', label: 'Repair', text: 'fix it first' },
          { href: '/donate', label: 'Donate', text: 'when a garment is done with you' },
        ],
      },
      { h2: 'Reimagine FAQ', faq: ['reimagine', 'reimagineAny', 'reimagineTime', 'shipping'] },
    ],
  },
  '/repair': {
    title: 'Clothing Repair Service (Coming Soon) | Tarajuvva',
    description:
      "Tarajuvva Repair is launching soon: buttons, hems, holes and more, with pan-India pickup and drop. Join the waitlist to be first in line.",
    h1: 'Clothing repair by Tarajuvva (coming soon)',
    paragraphs: [
      "Buttons, hems, holes, hearts. Send us anything that's broken and we'll bring it back - visible repairs encouraged. Launching soon.",
    ],
    sections: [
      {
        h2: 'What to expect',
        items: [
          { label: 'Starting price', text: 'About ₹299.' },
          { label: 'Turnaround', text: '7 days on average.' },
          { label: 'Pickup and drop', text: 'Across India.' },
        ],
      },
      {
        h2: 'Already own a Tarajuvva piece?',
        paragraphs: [
          'Every item purchased from the Tarajuvva shop includes 2 complimentary repairs. Want something changed rather than fixed? Try Reimagine.',
        ],
        items: [{ href: '/reimagine', label: 'Reimagine a garment' }],
      },
      {
        h2: 'Why repair?',
        paragraphs: [
          'The average wardrobe has 77 items. Most people regularly wear only 20% of them. Mending what you already own is the simplest way to keep clothes in use and out of landfill - longevity over landfill.',
          'Repair is one part of the Tarajuvva loop: every garment is designed to be worn, reworked, repaired, and recirculated so nothing reaches the end of the line.',
        ],
        items: [
          { href: '/shop', label: 'Shop', text: 'handmade pieces built to last' },
          { href: '/donate', label: 'Donate', text: 'when a garment is done with you' },
        ],
      },
      { h2: 'Repair FAQ', faq: ['repairs', 'handmade'] },
    ],
  },
  '/donate': {
    title: 'Donate Clothes Responsibly (Coming Soon) | Tarajuvva',
    description:
      'Tarajuvva Donate is launching soon: we route your garments to NGOs, maker collectives or yarn recycling, and tell you where they ended up.',
    h1: 'Donate clothes responsibly (coming soon)',
    paragraphs: [
      'Drop garments at any Tarajuvva pickup point. We sort, route to NGOs, repurpose with maker collectives, or recycle yarns. Documented, tracked, no greenwashing.',
    ],
    sections: [
      {
        h2: 'How donations are handled',
        items: [
          { label: 'Three routes', text: 'Reuse, repair or recycle.' },
          { label: 'Free', text: 'Always.' },
          { label: 'A receipt', text: 'Showing where your garment ended up.' },
        ],
      },
      {
        h2: 'Why it matters',
        paragraphs: [
          'Every year, India discards millions of tonnes of textile waste. Most of it didn’t need to be thrown away.',
          "Most wardrobes don't have a clothing problem. They have a usage problem. The average wardrobe has 77 items, and most people regularly wear only 20% of them.",
          'Donate is the last step of the Tarajuvva loop. Before a garment leaves your wardrobe, it might still have another life: our Repair service can mend it, and Reimagine can upcycle it into something entirely new.',
        ],
        items: [
          { href: '/repair', label: 'Repair', text: 'fix it first' },
          { href: '/reimagine', label: 'Reimagine', text: 'turn it into something new' },
        ],
      },
      {
        h2: 'Want a heads-up at launch?',
        paragraphs: [
          `Join the waitlist on this page, or email ${CONTACT_EMAIL} and we’ll let you know when Donate opens.`,
        ],
      },
      { h2: 'Donate FAQ', faq: ['repairs', 'reimagine'] },
    ],
  },
  '/about': {
    title: 'About Tarajuvva – Circular Fashion Brand from Hyderabad',
    description:
      'Tarajuvva designs modular, reversible clothing in colours that refuse to blend in, from a studio in Sainikpuri, Hyderabad. Longevity over landfill.',
    h1: 'About Tarajuvva',
    paragraphs: [
      'We grew up in homes where a saree got 30 years of love and three afterlives. Then fashion convinced us we needed eight new outfits every festive season.',
      'So we built Tarajuvva - not just to make clothes, but to keep them in motion.',
    ],
    sections: [
      {
        h2: 'Our design philosophy',
        paragraphs: [
          'We got tired of an industry obsessed with short-lived trends and wardrobes full of beige basics.',
          'So we design modular clothing in colours that refuse to blend in, with thoughtful, functional details that let each piece evolve over time. Reversible silhouettes, adjustable features, pockets where you least expect them - clothes that adapt with you.',
          'Longevity over landfill.',
        ],
      },
      {
        h2: 'Our manifesto',
        items: [
          { label: 'Made to Change.', text: 'Every piece is reversible, adjustable, or built to evolve with you.' },
          { label: 'Made with Intention.', text: 'Small batches. Thoughtful production. Nothing made just for the sake of it.' },
          { label: 'Make Less + Make It Count.', text: "We'd rather create fewer pieces you'll keep reaching for than more you'll forget." },
          { label: 'Made to Last.', text: "We'd rather help you wear what you own for years than convince you to buy something new." },
          { label: 'Made to stand out.', text: 'We design in colours that refuse to blend in.' },
        ],
      },
      {
        h2: 'Find us',
        paragraphs: [`Studio: Sainikpuri, Hyderabad. Email: ${CONTACT_EMAIL}.`],
      },
    ],
  },
  '/help': {
    title: 'Help Centre: Shipping, Returns & FAQs | Tarajuvva',
    description:
      'Shipping times, returns and exchanges, payment options and answers to common questions about shopping, Reimagine and repairs at Tarajuvva.',
    h1: 'Help centre: shipping, returns and FAQs',
    paragraphs: [
      'Every Tarajuvva garment is thoughtfully handmade, and many of our pieces are made only after you place an order. This allows us to reduce unnecessary waste while ensuring every garment receives the attention it deserves.',
    ],
    sections: [
      {
        h2: 'Shipping',
        items: [
          { label: 'Ready-to-ship products', text: 'Processed in 2-4 business days.' },
          { label: 'Made-to-order garments', text: 'Processed in 7-14 business days.' },
          { label: 'Delivery within India', text: 'Metro cities 2-5 business days, other locations 4-8 business days.' },
          { label: 'Tracking', text: 'Once your order has been dispatched, you’ll receive a tracking link via email or WhatsApp.' },
        ],
      },
      {
        h2: 'Returns and exchanges',
        paragraphs: [
          'Returns are accepted if you received the wrong product, your order arrived damaged, or there is a manufacturing defect. Please contact us within 48 hours of delivery with clear photographs of the issue.',
        ],
      },
      {
        h2: 'Frequently asked questions',
        faq: ['handmade', 'leadTime', 'sizes', 'customise', 'reimagine', 'reimagineAny', 'reimagineTime', 'repairs', 'shipping', 'cancel', 'payment'],
      },
      {
        h2: 'Contact us',
        paragraphs: [
          `Have a question? Need help choosing a size? Want to discuss a Reimagine project? Email ${CONTACT_EMAIL} or message us on WhatsApp at +91 75699 30438.`,
        ],
      },
    ],
    faqJsonLd: true,
  },
};

const STATIC_PATHS = Object.keys(STATIC_PAGES);

module.exports = {
  SITE,
  BRAND,
  CONTACT_EMAIL,
  SOCIAL_LINKS,
  DEFAULT_OG_IMAGE,
  SITE_NAV,
  FAQ,
  STATIC_PAGES,
  STATIC_PATHS,
};

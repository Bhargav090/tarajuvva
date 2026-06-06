// ─────────────────────────────────────────────────────────────────────────────
// BRAND COLORS  (from official Tarajuvva brand guide)
// Change here → propagates everywhere
// ─────────────────────────────────────────────────────────────────────────────
export const BRAND = {
  // Official palette — bg → 1 primary → 2 secondary → 3 tertiary → accent row
  bg:        '#ffffff',   // background
  bgCard:    '#ffffff',
  bgAlt:     '#f5f5f5',
  primary:   '#a8c74a',   // lime green – SHOP / primary
  secondary: '#4c1b1b',   // burgundy – REIMAGINE
  tertiary:  '#e2a3c9',   // blush pink – accent
  red:       '#e34334',   // warm red – REPAIR
  blue:      '#1b4e81',   // navy – DONATE
  dark:      '#241621',   // plum – text / dark sections
  green:     '#a8c74a',   // alias → primary
  burgundy:  '#4c1b1b',   // alias → secondary
  pink:      '#e2a3c9',   // alias → tertiary
  // Text
  text:      '#241621',   // main body text
  textMuted: 'rgba(36,22,33,0.55)',
  textLight: '#eef4d1',   // text on dark bg
  // Borders
  border:    'rgba(36,22,33,0.12)',
  borderLight: 'rgba(36,22,33,0.08)',
};

// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────
export const NAV_LINKS = [
  { label: 'Shop',      to: '/shop' },
  { label: 'Reimagine', to: '/reimagine' },
  { label: 'Repair',    to: '/repair' },
  { label: 'Donate',    to: '/donate' },
  { label: 'About',     to: '/about' },
];

export const TICKER_MESSAGES = [
  'SHOP THE DROP',
  '10 PIECES, 100 OUTFITS',
  'PIECES THAT DO SIX JOBS',
  'REIMAGINE YOUR WARDROBE',
  'SEND US YOUR OLD — GET BACK YOUR NEW',
  'UPCYCLE INTO MODERN PRESETS',
  'REMAKE OVER REPLACE',
  '2 REPAIRS FREE ON PURCHASE',
];

export const TESTIMONIALS = [
  {
    quote: 'I sent in three sarees. Got back two dresses and a co-ord. My mum cried. Good cry.',
    name: 'Ananya R.',
    city: 'Bengaluru',
  },
  {
    quote: "Their shirt has lasted three years and I've worn it as a top, jacket, and dress. Math checks out.",
    name: 'Vikram T.',
    city: 'Mumbai',
  },
  {
    quote: "First fashion brand that didn't try to lecture me. They just made the cool thing.",
    name: 'Saanvi M.',
    city: 'Delhi',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SHOP
// ─────────────────────────────────────────────────────────────────────────────
export const SHOP_CATEGORIES = [
  { label: 'Everything', value: null },
  { label: 'Tops',       value: 'Tops' },
  { label: 'Bottoms',    value: 'Bottoms' },
  { label: 'Sets',       value: 'Co-ords' },
  { label: 'Dresses',    value: 'Dresses' },
];

export const SORT_OPTIONS = [
  { value: 'newest',     label: 'Sort: newest' },
  { value: 'price_asc',  label: 'Price: low → high' },
  { value: 'price_desc', label: 'Price: high → low' },
];

// ─────────────────────────────────────────────────────────────────────────────
// REIMAGINE
// ─────────────────────────────────────────────────────────────────────────────
export const GARMENTS = [
  {
    id: 'saree',
    label: 'Saree',
    emoji: '🥻',
    desc: 'Six yards of memory. Reimagined.',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?crop=entropy&cs=srgb&fm=jpg&w=900&q=80',
  },
  {
    id: 'kurti',
    label: 'Kurti',
    emoji: '👗',
    desc: 'That kurti you stopped wearing in 2019.',
    image: 'https://images.unsplash.com/photo-1745313452052-0e4e341f326c?crop=entropy&cs=srgb&fm=jpg&w=900&q=80',
  },
  {
    id: 'shirt',
    label: 'Shirt',
    emoji: '👔',
    desc: 'His shirt. Your rules now.',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?crop=entropy&cs=srgb&fm=jpg&w=900&q=80',
  },
  {
    id: 'pant',
    label: 'Pant',
    emoji: '👖',
    desc: 'Old jeans. New plot.',
    image: 'https://images.unsplash.com/photo-1714143136372-ddaf8b606da7?crop=entropy&cs=srgb&fm=jpg&w=900&q=80',
  },
];

export const TRANSFORMATIONS = {
  saree: ['Dress', 'Co-ord Set', 'Blouse + Skirt', 'Cape + Palazzos', 'Custom'],
  kurti: ['Skirt', 'Halter Top', 'Crop Top', 'Peplum Top', 'Custom'],
  shirt: ['Japanese Shirt', 'Corset Back', 'Tote Bag', 'Patchwork', 'Custom'],
  pant:  ['Jorts (Shorts)', 'Flared Pants', 'Skirt', 'Palazzo', 'Custom'],
};

export const REIMAGINE_PRESETS = [
  { from: 'Saree', to: 'Dress / Co-ord',    emoji: '🥻', color: BRAND.burgundy },
  { from: 'Shirt', to: 'Corset / Japanese', emoji: '👔', color: BRAND.green    },
  { from: 'Kurti', to: 'Skirt / Halter',    emoji: '👗', color: BRAND.red      },
  { from: 'Pant',  to: 'Jorts / Flare',     emoji: '👖', color: BRAND.blue     },
];

export const TRANSFORMATION_META = {
  'Dress':              { display: 'Dress', blurb: 'One piece. Many moods.', image: 'https://images.unsplash.com/photo-1595777455730-85bb253e2611?crop=entropy&cs=srgb&fm=jpg&w=900&q=80' },
  'Co-ord Set':         { display: 'Co-ord Set', blurb: 'Matched set. Zero effort.', image: 'https://images.unsplash.com/photo-1496747611176-043222598a21?crop=entropy&cs=srgb&fm=jpg&w=900&q=80' },
  'Blouse + Skirt':     { display: 'Blouse + Skirt', blurb: 'Two pieces from six yards.', image: 'https://images.unsplash.com/photo-1583496664630-893a1907744a?crop=entropy&cs=srgb&fm=jpg&w=900&q=80' },
  'Cape + Palazzos':    { display: 'Cape + Palazzos', blurb: 'Drama meets ease.', image: 'https://images.unsplash.com/photo-1469334031216-e3820b5feb0?crop=entropy&cs=srgb&fm=jpg&w=900&q=80' },
  'Skirt':              { display: 'Skirt', blurb: 'Spin-friendly. Pocket optional.', image: 'https://images.unsplash.com/photo-1583496664630-893a1907744a?crop=entropy&cs=srgb&fm=jpg&w=900&q=80' },
  'Halter Top':         { display: 'Racerback Halter Top', blurb: 'Backless. Strappy. Summer-coded.', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?crop=entropy&cs=srgb&fm=jpg&w=900&q=80' },
  'Crop Top':           { display: 'Crop Top', blurb: 'Short. Sharp. Very now.', image: 'https://images.unsplash.com/photo-1509636319191-0a6ee0c2d471?crop=entropy&cs=srgb&fm=jpg&w=900&q=80' },
  'Peplum Top':         { display: 'Peplum Top', blurb: 'Waist definition without the work.', image: 'https://images.unsplash.com/photo-1434389677669-e08f4a3a558d?crop=entropy&cs=srgb&fm=jpg&w=900&q=80' },
  'Japanese Shirt':     { display: 'Japanese Shirt', blurb: 'Square cut. Dropped shoulder. Big mood.', image: 'https://images.unsplash.com/photo-1596755094515-f0546a4179b?crop=entropy&cs=srgb&fm=jpg&w=900&q=80' },
  'Corset Back':        { display: 'Corset Back', blurb: 'Structured back. Soft front.', image: 'https://images.unsplash.com/photo-1551488831-00f20ec8561d?crop=entropy&cs=srgb&fm=jpg&w=900&q=80' },
  'Tote Bag':           { display: 'Tote Bag', blurb: 'Carry the memory. Literally.', image: 'https://images.unsplash.com/photo-1590874103328-eac95a1961f5?crop=entropy&cs=srgb&fm=jpg&w=900&q=80' },
  'Patchwork':          { display: 'Patchwork', blurb: 'Franken-fit. On purpose.', image: 'https://images.unsplash.com/photo-1558175623-7913d0a99430?crop=entropy&cs=srgb&fm=jpg&w=900&q=80' },
  'Jorts (Shorts)':     { display: 'Jorts', blurb: 'Cutoffs with a conscience.', image: 'https://images.unsplash.com/photo-1542272604-787c683553de?crop=entropy&cs=srgb&fm=jpg&w=900&q=80' },
  'Flared Pants':       { display: 'Flared Pants', blurb: 'Disco is dead. Long live the flare.', image: 'https://images.unsplash.com/photo-1473966960820-9de5768aa532?crop=entropy&cs=srgb&fm=jpg&w=900&q=80' },
  'Palazzo':            { display: 'Palazzo', blurb: 'Wide leg. Full breeze.', image: 'https://images.unsplash.com/photo-1594633312681-426c632e4204?crop=entropy&cs=srgb&fm=jpg&w=900&q=80' },
  'Custom':             { display: 'Custom', blurb: 'Your brief. Our scissors.', image: 'https://images.unsplash.com/photo-1558175623-7913d0a99430?crop=entropy&cs=srgb&fm=jpg&w=900&q=80' },
};

const TRANSFORMATION_IMAGE_FALLBACK =
  'https://images.unsplash.com/photo-1558175623-7913d0a99430?crop=entropy&cs=srgb&fm=jpg&w=900&q=80';

export function getTransformationMeta(name) {
  const meta = TRANSFORMATION_META[name];
  if (meta) return meta;
  return { display: name, blurb: 'Made to your measurements.', image: TRANSFORMATION_IMAGE_FALLBACK };
}

export const REIMAGINE_STEPS = ['Garment', 'Transform', 'Details'];

export const REIMAGINE_FLOW = ['Pick base', 'Pick preset', 'Your details', 'Done'];

export const REIMAGINE_STEP_HEADINGS = [
  'What did you bring us?',
  null, // transform — dynamic per garment
  'Tell us where to send it.',
];

// ─────────────────────────────────────────────────────────────────────────────
// HOME — QUICK DECISION CARDS
// ─────────────────────────────────────────────────────────────────────────────
export const QUICK_CARDS = [
  { icon: 'ShoppingBag', label: 'Buy something new',    action: 'Shop',      to: '/shop',      color: BRAND.green,    desc: 'Curated pieces that tell a story.' },
  { icon: 'Sparkles',    label: 'Rework what I own',    action: 'Reimagine', to: '/reimagine', color: BRAND.burgundy, desc: 'Transform old garments into something new.' },
  { icon: 'Wrench',      label: 'Fix something broken', action: 'Repair',    to: '/repair',    color: BRAND.red,      desc: 'Because throwing away is lazy.' },
  { icon: 'Heart',       label: 'Give something away',  action: 'Donate',    to: '/donate',    color: BRAND.blue,     desc: "Clothes shouldn't end with you." },
];

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────────────────────
export const ORDER_STATUSES     = ['received','processing','shipped','delivered','cancelled'];
export const REIMAGINE_STATUSES = ['pending_review','accepted','in_progress','completed','rejected'];

export const STATUS_COLORS = {
  received:       BRAND.red,
  processing:     BRAND.blue,
  shipped:        BRAND.green,
  delivered:      BRAND.green,
  cancelled:      '#888',
  pending_review: BRAND.red,
  accepted:       BRAND.blue,
  in_progress:    BRAND.burgundy,
  completed:      BRAND.green,
  rejected:       '#888',
};

// ─────────────────────────────────────────────────────────────────────────────
// WAITLIST PAGE CONFIGS
// ─────────────────────────────────────────────────────────────────────────────
export const WAITLIST_CONFIGS = {
  repair: {
    type: 'repair',
    bgVar: '--tj-repair',
    blobPosition: 'top',
    eyebrow: '03 · Repair · Coming soon',
    headline: ['The mend', 'is the mood.'],
    subtext: "Buttons, hems, holes, hearts. Send us anything that's broken and we'll bring it back — visible repairs encouraged. Launching mid-2026.",
    formLabel: 'Be the first in line',
    stats: [
      { value: '~₹299', label: 'starting price' },
      { value: '7 days', label: 'average turnaround' },
      { value: 'Pan-IN', label: 'pickup + drop' },
    ],
  },
  donate: {
    type: 'donate',
    bgVar: '--tj-donate',
    blobPosition: 'bottom',
    eyebrow: '04 · Donate · Coming soon',
    headline: ["When it's done", 'with you.'],
    subtext: 'Drop garments at any Tarajuvva pickup point. We sort, route to NGOs, repurpose with maker collectives, or recycle yarns. Documented, tracked, no greenwashing.',
    formLabel: 'Get a heads-up at launch',
    stats: [
      { value: '3 routes', label: 'reuse · repair · recycle' },
      { value: 'Free', label: 'always' },
      { value: 'Receipt', label: 'where it ended up' },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ABOUT PAGE
// ─────────────────────────────────────────────────────────────────────────────
export const MANIFESTO_LINES = [
  { title: 'No polyester. Ever.', desc: "Not even blends. Not even 'just 5%'." },
  { title: 'Every garment ships with a remake guide.', desc: 'So you know what it can become later.' },
  { title: 'Customer support over influencer marketing.', desc: "We'd rather fix your shirt than promote a new one." },
  { title: 'Local first.', desc: 'Made within 200km of where it ships from, when possible.' },
  { title: 'Honest pricing.', desc: 'Margins on the page. We hide nothing.' },
  { title: 'Not perfect. Just trying.', desc: 'We mess up. We post about it. We fix it.' },
];

export const BRAND_VALUES = [
  { title: 'Circular',      desc: 'Every garment has multiple lives. We help you find them all.',                      emoji: '🔄' },
  { title: 'Honest',        desc: "We're not here to sell you more stuff. We're here to help you use what you own.",   emoji: '💬' },
  { title: 'Artisan-first', desc: 'We work with local tailors and craftspeople. Every transformation is human-made.',  emoji: '🧵' },
  { title: 'Anti-waste',    desc: '7 million tonnes. That number keeps us up at night. It should keep you up too.',    emoji: '🌍' },
];

export const HERO_STATS = [
  { value: '100+', label: 'ways to wear 10 pieces' },
  { value: '1×',   label: 'garment, 4 lifetimes' },
  { value: '₹199', label: 'remake consult' },
  { value: '0',    label: 'polyester, ever' },
];

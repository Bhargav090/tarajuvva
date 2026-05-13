// ─────────────────────────────────────────────────────────────────────────────
// BRAND COLORS  (from official Tarajuvva brand guide)
// Change here → propagates everywhere
// ─────────────────────────────────────────────────────────────────────────────
export const BRAND = {
  // Official palette (background → primary → secondary → tertiary → accent row)
  bg:        '#eef4d1',   // background
  bgCard:    '#ffffff',
  bgAlt:     '#e6edca',
  primary:   '#a8c422',   // lime green – SHOP / primary
  secondary: '#6c0b20',   // burgundy – REIMAGINE
  tertiary:  '#e7a3c9',   // blush pink – accent
  red:       '#e34334',   // warm red – REPAIR
  blue:      '#015395',   // navy – DONATE
  dark:      '#341631',   // plum – text / dark sections
  green:     '#a8c422',   // alias → primary
  burgundy:  '#6c0b20',   // alias → secondary
  pink:      '#e7a3c9',   // alias → tertiary
  // Text
  text:      '#341631',   // main body text
  textMuted: 'rgba(52,22,49,0.55)',
  textLight: '#eef4d1',   // text on dark bg
  // Borders
  border:    'rgba(52,22,49,0.12)',
  borderLight: 'rgba(238,244,209,0.18)',
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
  '✦ Wear more. Waste less.',
  '✦ Turn your old clothes into new fits.',
  '✦ 7 million tonnes of textile waste. Let\'s fix that.',
  '✦ Circular fashion starts here.',
  '✦ Every garment has a second life.',
  '✦ Buy less. Choose well. Make it last.',
];

// ─────────────────────────────────────────────────────────────────────────────
// SHOP
// ─────────────────────────────────────────────────────────────────────────────
export const SHOP_CATEGORIES = ['All', 'Tops', 'Co-ords', 'Outerwear', 'Sarees', 'Dresses'];

export const SORT_OPTIONS = [
  { value: 'default',    label: 'Sort: Default' },
  { value: 'price_asc',  label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

// ─────────────────────────────────────────────────────────────────────────────
// REIMAGINE
// ─────────────────────────────────────────────────────────────────────────────
export const GARMENTS = [
  { id: 'saree', label: 'Saree', emoji: '🥻', desc: 'Traditional or designer sarees' },
  { id: 'kurti', label: 'Kurti', emoji: '👗', desc: 'Any kurta or kurti' },
  { id: 'shirt', label: 'Shirt', emoji: '👔', desc: 'Formal or casual shirts' },
  { id: 'pant',  label: 'Pant',  emoji: '👖', desc: 'Trousers or jeans' },
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

export const REIMAGINE_STEPS = ['Garment', 'Transform', 'Summary', 'Upload', 'Details'];

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
    type:        'repair',
    icon:        'Wrench',
    accentColor:  BRAND.red,
    badge:        'Coming Soon',
    headline:   ['Repair is', 'coming.'],
    subtext:    'Because throwing away is lazy. Join the waitlist and be first to know.',
    ctaLabel:   '🔧 Join Repair Waitlist',
    preview: {
      title: 'What Repair will include',
      items: ['Stitch & seam repairs','Zipper replacements','Button & hook fixes','Lining repairs','Custom alterations'],
    },
  },
  donate: {
    type:        'donate',
    icon:        'Heart',
    accentColor:  BRAND.blue,
    badge:        'Coming Soon',
    headline:   ["Clothes shouldn't", 'end with you.'],
    subtext:    'Join the waitlist and be first to donate when the program launches.',
    ctaLabel:   '💙 Join Donate Waitlist',
    stats: [
      { value: '7M',  label: 'Tonnes wasted annually' },
      { value: '60%', label: 'Clothes never worn again' },
      { value: '∞',   label: "A garment's potential" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ABOUT PAGE
// ─────────────────────────────────────────────────────────────────────────────
export const BRAND_VALUES = [
  { title: 'Circular',      desc: 'Every garment has multiple lives. We help you find them all.',                      emoji: '🔄' },
  { title: 'Honest',        desc: "We're not here to sell you more stuff. We're here to help you use what you own.",   emoji: '💬' },
  { title: 'Artisan-first', desc: 'We work with local tailors and craftspeople. Every transformation is human-made.',  emoji: '🧵' },
  { title: 'Anti-waste',    desc: '7 million tonnes. That number keeps us up at night. It should keep you up too.',    emoji: '🌍' },
];

export const HERO_STATS = [
  { value: '500+', label: 'Happy customers' },
  { value: '7M',   label: 'Tonnes of waste to fight' },
  { value: '₹199', label: 'Custom consultation' },
  { value: '24hrs',label: 'Reimagine response' },
];

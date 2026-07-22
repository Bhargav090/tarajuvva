import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpDown, Check, X } from 'lucide-react';
import HorizontalScrollRail from '../ui/HorizontalScrollRail';
import { SHOP_CATEGORIES, SORT_OPTIONS } from '../../utils/constants';

const CATEGORY_TINT = {
  Everything: 'var(--tj-shop-deep)',
  Tops: 'var(--tj-shop-deep)',
  Bottoms: '#5a7a2e',
  Sets: '#3d6b4f',
  Dresses: '#8b6f4e',
  Accessories: '#6b5b8a',
  Sale: '#c43d2b',
};

function sortShortLabel(value) {
  const map = {
    newest: 'Newest',
    price_asc: 'Price ↑',
    price_desc: 'Price ↓',
    sale: 'On sale',
  };
  return map[value] || 'Sort';
}

function CategoryChip({ c, active, onClick }) {
  const tint = CATEGORY_TINT[c.label];
  const isSale = c.label === 'Sale';

  return (
    <button
      type="button"
      data-testid={`filter-${c.label.toLowerCase()}`}
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-display font-semibold whitespace-nowrap transition-all ${
        active
          ? isSale
            ? 'bg-[#c43d2b] text-white shadow-sm'
            : 'bg-[#0a0a0a] text-white shadow-sm'
          : 'bg-black/[0.05] text-black/65 hover:bg-black/[0.08] hover:text-black'
      }`}
      style={
        active || !tint
          ? undefined
          : { color: `color-mix(in srgb, ${tint} 80%, #000 20%)` }
      }
    >
      {c.label}
    </button>
  );
}

function SortOptionList({ sort, onSelect }) {
  return (
    <ul className="space-y-1" role="listbox" aria-label="Sort options">
      {SORT_OPTIONS.map((o) => {
        const selected = sort === o.value;
        return (
          <li key={o.value}>
            <button
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onSelect(o.value)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl text-left text-sm font-display transition-colors ${
                selected
                  ? 'bg-[var(--tj-shop)]/25 text-[#0a0a0a] font-semibold'
                  : 'text-black/70 hover:bg-black/[0.04]'
              }`}
            >
              <span>{o.label.replace(/^Sort:\s*/i, '')}</span>
              {selected && <Check size={18} className="shrink-0 text-[#0a0a0a]" strokeWidth={2.5} />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function ShopFiltersBar({
  category,
  onCategoryChange,
  sort,
  onSortChange,
  itemCount,
  loading,
}) {
  const [sortOpen, setSortOpen] = useState(false);
  const desktopSortRef = useRef(null);

  useEffect(() => {
    if (!sortOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [sortOpen]);

  useEffect(() => {
    if (!sortOpen) return undefined;
    const onDoc = (e) => {
      if (desktopSortRef.current?.contains(e.target)) return;
      if (window.innerWidth >= 768) setSortOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [sortOpen]);

  const pickSort = (value) => {
    onSortChange(value);
    setSortOpen(false);
  };

  const countLabel = loading
    ? 'Loading…'
    : `${itemCount} ${itemCount === 1 ? 'piece' : 'pieces'}`;

  return (
    <div className="sticky top-[calc(var(--ticker-h)+var(--nav-h))] z-30 bg-white/95 backdrop-blur-xl border-b border-black/10 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      {/* Categories — full-bleed scroll on mobile */}
      <div className="border-b border-black/[0.06] md:border-0">
        <div className="tj-container py-3 md:py-2.5">
          <div className="-mx-6 px-6 md:mx-0 md:px-0">
            <HorizontalScrollRail
              innerClassName="gap-2 py-0.5"
              ariaLabel="Shop categories"
            >
              {SHOP_CATEGORIES.map((c) => (
                <CategoryChip
                  key={c.label}
                  c={c}
                  active={category.label === c.label}
                  onClick={() => onCategoryChange(c)}
                />
              ))}
            </HorizontalScrollRail>
          </div>
        </div>
      </div>

      {/* Toolbar: count + sort */}
      <div className="tj-container py-2.5 md:py-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-mono-tj uppercase tracking-[0.14em] text-black/45 truncate">
            {countLabel}
            {!loading && category.label !== 'Everything' && (
              <span className="text-black/70"> · {category.label}</span>
            )}
          </p>

          {/* Mobile sort — opens bottom sheet */}
          <button
            type="button"
            onClick={() => setSortOpen(true)}
            className="md:hidden inline-flex items-center gap-2 shrink-0 rounded-full border border-black/12 bg-white px-3.5 py-2 text-sm font-display font-semibold text-[#0a0a0a] shadow-sm active:scale-[0.98] transition-transform"
            aria-expanded={sortOpen}
            aria-haspopup="dialog"
          >
            <ArrowUpDown size={15} className="text-black/50" />
            {sortShortLabel(sort)}
          </button>

          {/* Desktop sort — dropdown */}
          <div className="hidden md:block relative shrink-0" ref={desktopSortRef}>
            <button
              type="button"
              onClick={() => setSortOpen((o) => !o)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-display font-semibold transition-colors ${
                sortOpen
                  ? 'border-black bg-black/[0.04] text-[#0a0a0a]'
                  : 'border-black/12 bg-white text-black/70 hover:border-black/25 hover:text-black'
              }`}
              aria-expanded={sortOpen}
              aria-haspopup="listbox"
            >
              <ArrowUpDown size={15} className="text-black/45" />
              Sort · {sortShortLabel(sort)}
            </button>

            <AnimatePresence>
              {sortOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-black/10 shadow-xl p-2 z-40"
                >
                  <SortOptionList sort={sort} onSelect={pickSort} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Mobile sort bottom sheet */}
      <AnimatePresence>
        {sortOpen && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[45] bg-black/40 md:hidden"
              aria-label="Close sort menu"
              onClick={() => setSortOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="fixed inset-x-0 bottom-0 z-[46] bg-white rounded-t-2xl border-t border-black/10 md:hidden"
              role="dialog"
              aria-modal="true"
              aria-labelledby="shop-sort-title"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-black/[0.06]">
                <h2 id="shop-sort-title" className="text-lg font-display font-bold text-[#0a0a0a]">
                  Sort by
                </h2>
                <button
                  type="button"
                  onClick={() => setSortOpen(false)}
                  className="p-2 -mr-1 rounded-full text-black/50 hover:text-black hover:bg-black/[0.05]"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <SortOptionList sort={sort} onSelect={pickSort} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState } from 'react';
import { Filter, ChevronDown } from 'lucide-react';
import ProductCard from '../../components/ui/ProductCard';
import { ProductGridSkeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import { useProducts } from '../../hooks/useProducts';
import { SHOP_CATEGORIES, SORT_OPTIONS } from '../../utils/constants';

export default function Shop() {
  const [category, setCategory] = useState(SHOP_CATEGORIES[0]);
  const [sort, setSort] = useState('newest');
  const { products, loading } = useProducts({ category: category.value });

  const sorted = [...products].sort((a, b) => {
    if (sort === 'price_asc')  return a.price - b.price;
    if (sort === 'price_desc') return b.price - a.price;
    return 0;
  });

  return (
    <div className="bg-white min-h-screen">
      {/* Hero */}
      <section className="border-b border-black" data-testid="shop-header">
        <div className="tj-container py-12 md:py-20 grid md:grid-cols-12 gap-6 items-end">
          <div className="md:col-span-8">
            <p className="tj-eyebrow">01 · Shop</p>
            <h1 className="tj-h1 mt-3 text-[#0a0a0a]">
              Ten pieces.
              <br />
              <span className="italic font-light bg-[var(--tj-shop)] px-3">
                A hundred outfits.
              </span>
            </h1>
          </div>
          <p className="md:col-span-4 text-black/65 text-base md:text-lg leading-relaxed">
            Built modular. Designed to remix. Priced honestly. No hidden synthetics, no half-truths.
          </p>
        </div>
      </section>

      {/* Filters */}
      <div className="sticky top-16 z-30 bg-white/90 backdrop-blur-xl border-b border-black/10">
        <div className="tj-container py-3 flex items-center gap-4 overflow-x-auto no-scrollbar">
          <Filter size={14} className="shrink-0 text-black/60" aria-hidden />
          {SHOP_CATEGORIES.map(c => {
            const active = category.label === c.label;
            return (
              <button
                key={c.label}
                type="button"
                data-testid={`filter-${c.label.toLowerCase()}`}
                onClick={() => setCategory(c)}
                className={`shrink-0 text-xs font-mono-tj uppercase tracking-[0.18em] px-3 py-1.5 border transition ${
                  active
                    ? 'bg-black text-white border-black'
                    : 'border-black/20 text-black/60 hover:border-black'
                }`}
              >
                {c.label}
              </button>
            );
          })}
          <div className="ml-auto relative shrink-0">
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="appearance-none bg-transparent border border-black/20 text-xs font-mono-tj uppercase tracking-[0.18em] px-3 py-1.5 pr-8 outline-none cursor-pointer text-black/60 hover:border-black focus:border-black"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-black/40 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="tj-container py-10 md:py-14 pb-20">
        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={Filter}
            title="Nothing in this category yet."
            desc="Try Everything or another filter."
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sorted.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import PageBanner from '../../components/ui/PageBanner';
import ProductCard from '../../components/ui/ProductCard';
import { ProductGridSkeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import { useProducts } from '../../hooks/useProducts';
import { SHOP_CATEGORIES, SORT_OPTIONS } from '../../utils/constants';

export default function Shop() {
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('default');
  const { products, loading } = useProducts({ category: category === 'All' ? null : category });

  const sorted = [...products].sort((a, b) => {
    if (sort === 'price_asc')  return a.price - b.price;
    if (sort === 'price_desc') return b.price - a.price;
    return 0;
  });

  return (
    <div className="bg-[#eef4d1] min-h-screen">
      <PageBanner
        badge="Shop"
        badgeColor="#0b4722"
        title="The Collection."
        subtitle="Thoughtfully made. Multiple ways to wear. Zero guilt."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-8 sticky top-14 sm:top-16 bg-[#eef4d1]/95 backdrop-blur-md py-4 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 border-b border-[#341631]/8">
          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            {SHOP_CATEGORIES.map(c => (
              <button
                key={c} onClick={() => setCategory(c)}
                className={`px-4 py-2 rounded-xl text-xs font-bold font-display transition-all ${
                  category === c
                    ? 'bg-[#0b4722] text-[#eef4d1]'
                    : 'bg-white text-[#341631]/60 border border-[#341631]/12 hover:border-[#0b4722]/30 hover:text-[#0b4722]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          {/* Sort */}
          <div className="relative flex-shrink-0">
            <select
              value={sort} onChange={e => setSort(e.target.value)}
              className="appearance-none bg-white border border-[#341631]/12 rounded-xl px-4 py-2 text-xs font-semibold text-[#341631] font-display pr-8 outline-none cursor-pointer focus:border-[#0b4722]"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#341631]/40 pointer-events-none" />
          </div>
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-xs text-[#341631]/45 font-body mb-6">{sorted.length} products</p>
        )}

        {/* Grid */}
        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : sorted.length === 0 ? (
          <EmptyState icon={SlidersHorizontal} title="No products found" desc="Try a different category." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {sorted.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Filter } from 'lucide-react';
import ProductCard from '../../components/ui/ProductCard';
import ShopFiltersBar from '../../components/shop/ShopFiltersBar';
import { ProductGridSkeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import { useProducts } from '../../hooks/useProducts';
import { SHOP_CATEGORIES, SALE_CATEGORY_VALUE } from '../../utils/constants';
import { isSaleProduct, productDiscountPercent } from '../../utils/productSale';

export default function Shop() {
  const [category, setCategory] = useState(SHOP_CATEGORIES[0]);
  const [sort, setSort] = useState('newest');
  const isSaleFilter = category.value === SALE_CATEGORY_VALUE;
  const { products, loading } = useProducts({
    category: isSaleFilter ? null : category.value,
  });

  const showSaleOnly = isSaleFilter || sort === 'sale';

  const visible = showSaleOnly ? products.filter((p) => isSaleProduct(p)) : products;

  const sorted = [...visible].sort((a, b) => {
    if (sort === 'sale') return productDiscountPercent(b) - productDiscountPercent(a);
    if (sort === 'price_asc') return a.price - b.price;
    if (sort === 'price_desc') return b.price - a.price;
    // Featured first (API also orders this way; keep as client safety net)
    const feat = Number(!!b.featured) - Number(!!a.featured);
    if (feat !== 0) return feat;
    return 0;
  });

  return (
    <div className="bg-white min-h-screen">
      <section
        className="border-b border-black relative overflow-hidden bg-[var(--tj-shop)]"
        data-testid="shop-hero"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 55% 120% at 100% 0%, rgba(255,255,255,0.5) 0%, transparent 58%)',
          }}
          aria-hidden
        />
        <div className="tj-container relative py-10 md:py-[3.2rem] lg:py-16">
          <div className="flex flex-col gap-4 md:gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-10 lg:gap-12">
            <div className="min-w-0 max-w-3xl">
              <p className="tj-eyebrow !text-black/50 m-0 !text-[11px] sm:!text-xs !tracking-[0.28em]">
                01 - Shop
              </p>
              <h1 className="mt-2 md:mt-3 font-display text-[2.2rem] sm:text-[2.8rem] md:text-[3.4rem] lg:text-[4rem] font-extrabold tracking-[-0.03em] leading-[1.02] text-[#0a0a0a] m-0">
                Designed to{' '}
                <span className="tj-vertical-hero-highlight max-sm:whitespace-normal sm:whitespace-nowrap">
                  do more.
                </span>
              </h1>
            </div>
            <p className="text-sm md:text-base lg:text-lg text-black/60 leading-relaxed max-w-[21rem] m-0 sm:text-right font-body shrink-0">
              Reversible, adjustable, or packed with utility loops and playful
              pockets - garments that adapt with you.
            </p>
          </div>
        </div>
      </section>

      <ShopFiltersBar
        category={category}
        onCategoryChange={setCategory}
        sort={sort}
        onSortChange={setSort}
        itemCount={sorted.length}
        loading={loading}
      />

      <div className="tj-container py-8 md:py-10 pb-20">
        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={Filter}
            title={showSaleOnly ? 'No sale items right now.' : 'Nothing in this category yet.'}
            desc={
              showSaleOnly
                ? 'Check back soon - we only list 50% off and deeper here.'
                : 'Try Everything or another filter.'
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
              {sorted.map((p, i) => (
                <ProductCard key={p.id} product={p} disableEntrance={i > 3} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

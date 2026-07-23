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
        <div className="tj-container relative py-6 md:py-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
            <div className="min-w-0">
              <p className="tj-eyebrow !text-black/50 m-0">01 · Shop</p>
              <h1 className="mt-1.5 font-display text-[1.85rem] sm:text-[2.15rem] md:text-[2.5rem] font-extrabold tracking-[-0.03em] leading-[1.08] text-[#0a0a0a] m-0">
                Designed to{' '}
                <span className="tj-vertical-hero-highlight whitespace-nowrap">
                  do more.
                </span>
              </h1>
            </div>
            <p className="text-sm text-black/60 leading-snug max-w-[22rem] m-0 sm:text-right sm:pb-1">
              Reversible, adjustable, or packed with utility loops and playful
              pockets — garments that adapt with you.
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
                ? 'Check back soon — we only list 50% off and deeper here.'
                : 'Try Everything or another filter.'
            }
          />
        ) : (
          <>
            {/* Mobile: 2-col bordered grid */}
            <div className="sm:hidden grid grid-cols-2 border border-black">
              {sorted.map((p, i) => {
                const isRight = i % 2 === 1;
                const row = Math.floor(i / 2);
                const lastRow = Math.floor((sorted.length - 1) / 2);
                return (
                  <div
                    key={p.id}
                    className={[
                      'min-w-0',
                      !isRight ? 'border-r border-black' : '',
                      row < lastRow ? 'border-b border-black' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <ProductCard product={p} variant="home" disableEntrance={i > 3} />
                  </div>
                );
              })}
            </div>

            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sorted.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

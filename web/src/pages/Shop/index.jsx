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
    return 0;
  });

  return (
    <div className="bg-white min-h-screen">
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sorted.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

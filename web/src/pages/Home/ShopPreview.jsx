import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ProductCard from '../../components/ui/ProductCard';
import { useProducts } from '../../hooks/useProducts';

function DesktopProductSkeleton() {
  return (
    <div className="tj-card p-3 animate-pulse">
      <div className="aspect-[3/4] bg-black/5" />
      <div className="pt-3 space-y-2">
        <div className="h-4 bg-black/5 rounded w-3/4" />
        <div className="h-3 bg-black/5 rounded w-full" />
      </div>
    </div>
  );
}

export default function ShopPreview() {
  const { products, loading } = useProducts({ featured: true, limit: 4 });

  return (
    <section className="tj-section border-b border-black bg-white !pt-8 md:!pt-10 lg:!pt-12" data-testid="shop-highlight">
      <div className="tj-container">
        <div className="flex items-start justify-between gap-6 mb-10">
          <div className="flex flex-col gap-1 max-w-xl">
            <p className="tj-eyebrow m-0 leading-snug">01 - Shop</p>
            <h2 className="tj-h2 m-0 leading-tight text-[#0a0a0a]">
              Designed to do more.
            </h2>
            <p className="text-sm text-black/55 leading-snug m-0 max-w-md">
              Reversible, adjustable, or packed with utility loops and playful pockets, these are garments that adapt with you.
            </p>
          </div>
          <Link
            to="/shop"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-bold uppercase tracking-[0.18em] border-b border-black pb-1 hover:opacity-70 transition-opacity"
            data-testid="see-all-shop"
          >
            See all <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <DesktopProductSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} disableEntrance={i > 1} />
            ))}
          </div>
        )}

        <div className="mt-10 sm:hidden text-center">
          <Link
            to="/shop"
            className="inline-flex items-center gap-1 text-sm font-bold uppercase tracking-[0.18em] border-b border-black pb-1"
          >
            See all <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}

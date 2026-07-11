import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ProductCard from '../../components/ui/ProductCard';
import { useProducts } from '../../hooks/useProducts';

function HomeProductSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[3/4] bg-black/5" />
      <div className="pt-3 px-1 space-y-2">
        <div className="h-3 bg-black/5 rounded w-3/4" />
        <div className="h-3 bg-black/5 rounded w-1/2" />
      </div>
    </div>
  );
}

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
            <p className="tj-eyebrow m-0 leading-snug">01 · Shop</p>
            <h2 className="tj-h2 m-0 leading-tight text-[#0a0a0a]">
              Garments that <span className="whitespace-nowrap">do more</span>
            </h2>
            <p className="text-sm text-black/55 leading-snug m-0 max-w-md">
              Durable, versatile pieces with utility at their core.
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
          <>
            <div className="md:hidden grid grid-cols-2 border border-black">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={[
                    'min-w-0',
                    i % 2 === 0 ? 'border-r border-black' : '',
                    i < 2 ? 'border-b border-black' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <HomeProductSkeleton />
                </div>
              ))}
            </div>
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <DesktopProductSkeleton key={i} />
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Mobile only: 2×2 hairline grid */}
            <div className="md:hidden grid grid-cols-2 border border-black">
              {products.map((p, i) => (
                <div
                  key={p.id}
                  className={[
                    'min-w-0',
                    i % 2 === 0 ? 'border-r border-black' : '',
                    i < 2 ? 'border-b border-black' : '',
                    products.length === 3 && i === 2 ? 'border-r border-black' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <ProductCard product={p} variant="home" disableEntrance={i > 1} />
                </div>
              ))}
            </div>

            {/* Desktop / tablet: original product cards */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </>
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

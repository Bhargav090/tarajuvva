import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { productHeroImage } from '../../utils/productImage';
import { ProductGridSkeleton } from '../../components/ui/Skeleton';
import { useProducts } from '../../hooks/useProducts';

function FeaturedProductCard({ product }) {
  const img = productHeroImage(product.images);

  return (
    <Link
      to={`/shop/${product.id}`}
      className="group tj-card p-3 hover:-translate-y-1 transition-transform block h-full flex flex-col"
    >
      <div className="aspect-[3/4] overflow-hidden bg-[var(--tj-bg-soft)]">
        <img
          src={img}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </div>
      <div className="pt-3 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 flex-1">
          <div className="min-w-0">
            <p className="font-display font-bold leading-tight text-[#0a0a0a] line-clamp-2">
              {product.name}
            </p>
          {product.description && (
            <p className="text-xs text-black/55 mt-0.5 line-clamp-2">
              {product.description}
            </p>
          )}
        </div>
        <span className="font-display font-bold text-sm whitespace-nowrap shrink-0">
          ₹{product.price.toLocaleString('en-IN')}
        </span>
        </div>
      </div>
    </Link>
  );
}

export default function ShopPreview() {
  const { products, loading } = useProducts({ limit: 4 });

  return (
    <section className="tj-section border-b border-black bg-white" data-testid="shop-highlight">
      <div className="tj-container">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="tj-eyebrow">01 · Shop</p>
            <h2 className="tj-h2 mt-3 text-[#0a0a0a]">
              Pieces that <span className="italic font-light">do six jobs.</span>
            </h2>
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
          <ProductGridSkeleton count={4} />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map(p => <FeaturedProductCard key={p.id} product={p} />)}
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

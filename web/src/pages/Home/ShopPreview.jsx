import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import SectionHeader from '../../components/ui/SectionHeader';
import ProductCard from '../../components/ui/ProductCard';
import { ProductGridSkeleton } from '../../components/ui/Skeleton';
import { useProducts } from '../../hooks/useProducts';
import Button from '../../components/ui/Button';

export default function ShopPreview() {
  const { products, loading } = useProducts({ featured: true, limit: 4 });

  return (
    <section className="section bg-[#e6edca]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <SectionHeader
          pill="Shop"
          pillColor="#0b4722"
          title="Clothes that don't sit"
          titleLight="in your wardrobe."
          subtitle="Each piece has a story, a purpose, and multiple ways to wear it."
          action={
            <Link to="/shop">
              <Button variant="outline-green" size="md" icon={ArrowRight} iconPosition="right">
                View All Products
              </Button>
            </Link>
          }
        />

        {loading ? (
          <ProductGridSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link to="/shop">
            <Button variant="primary" size="lg" icon={ArrowRight} iconPosition="right">
              Shop All
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

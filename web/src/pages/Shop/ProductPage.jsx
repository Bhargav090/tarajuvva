import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, ArrowLeft, Tag, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useProduct } from '../../hooks/useProduct';
import { useCart } from '../../context/CartContext';
import { PRODUCT_IMAGE_PLACEHOLDER } from '../../utils/productImage';
import Button from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Skeleton';

export default function ProductPage() {
  const { id } = useParams();
  const { product, loading } = useProduct(id);
  const { addItem } = useCart();
  const [activeImg, setActiveImg] = useState(0);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setActiveImg(0);
  }, [product?.id]);

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <Spinner size={36} />
    </div>
  );

  if (!product) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center">
      <p className="text-[#241621] font-display font-bold text-xl mb-4">Product not found.</p>
      <Link to="/shop" className="text-[#a8c74a] font-semibold hover:underline font-display">← Back to Shop</Link>
    </div>
  );

  const handleAdd = () => {
    setAdding(true);
    addItem(product);
    toast.success(`${product.name} added to cart! 🛍`);
    setTimeout(() => setAdding(false), 600);
  };

  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : null;

  const gallery =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : [PRODUCT_IMAGE_PLACEHOLDER];
  const viewLabels = ['Front View', 'Back View', 'Side View', 'Detail View'];

  return (
    <div className="min-h-screen bg-white pt-2 sm:pt-4">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-[#241621]/55 hover:text-[#a8c74a] font-display mb-8 transition-colors">
          <ArrowLeft size={15} /> Back to Shop
        </Link>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Primary image — other views selected in Explore Garment Views */}
          <div>
            <div className="aspect-[3/4] rounded-3xl overflow-hidden bg-white relative">
              <img
                src={gallery[activeImg]}
                alt={`${product.name}${activeImg === 0 ? '' : ` — ${viewLabels[activeImg] || `View ${activeImg + 1}`}`}`}
                className="w-full h-full object-cover transition-opacity duration-200"
              />
              {discount && (
                <span className="absolute top-4 left-4 bg-[#e34334] text-white text-sm font-black rounded-full px-3 py-1 font-display">
                  -{discount}% OFF
                </span>
              )}
            </div>
          </div>

          {/* Details */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <span className="text-xs font-bold text-[#a8c74a] uppercase tracking-widest font-display">{product.category}</span>
            <h1 className="text-3xl sm:text-4xl font-black text-[#241621] font-display mt-2 mb-4 leading-tight">{product.name}</h1>

            {/* Price */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl font-black text-[#a8c74a] font-display">₹{product.price.toLocaleString('en-IN')}</span>
              {product.original_price && (
                <span className="text-lg text-[#241621]/35 line-through font-body">₹{product.original_price.toLocaleString('en-IN')}</span>
              )}
              {discount && (
                <span className="bg-[#e34334]/12 text-[#e34334] text-xs font-bold rounded-full px-2.5 py-1 font-display">
                  Save {discount}%
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-[#241621]/65 font-body text-base leading-relaxed mb-8">{product.description}</p>

            {/* Hover-to-preview garment sides */}
            {gallery.length > 1 && (
              <div className="bg-white rounded-2xl p-5 mb-8 border border-[#241621]/8">
                <h3 className="text-sm font-bold text-[#241621] font-display mb-4 flex items-center gap-2">
                  <Sparkles size={15} className="text-[#a8c74a]" /> Explore Garment Views
                </h3>
                <p className="text-xs text-[#241621]/55 font-display mb-3">
                  Select a view to update the main image.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {gallery.map((img, i) => (
                    <button
                      key={img + i}
                      type="button"
                      onMouseEnter={() => setActiveImg(i)}
                      onFocus={() => setActiveImg(i)}
                      onClick={() => setActiveImg(i)}
                      aria-pressed={activeImg === i}
                      className={`rounded-xl overflow-hidden border transition-all ${
                        activeImg === i ? 'border-[#a8c74a]' : 'border-[#241621]/10 hover:border-[#a8c74a]/40'
                      }`}
                    >
                      <img src={img} alt={`${product.name} ${viewLabels[i] || `View ${i + 1}`}`} className="w-full aspect-square object-cover" />
                      <span className="block px-2 py-1.5 text-[10px] font-display text-[#241621]/65 text-center">
                        {viewLabels[i] || `View ${i + 1}`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {product.tags.map(t => (
                  <span key={t} className="flex items-center gap-1 bg-[#a8c74a]/8 text-[#a8c74a] text-xs font-semibold rounded-full px-3 py-1 font-display">
                    <Tag size={10} /> {t}
                  </span>
                ))}
              </div>
            )}

            {/* Stock */}
            {product.stock <= 10 && product.stock > 0 && (
              <p className="text-[#e34334] text-xs font-bold font-display mb-4">Only {product.stock} left in stock!</p>
            )}

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="primary" size="xl" fullWidth icon={ShoppingBag}
                onClick={handleAdd} loading={adding}
                disabled={product.stock === 0}
              >
                {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </Button>
              <Link to="/reimagine" className="flex-1">
                <Button variant="outline-burgundy" size="xl" fullWidth icon={Sparkles} className="whitespace-nowrap min-w-[190px]">
                  Reimagine&nbsp;It
                </Button>
              </Link>
            </div>

            {/* Assurance */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                ['🚚', 'Fast Delivery'],
                ['♻️', 'Sustainable'],
                ['✅', 'Easy Returns'],
              ].map(([e, l]) => (
                <div key={l} className="text-center p-3 bg-white rounded-xl border border-[#241621]/8">
                  <span className="text-xl block mb-1">{e}</span>
                  <span className="text-[10px] font-semibold text-[#241621]/55 font-display">{l}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

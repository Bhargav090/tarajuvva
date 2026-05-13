import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, ArrowLeft, Tag, CheckCircle, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useProduct } from '../../hooks/useProduct';
import { useCart } from '../../context/CartContext';
import Button from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Skeleton';

export default function ProductPage() {
  const { id } = useParams();
  const { product, loading } = useProduct(id);
  const { addItem } = useCart();
  const [activeImg, setActiveImg] = useState(0);
  const [adding, setAdding] = useState(false);

  if (loading) return (
    <div className="min-h-screen bg-[#eef4d1] flex items-center justify-center">
      <Spinner size={36} />
    </div>
  );

  if (!product) return (
    <div className="min-h-screen bg-[#eef4d1] flex flex-col items-center justify-center">
      <p className="text-[#341631] font-display font-bold text-xl mb-4">Product not found.</p>
      <Link to="/shop" className="text-[#a8c422] font-semibold hover:underline font-display">← Back to Shop</Link>
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

  return (
    <div className="min-h-screen bg-[#eef4d1] pt-2 sm:pt-4">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-[#341631]/55 hover:text-[#a8c422] font-display mb-8 transition-colors">
          <ArrowLeft size={15} /> Back to Shop
        </Link>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Images */}
          <div>
            <div className="aspect-[3/4] rounded-3xl overflow-hidden bg-white mb-3 relative">
              <img src={product.images[activeImg]} alt={product.name}
                className="w-full h-full object-cover" />
              {discount && (
                <span className="absolute top-4 left-4 bg-[#e34334] text-white text-sm font-black rounded-full px-3 py-1 font-display">
                  -{discount}% OFF
                </span>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-3">
                {product.images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    className={`flex-1 aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                      activeImg === i ? 'border-[#a8c422]' : 'border-transparent'
                    }`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <span className="text-xs font-bold text-[#a8c422] uppercase tracking-widest font-display">{product.category}</span>
            <h1 className="text-3xl sm:text-4xl font-black text-[#341631] font-display mt-2 mb-4 leading-tight">{product.name}</h1>

            {/* Price */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl font-black text-[#a8c422] font-display">₹{product.price.toLocaleString('en-IN')}</span>
              {product.original_price && (
                <span className="text-lg text-[#341631]/35 line-through font-body">₹{product.original_price.toLocaleString('en-IN')}</span>
              )}
              {discount && (
                <span className="bg-[#e34334]/12 text-[#e34334] text-xs font-bold rounded-full px-2.5 py-1 font-display">
                  Save {discount}%
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-[#341631]/65 font-body text-base leading-relaxed mb-8">{product.description}</p>

            {/* Ways to wear */}
            {product.ways_to_wear?.length > 0 && (
              <div className="bg-white rounded-2xl p-5 mb-8 border border-[#341631]/8">
                <h3 className="text-sm font-bold text-[#341631] font-display mb-4 flex items-center gap-2">
                  <Sparkles size={15} className="text-[#a8c422]" /> {product.ways_to_wear.length} Ways to Wear
                </h3>
                <ul className="space-y-2.5">
                  {product.ways_to_wear.map((w, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-[#341631]/70 font-body">
                      <CheckCircle size={14} className="text-[#a8c422] flex-shrink-0 mt-0.5" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {product.tags.map(t => (
                  <span key={t} className="flex items-center gap-1 bg-[#a8c422]/8 text-[#a8c422] text-xs font-semibold rounded-full px-3 py-1 font-display">
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
                <Button variant="outline-burgundy" size="xl" fullWidth icon={Sparkles}>
                  Reimagine It
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
                <div key={l} className="text-center p-3 bg-white rounded-xl border border-[#341631]/8">
                  <span className="text-xl block mb-1">{e}</span>
                  <span className="text-[10px] font-semibold text-[#341631]/55 font-display">{l}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Tag } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import Button from './Button';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const img = product.images?.[0] || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&q=80';
  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      viewport={{ once: true }}
      className="group bg-white rounded-2xl overflow-hidden border border-[#341631]/8 shadow-sm card-hover"
    >
      {/* Image */}
      <Link to={`/shop/${product.id}`} className="block relative overflow-hidden aspect-[4/5]">
        <img
          src={img}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {discount && (
          <span className="absolute top-3 left-3 bg-[#e34334] text-white text-xs font-bold rounded-full px-2.5 py-1 font-[Outfit]">
            -{discount}%
          </span>
        )}
        {product.tags?.[0] && (
          <span className="absolute top-3 right-3 bg-[#341631]/80 text-[#eef4d1] text-[10px] font-semibold rounded-full px-2 py-1 font-[Outfit] backdrop-blur-sm">
            {product.tags[0]}
          </span>
        )}
        {/* Ways to wear hover overlay */}
        {product.ways_to_wear?.length > 0 && (
          <div className="absolute inset-0 bg-[#0b4722]/90 flex flex-col justify-center p-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <p className="text-[#eef4d1] text-xs font-bold uppercase tracking-wider mb-3 font-[Outfit]">3 ways to wear</p>
            {product.ways_to_wear.slice(0, 3).map((w, i) => (
              <p key={i} className="text-[#eef4d1]/85 text-xs font-[Poppins] mb-1.5 flex items-start gap-1.5">
                <span className="text-[#e7a3c9] mt-0.5 flex-shrink-0">✦</span> {w}
              </p>
            ))}
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="p-4">
        <span className="text-[10px] font-bold text-[#0b4722] uppercase tracking-widest font-[Outfit]">
          {product.category}
        </span>
        <Link to={`/shop/${product.id}`}>
          <h3 className="text-[#341631] font-bold text-sm sm:text-base mt-1 leading-tight line-clamp-2 hover:text-[#0b4722] transition-colors font-[Outfit]">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2 mt-2 mb-3">
          <span className="text-lg font-black text-[#0b4722] font-[Outfit]">₹{product.price.toLocaleString('en-IN')}</span>
          {product.original_price && (
            <span className="text-sm text-[#341631]/40 line-through font-[Poppins]">
              ₹{product.original_price.toLocaleString('en-IN')}
            </span>
          )}
        </div>
        <Button
          variant="primary" size="sm" fullWidth icon={ShoppingCart}
          onClick={() => addItem(product)}
        >
          Add to Cart
        </Button>
      </div>
    </motion.div>
  );
}

import { Link } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Tag } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { productHeroImage } from '../../utils/productImage';
import Button from './Button';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const [hoverImg, setHoverImg] = useState(null);
  const [selectedImg, setSelectedImg] = useState(null);
  const img = productHeroImage(product.images);
  const gallery =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : [img];
  const activeImg = hoverImg || selectedImg || img;
  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      viewport={{ once: true }}
      className="group bg-white rounded-2xl overflow-hidden border border-[#241621]/8 shadow-sm card-hover"
    >
      {/* Image */}
      <Link
        to={`/shop/${product.id}`}
        className="block relative overflow-hidden aspect-[4/5]"
        onMouseLeave={() => setHoverImg(null)}
      >
        <img
          src={activeImg}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {discount && (
          <span className="absolute top-3 left-3 bg-[#e34334] text-white text-xs font-bold rounded-full px-2.5 py-1 font-display">
            -{discount}%
          </span>
        )}
        {product.tags?.[0] && (
          <span className="absolute top-3 right-3 bg-[#241621]/80 text-[#eef4d1] text-[10px] font-semibold rounded-full px-2 py-1 font-display backdrop-blur-sm">
            {product.tags[0]}
          </span>
        )}
        {/* Hover overlay: preview garment sides */}
        {gallery.length > 1 && (
          <div className="absolute inset-0 bg-[#241621]/35 p-3 sm:p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
            <div className="w-full bg-white/95 rounded-xl p-2.5 border border-[#241621]/10">
              <p className="text-[10px] text-[#241621]/70 font-display mb-2 text-center">Hover to preview, click to keep a side</p>
              <div className="grid grid-cols-4 gap-2">
                {gallery.slice(0, 4).map((sideImg, i) => (
                  <button
                    key={sideImg + i}
                    type="button"
                    onMouseEnter={(e) => {
                      e.preventDefault();
                      setHoverImg(sideImg);
                    }}
                    onFocus={() => setHoverImg(sideImg)}
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedImg(sideImg);
                    }}
                    className={`rounded-lg overflow-hidden border ${
                      activeImg === sideImg ? 'border-[#a8c74a]' : 'border-[#241621]/10 hover:border-[#a8c74a]/50'
                    }`}
                  >
                    <img src={sideImg} alt={`${product.name} side ${i + 1}`} className="w-full aspect-square object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="p-4">
        <span className="text-[10px] font-bold text-[#a8c74a] uppercase tracking-widest font-display">
          {product.category}
        </span>
        <Link to={`/shop/${product.id}`}>
          <h3 className="text-[#241621] font-bold text-sm sm:text-base mt-1 leading-tight line-clamp-2 hover:text-[#a8c74a] transition-colors font-display">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2 mt-2 mb-3">
          <span className="text-lg font-black text-[#a8c74a] font-display">₹{product.price.toLocaleString('en-IN')}</span>
          {product.original_price && (
            <span className="text-sm text-[#241621]/40 line-through font-body">
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

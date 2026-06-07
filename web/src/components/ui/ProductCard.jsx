import { Link } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { productHeroImage } from '../../utils/productImage';
import { productDiscountPercent } from '../../utils/productSale';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const [hovering, setHovering] = useState(false);
  const discount = productDiscountPercent(product);
  const img = productHeroImage(product.images);
  const gallery =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : [img];
  const primary = gallery[0];
  const hoverImage = gallery[1] || null;
  const tagline = product.description?.split('.')[0]
    ? `${product.description.split('.')[0]}.`
    : '';
  const material = product.tags?.[0]
    ? String(product.tags[0]).replace(/-/g, ' ')
    : product.category;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      viewport={{ once: true }}
      className="group text-left h-full"
    >
      <div className="tj-card p-3 hover:-translate-y-1 transition-transform h-full flex flex-col">
        <Link
          to={`/shop/${product.id}`}
          className="block relative overflow-hidden aspect-[3/4] bg-[var(--tj-bg-soft)]"
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        >
          <img
            src={primary}
            alt={product.name}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-out ${
              hovering && hoverImage ? 'opacity-0' : 'opacity-100'
            }`}
            loading="lazy"
          />
          {hoverImage && (
            <img
              src={hoverImage}
              alt=""
              aria-hidden
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-out ${
                hovering ? 'opacity-100' : 'opacity-0'
              }`}
              loading="lazy"
            />
          )}
          <span className="absolute top-2 left-2 z-[1] bg-[var(--tj-shop)] text-black text-[10px] font-mono-tj uppercase tracking-wider px-2 py-1">
            Modular
          </span>
          {discount > 0 && (
            <span className="absolute top-2 right-2 z-[1] bg-black text-white text-[10px] font-mono-tj uppercase tracking-wider px-2 py-1">
              -{discount}%
            </span>
          )}
        </Link>

        <div className="pt-4 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link to={`/shop/${product.id}`}>
                <p className="font-display font-bold text-lg leading-tight text-[#0a0a0a] hover:opacity-70 transition-opacity line-clamp-2">
                  {product.name}
                </p>
              </Link>
              {tagline && (
                <p className="text-xs text-black/55 mt-0.5 line-clamp-2">{tagline}</p>
              )}
            </div>
            <span className="font-mono-tj text-sm shrink-0">
              ₹{product.price.toLocaleString('en-IN')}
            </span>
          </div>

          {material && (
            <p className="mt-3 text-[11px] font-mono-tj text-black/50 uppercase tracking-wider">
              {material}
            </p>
          )}

          <button
            type="button"
            onClick={() => addItem(product)}
            className="mt-auto pt-4 w-full flex items-center justify-center gap-2 border border-black py-2.5 text-xs font-bold uppercase tracking-[0.18em] hover:bg-black hover:text-white transition-colors"
          >
            <ShoppingCart size={14} />
            Add to cart
          </button>
        </div>
      </div>
    </motion.div>
  );
}

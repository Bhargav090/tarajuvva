import { Link } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { productHeroImage } from '../../utils/productImage';

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
          onMouseLeave={() => setHoverImg(null)}
        >
          <img
            src={activeImg}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <span className="absolute top-2 left-2 bg-[var(--tj-shop)] text-black text-[10px] font-mono-tj uppercase tracking-wider px-2 py-1">
            Modular
          </span>
          {gallery.length > 1 && (
            <div className="absolute inset-0 bg-black/35 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
              <div className="w-full bg-white/95 p-2.5 border border-black">
                <p className="text-[10px] text-black/70 font-mono-tj mb-2 text-center uppercase tracking-wider">
                  Hover to preview
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {gallery.slice(0, 4).map((sideImg, i) => (
                    <button
                      key={sideImg + i}
                      type="button"
                      onMouseEnter={e => { e.preventDefault(); setHoverImg(sideImg); }}
                      onFocus={() => setHoverImg(sideImg)}
                      onClick={e => { e.preventDefault(); setSelectedImg(sideImg); }}
                      className={`overflow-hidden border ${
                        activeImg === sideImg ? 'border-black' : 'border-black/15 hover:border-black'
                      }`}
                    >
                      <img
                        src={sideImg}
                        alt={`${product.name} view ${i + 1}`}
                        className="w-full aspect-square object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
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

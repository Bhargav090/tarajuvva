import { Link } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../../context/CartContext';
import { productHeroImage } from '../../utils/productImage';
import { productDiscountPercent } from '../../utils/productSale';
import AsyncImage from './AsyncImage';

function availableSizes(product) {
  if (!Array.isArray(product?.sizes)) return [];
  return product.sizes.filter((s) => s?.label && s.available !== false);
}

export default function ProductCard({ product, disableEntrance = false }) {
  const { addItem } = useCart();
  const [hovering, setHovering] = useState(false);
  const [selectedSize, setSelectedSize] = useState(null);
  const [sizeError, setSizeError] = useState(false);
  const sizes = availableSizes(product);
  const hasSizes = sizes.length > 0;
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

  const handleAdd = () => {
    if (hasSizes && !selectedSize) {
      setSizeError(true);
      toast.error('Please select a size first');
      return;
    }
    addItem(product, selectedSize);
    toast.success(`${product.name}${selectedSize ? ` (${selectedSize})` : ''} added to cart`);
  };

  const card = (
      <div className="tj-card p-3 sm:p-4 hover:-translate-y-1 transition-transform h-full flex flex-col">
        <Link
          to={`/shop/${product.id}`}
          className="block relative overflow-hidden aspect-[3/4] bg-[var(--tj-bg-soft)]"
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        >
          <AsyncImage
            src={primary}
            alt={product.name}
            fill
            imgClassName={`transition-opacity duration-500 ease-out ${
              hovering && hoverImage ? '!opacity-0' : ''
            }`}
          />
          {hoverImage && (
            <AsyncImage
              src={hoverImage}
              alt=""
              fill
              aria-hidden
              loadingClassName="bg-transparent"
              imgClassName={hovering ? '!opacity-100' : '!opacity-0'}
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

        <div className="pt-4 flex-1 flex flex-col min-h-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link to={`/shop/${product.id}`}>
                <p className="font-display font-bold text-lg leading-tight text-[#0a0a0a] hover:opacity-70 transition-opacity line-clamp-2">
                  {product.name}
                </p>
              </Link>
              {tagline && (
                <p className="text-xs text-black/55 mt-1 line-clamp-2 leading-snug">{tagline}</p>
              )}
            </div>
            <span className="font-mono-tj text-sm shrink-0 pt-0.5">
              ₹{product.price.toLocaleString('en-IN')}
            </span>
          </div>

          {material && (
            <p className="mt-2.5 text-[11px] font-mono-tj text-black/50 uppercase tracking-wider">
              {material}
            </p>
          )}

          <div className="mt-auto pt-4 border-t border-black/10 space-y-3">
            {hasSizes && (
              <div className="space-y-2">
                <p
                  className={`text-[10px] font-mono-tj uppercase tracking-[0.14em] ${
                    sizeError ? 'text-[#e34334]' : 'text-black/50'
                  }`}
                >
                  {sizeError ? 'Select a size' : selectedSize ? `Size · ${selectedSize}` : 'Select size'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => {
                    const isSelected = selectedSize === s.label;
                    return (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => {
                          setSelectedSize(s.label);
                          setSizeError(false);
                        }}
                        className={`min-w-[2.5rem] h-9 px-2.5 text-xs font-bold font-display border transition-all ${
                          isSelected
                            ? 'border-black bg-black text-white shadow-[2px_2px_0_0_rgba(0,0,0,0.15)]'
                            : sizeError
                              ? 'border-[#e34334]/40 text-black hover:border-black'
                              : 'border-black/15 text-black hover:border-black bg-white'
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleAdd}
              className="w-full flex items-center justify-center gap-2 border border-black py-2.5 text-xs font-bold uppercase tracking-[0.18em] hover:bg-black hover:text-white transition-colors"
            >
              <ShoppingCart size={14} />
              Add to cart
            </button>
          </div>
        </div>
      </div>
  );

  if (disableEntrance) {
    return <div className="group text-left h-full">{card}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      viewport={{ once: true }}
      className="group text-left h-full"
    >
      {card}
    </motion.div>
  );
}

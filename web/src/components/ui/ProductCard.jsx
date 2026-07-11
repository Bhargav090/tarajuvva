import { Link } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../../context/CartContext';
import SizeChartLink from '../shop/SizeChartLink';
import { productHeroImage, resolveProductImageSrc } from '../../utils/productImage';
import { productDiscountPercent } from '../../utils/productSale';
import AsyncImage from './AsyncImage';

function availableSizes(product) {
  if (!Array.isArray(product?.sizes)) return [];
  return product.sizes.filter((s) => {
    if (!s?.label) return false;
    if (typeof s.stock === 'number') return s.stock > 0;
    return s.available !== false;
  });
}

function galleryList(product) {
  const img = productHeroImage(product.images);
  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images.map((src) => resolveProductImageSrc(src)).filter(Boolean);
  }
  return img ? [img] : [];
}

export default function ProductCard({ product, disableEntrance = false, variant = 'default' }) {
  const { addItem } = useCart();
  const [imgIndex, setImgIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [selectedSize, setSelectedSize] = useState(null);
  const [sizeError, setSizeError] = useState(false);
  const sizes = availableSizes(product);
  const hasSizes = sizes.length > 0;
  const discount = productDiscountPercent(product);
  const gallery = galleryList(product);
  const primary = gallery[0] || '';
  const currentSrc = gallery[imgIndex] || primary;
  const hoverSrc = gallery.length > 1 ? gallery[1] : null;
  const tagline = product.description?.split('.')[0]
    ? `${product.description.split('.')[0]}.`
    : '';
  const material = product.tags?.[0]
    ? String(product.tags[0]).replace(/-/g, ' ')
    : product.category;
  const imageTag = (product.image_tag || 'Modular').trim() || 'Modular';

  const cycleImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (gallery.length <= 1) return;
    setImgIndex((i) => (i + 1) % gallery.length);
  };

  const handleAdd = () => {
    if (hasSizes && !selectedSize) {
      setSizeError(true);
      toast.error('Please select a size first');
      return;
    }
    addItem(product, selectedSize);
    toast.success(`${product.name}${selectedSize ? ` (${selectedSize})` : ''} added to cart`);
  };

  if (variant === 'home') {
    const homeCard = (
      <div className="flex flex-col h-full bg-white">
        <button
          type="button"
          onClick={cycleImage}
          className="relative block w-full overflow-hidden aspect-[3/4] bg-[var(--tj-bg-soft)] text-left cursor-pointer"
          aria-label={
            gallery.length > 1
              ? `Preview next image of ${product.name}`
              : product.name
          }
        >
          <AsyncImage
            src={currentSrc || primary}
            alt={product.name}
            fill
            imgClassName="transition-opacity duration-300"
          />
          {gallery.length > 1 && (
            <span className="absolute bottom-2 right-2 z-[1] bg-black/60 text-white text-[9px] font-mono-tj px-1.5 py-0.5 tabular-nums">
              {imgIndex + 1}/{gallery.length}
            </span>
          )}
        </button>
        <Link to={`/shop/${product.id}`} className="pt-3 px-1 pb-1 block">
          <p className="font-display font-bold text-[11px] sm:text-xs uppercase tracking-[0.06em] text-[#0a0a0a] leading-snug line-clamp-2">
            {product.name}
          </p>
          <p className="mt-1 font-mono-tj text-[11px] sm:text-xs uppercase tracking-wide text-[#0a0a0a]">
            RS. {Number(product.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </Link>
      </div>
    );

    if (disableEntrance) {
      return <div className="h-full">{homeCard}</div>;
    }
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        viewport={{ once: true }}
        className="h-full"
      >
        {homeCard}
      </motion.div>
    );
  }

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
              hovering && hoverSrc ? '!opacity-0' : ''
            }`}
          />
          {hoverSrc && (
            <AsyncImage
              src={hoverSrc}
              alt=""
              fill
              aria-hidden
              loadingClassName="bg-transparent"
              imgClassName={hovering ? '!opacity-100' : '!opacity-0'}
            />
          )}
          <span className="absolute top-2 left-2 z-[1] bg-[var(--tj-shop)] text-black text-[10px] font-mono-tj uppercase tracking-wider px-2 py-1">
            {imageTag}
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
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`text-[10px] font-mono-tj uppercase tracking-[0.14em] ${
                      sizeError ? 'text-[#e34334]' : 'text-black/50'
                    }`}
                  >
                    {sizeError ? 'Select a size' : selectedSize ? `Size · ${selectedSize}` : 'Select size'}
                  </p>
                  <SizeChartLink
                    product={product}
                    className="text-[10px] font-mono-tj uppercase tracking-[0.12em] text-black/45 hover:text-black flex items-center gap-1 shrink-0"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => {
                    const isSelected = selectedSize === s.label;
                    const stockQty = typeof s.stock === 'number' ? s.stock : null;
                    const showLow = stockQty != null && stockQty > 0 && stockQty < 10;
                    return (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => {
                          setSelectedSize(s.label);
                          setSizeError(false);
                        }}
                        title={showLow ? `${s.label} — only ${stockQty} left` : s.label}
                        className={`min-w-[2.5rem] h-9 px-2.5 text-xs font-bold font-display border transition-all ${
                          isSelected
                            ? 'border-black bg-black text-white shadow-[2px_2px_0_0_rgba(0,0,0,0.15)]'
                            : sizeError
                              ? 'border-[#e34334]/40 text-black hover:border-black'
                              : 'border-black/15 text-black hover:border-black bg-white'
                        }`}
                      >
                        <span className="leading-none">{s.label}</span>
                        {showLow && (
                          <span
                            className={`block text-[9px] font-mono-tj mt-0.5 leading-none ${
                              isSelected ? 'text-white/80' : 'text-[#e34334]'
                            }`}
                          >
                            {stockQty}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {(() => {
                  const row = sizes.find((s) => s.label === selectedSize);
                  const qty = typeof row?.stock === 'number' ? row.stock : null;
                  if (qty == null || qty <= 0 || qty >= 10) return null;
                  return (
                    <p className="text-[10px] font-mono-tj text-[#e34334] uppercase tracking-wider">
                      Only {qty} left in {selectedSize}
                    </p>
                  );
                })()}
              </div>
            )}

            {!hasSizes &&
              typeof product.stock === 'number' &&
              product.stock > 0 &&
              product.stock < 10 && (
                <p className="text-[10px] font-mono-tj text-[#e34334] uppercase tracking-wider">
                  Only {product.stock} left
                </p>
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

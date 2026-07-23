import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isWishlisted, toggleWishlist, loading: wishlistLoading } = useWishlist();
  const [slidePos, setSlidePos] = useState(0);
  const [animateSlide, setAnimateSlide] = useState(true);
  const [paused, setPaused] = useState(false);
  const [selectedSize, setSelectedSize] = useState(null);
  const [sizeError, setSizeError] = useState(false);
  const sizes = availableSizes(product);
  const hasSizes = sizes.length > 0;
  const discount = productDiscountPercent(product);
  const gallery = galleryList(product);
  const primary = gallery[0] || '';
  const slides = gallery.length > 0 ? gallery : primary ? [primary] : [];
  const loop = slides.length > 1;
  /** Extra clone of first slide at the end so last→first also slides left. */
  const track = loop ? [...slides, slides[0]] : slides;
  const displayIndex = loop ? slidePos % slides.length : 0;
  const tagline = product.description?.split('.')[0]
    ? `${product.description.split('.')[0]}.`
    : '';
  const material = product.tags?.[0]
    ? String(product.tags[0]).replace(/-/g, ' ')
    : product.category;
  const imageTag = String(product.image_tag || '').trim();
  const wishlisted = isWishlisted(product.id);

  useEffect(() => {
    setSlidePos(0);
    setAnimateSlide(true);
  }, [product.id]);

  useEffect(() => {
    if (!loop || paused) return undefined;
    const id = setInterval(() => {
      setAnimateSlide(true);
      setSlidePos((i) => i + 1);
    }, 2500);
    return () => clearInterval(id);
  }, [loop, paused, product.id]);

  const handleSlideEnd = (e) => {
    if (!loop || e.target !== e.currentTarget) return;
    // Landed on cloned first slide — jump back to real first without animation.
    if (slidePos >= slides.length) {
      setAnimateSlide(false);
      setSlidePos(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateSlide(true));
      });
    }
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

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login', { state: { from: `/shop/${product.id}` } });
      toast.error('Sign in to save favourites');
      return;
    }
    try {
      const nowOn = await toggleWishlist(product.id);
      toast.success(nowOn ? 'Saved to wishlist' : 'Removed from wishlist');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update wishlist');
    }
  };

  const imageBlock = (aspectClass, linkWhole = true) => {
    const media = (
      <div
        className={`relative block w-full overflow-hidden ${aspectClass} bg-[var(--tj-bg-soft)]`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div
          className="absolute inset-0 flex will-change-transform"
          style={{
            transform: `translate3d(-${slidePos * 100}%, 0, 0)`,
            transition: animateSlide
              ? 'transform 650ms cubic-bezier(0.22, 1, 0.36, 1)'
              : 'none',
          }}
          onTransitionEnd={handleSlideEnd}
        >
          {track.map((src, i) => (
            <div
              key={`${product.id}-${src}-${i}`}
              className="relative h-full w-full shrink-0 grow-0 basis-full"
            >
              <AsyncImage
                src={src}
                alt={`${product.name}${i === 0 || (loop && i === track.length - 1) ? '' : ` — view ${i + 1}`}`}
                fill
              />
            </div>
          ))}
        </div>
        {loop && (
          <span className="absolute bottom-2 right-2 z-[1] bg-black/60 text-white text-[9px] font-mono-tj px-1.5 py-0.5 tabular-nums">
            {displayIndex + 1}/{slides.length}
          </span>
        )}
        {imageTag && (
          <span className="absolute top-2 left-2 z-[1] bg-[var(--tj-shop)] text-black text-[10px] font-mono-tj uppercase tracking-wider px-2 py-1">
            {imageTag}
          </span>
        )}
        {discount > 0 && (
          <span className="absolute top-2 right-2 z-[1] bg-black text-white text-[10px] font-mono-tj uppercase tracking-wider px-2 py-1">
            -{discount}%
          </span>
        )}
        <button
          type="button"
          onClick={handleWishlist}
          disabled={wishlistLoading}
          className="absolute bottom-2 left-2 z-[2] w-8 h-8 rounded-full bg-white/90 border border-black/10 flex items-center justify-center hover:bg-white"
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart
            size={14}
            className={wishlisted ? 'fill-[#e34334] text-[#e34334]' : 'text-black/60'}
          />
        </button>
      </div>
    );
    if (!linkWhole) return media;
    return (
      <Link to={`/shop/${product.id}`} className="block">
        {media}
      </Link>
    );
  };

  if (variant === 'home') {
    const homeCard = (
      <div className="flex flex-col h-full bg-white">
        {imageBlock('aspect-[3/4]')}
        <Link to={`/shop/${product.id}`} className="pt-3 px-1.5 pb-2 block">
          <p className="font-display font-bold text-[11px] sm:text-xs uppercase tracking-[0.06em] text-[#0a0a0a] leading-snug line-clamp-2">
            {product.name}
          </p>
          {tagline && (
            <p className="mt-1 text-[10px] sm:text-[11px] text-black/55 leading-snug line-clamp-2 font-body normal-case tracking-normal">
              {tagline}
            </p>
          )}
          <p className="mt-1.5 font-mono-tj text-[11px] sm:text-xs uppercase tracking-wide text-[#0a0a0a]">
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
        {imageBlock('aspect-[3/4]')}

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
                        className={`min-w-[2.25rem] px-2 py-1.5 text-[11px] font-mono-tj border transition-colors ${
                          isSelected
                            ? 'bg-black text-white border-black'
                            : 'border-black/20 hover:border-black'
                        }`}
                      >
                        {s.label}
                        {showLow ? (
                          <span className="block text-[8px] opacity-70">{stockQty} left</span>
                        ) : null}
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
              <ShoppingCart size={14} /> Add to cart
            </button>
          </div>
        </div>
      </div>
  );

  if (disableEntrance) return card;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      viewport={{ once: true }}
    >
      {card}
    </motion.div>
  );
}

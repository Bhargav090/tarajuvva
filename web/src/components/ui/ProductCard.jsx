import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';
import SizeChartLink from '../shop/SizeChartLink';
import {
  productHeroImage,
  resolveProductCardSrc,
  resolveProductImageSrc,
} from '../../utils/productImage';
import { productDiscountPercent } from '../../utils/productSale';
import AsyncImage from './AsyncImage';

const HOVER_CYCLE_MS = 2500;
const SWIPE_THRESHOLD_PX = 40;

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

export default function ProductCard({
  product,
  disableEntrance = false,
  variant = 'default',
  /** Prefer eager for above-the-fold cards on shop/home */
  imageLoading = 'lazy',
}) {
  const { addItem } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isWishlisted, toggleWishlist, loading: wishlistLoading } = useWishlist();
  const [activeIndex, setActiveIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [selectedSize, setSelectedSize] = useState(null);
  const [sizeError, setSizeError] = useState(false);
  const touchStartX = useRef(null);
  const swipeMoved = useRef(false);
  const sizes = availableSizes(product);
  const hasSizes = sizes.length > 0;
  const discount = productDiscountPercent(product);
  const gallery = galleryList(product);
  const primary = gallery[0] || '';
  const slides = gallery.length > 0 ? gallery : primary ? [primary] : [];
  const hasAltImages = slides.length > 1;
  const tagline = product.description?.split('.')[0]
    ? `${product.description.split('.')[0]}.`
    : '';
  const material = product.tags?.[0]
    ? String(product.tags[0]).replace(/-/g, ' ')
    : product.category;
  const imageTag = String(product.image_tag || '').trim();
  const wishlisted = isWishlisted(product.id);

  const activeSrc = slides[activeIndex] || slides[0] || '';
  const cardSrc = resolveProductCardSrc(activeSrc) || activeSrc;
  const nextIndex = hasAltImages ? (activeIndex + 1) % slides.length : -1;
  const nextFull = nextIndex >= 0 ? slides[nextIndex] : '';
  const nextCard = nextFull ? resolveProductCardSrc(nextFull) || nextFull : '';

  useEffect(() => {
    setActiveIndex(0);
  }, [product.id]);

  // Desktop: cycle only while hovered (~1s). No idle autoplay.
  useEffect(() => {
    if (!hasAltImages || !hovering) return undefined;
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % slides.length);
    }, HOVER_CYCLE_MS);
    return () => clearInterval(id);
  }, [hasAltImages, hovering, product.id, slides.length]);

  // Warm the next carousel frame without mounting all slides
  useEffect(() => {
    if (!nextCard) return undefined;
    const img = new Image();
    img.decoding = 'async';
    img.src = nextCard;
    return undefined;
  }, [nextCard]);

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

  const onTouchStart = (e) => {
    if (!hasAltImages) return;
    const t = e.touches?.[0];
    if (!t) return;
    touchStartX.current = t.clientX;
    swipeMoved.current = false;
  };

  const onTouchMove = (e) => {
    if (touchStartX.current == null) return;
    const t = e.touches?.[0];
    if (!t) return;
    if (Math.abs(t.clientX - touchStartX.current) > 10) {
      swipeMoved.current = true;
    }
  };

  const onTouchEnd = (e) => {
    if (!hasAltImages || touchStartX.current == null) {
      touchStartX.current = null;
      return;
    }
    const t = e.changedTouches?.[0];
    const dx = t ? t.clientX - touchStartX.current : 0;
    touchStartX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    e.preventDefault();
    e.stopPropagation();
    setActiveIndex((i) =>
      dx < 0 ? (i + 1) % slides.length : (i - 1 + slides.length) % slides.length
    );
  };

  const onMediaClick = (e) => {
    // Swipe just ended — don't navigate to PDP
    if (swipeMoved.current) {
      e.preventDefault();
      e.stopPropagation();
      swipeMoved.current = false;
    }
  };

  const imageBlock = (aspectClass, linkWhole = true) => {
    const media = (
      <div
        className={`relative block w-full overflow-hidden ${aspectClass} bg-[var(--tj-bg-soft)] touch-pan-y`}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => {
          setHovering(false);
          setActiveIndex(0);
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={onMediaClick}
      >
        <div className="absolute inset-0 z-0">
          <AsyncImage
            key={`${product.id}-${activeIndex}-${cardSrc}`}
            src={cardSrc}
            fallbackSrc={activeSrc}
            alt={product.name}
            fill
            loading={imageLoading}
          />
        </div>
        {hasAltImages && (
          <div
            className="absolute bottom-2 right-2 z-[1] flex gap-1 pointer-events-none"
            aria-hidden
          >
            {slides.map((_, i) => (
              <span
                key={i}
                className={`block h-1 w-1 rounded-full motion-safe:transition-colors motion-safe:duration-300 ${
                  i === activeIndex ? 'bg-white' : 'bg-white/45'
                }`}
              />
            ))}
          </div>
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
      <Link to={`/shop/${product.id}`} className="block" onClick={onMediaClick}>
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
      <div className="tj-card p-2 sm:p-3 md:p-4 hover:-translate-y-1 transition-transform h-full flex flex-col min-w-0">
        {imageBlock('aspect-[3/4]')}

        <div className="pt-2.5 sm:pt-3 md:pt-4 flex-1 flex flex-col min-h-0">
          <div className="flex items-start justify-between gap-1.5 sm:gap-2">
            <div className="min-w-0">
              <Link to={`/shop/${product.id}`}>
                <p className="font-display font-bold text-[13px] sm:text-base md:text-lg leading-tight text-[#0a0a0a] hover:opacity-70 transition-opacity line-clamp-2">
                  {product.name}
                </p>
              </Link>
              {tagline && (
                <p className="hidden sm:block text-xs text-black/55 mt-1 line-clamp-2 leading-snug">{tagline}</p>
              )}
            </div>
            <span className="font-mono-tj text-[11px] sm:text-sm shrink-0 pt-0.5 tabular-nums">
              ₹{product.price.toLocaleString('en-IN')}
            </span>
          </div>

          {material && (
            <p className="mt-1.5 sm:mt-2.5 text-[9px] sm:text-[11px] font-mono-tj text-black/50 uppercase tracking-wider truncate">
              {material}
            </p>
          )}

          <div className="mt-auto pt-2.5 sm:pt-4 border-t border-black/10 space-y-2 sm:space-y-3">
            {hasSizes && (
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <p
                    className={`text-[9px] sm:text-[10px] font-mono-tj uppercase tracking-[0.12em] sm:tracking-[0.14em] truncate ${
                      sizeError ? 'text-[#e34334]' : 'text-black/50'
                    }`}
                  >
                    {sizeError ? 'Select size' : selectedSize ? `Size - ${selectedSize}` : 'Select size'}
                  </p>
                  <SizeChartLink
                    product={product}
                    className="text-[9px] sm:text-[10px] font-mono-tj uppercase tracking-[0.1em] text-black/45 hover:text-black flex items-center gap-0.5 sm:gap-1 shrink-0"
                    compact
                  />
                </div>
                <div className="flex flex-nowrap gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
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
                        className={`shrink-0 min-w-[1.75rem] sm:min-w-[2.25rem] px-1.5 sm:px-2 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-mono-tj border transition-colors ${
                          isSelected
                            ? 'bg-black text-white border-black'
                            : 'border-black/20 hover:border-black'
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
              className="w-full flex items-center justify-center gap-1.5 sm:gap-2 border border-black py-2 sm:py-2.5 text-[10px] sm:text-xs font-bold uppercase tracking-[0.12em] sm:tracking-[0.18em] hover:bg-black hover:text-white transition-colors"
            >
              <ShoppingCart size={13} className="shrink-0" />
              <span className="sm:hidden">Add</span>
              <span className="hidden sm:inline">Add to cart</span>
            </button>
          </div>
        </div>
      </div>
  );

  if (disableEntrance) return <div className="h-full min-h-0">{card}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      viewport={{ once: true }}
      className="h-full"
    >
      {card}
    </motion.div>
  );
}

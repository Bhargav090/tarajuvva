import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, ArrowLeft, Tag, ChevronLeft, ChevronRight, Heart, ShieldCheck, RefreshCw, Hand } from 'lucide-react';
import toast from 'react-hot-toast';
import { useProduct } from '../../hooks/useProduct';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';
import { PRODUCT_IMAGE_PLACEHOLDER, resolveProductImageSrc } from '../../utils/productImage';
import Button from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Skeleton';
import SizeChartLink from '../../components/shop/SizeChartLink';
import AsyncImage from '../../components/ui/AsyncImage';

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { product, loading } = useProduct(id);
  const { addItem } = useCart();
  const { user } = useAuth();
  const { isWishlisted, toggleWishlist, loading: wishlistLoading } = useWishlist();
  const [activeImg, setActiveImg] = useState(0);
  const [adding, setAdding] = useState(false);
  const [selectedSize, setSelectedSize] = useState(null);
  const [sizeError, setSizeError] = useState(false);

  useEffect(() => {
    setActiveImg(0);
    setSelectedSize(null);
    setSizeError(false);
  }, [product?.id]);

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <Spinner size={36} />
    </div>
  );

  if (!product) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center">
      <p className="text-[#241621] font-display font-bold text-xl mb-4">Product not found.</p>
      <Link to="/shop" className="text-[#a8e000] font-semibold hover:underline font-display">← Back to Shop</Link>
    </div>
  );

  const hasSizes = Array.isArray(product?.sizes) && product.sizes.length > 0;
  const selectedSizeRow = hasSizes
    ? product.sizes.find((s) => s.label === selectedSize)
    : null;
  const remainingStock = (() => {
    if (selectedSizeRow) {
      if (typeof selectedSizeRow.stock === 'number') return selectedSizeRow.stock;
      return selectedSizeRow.available === false ? 0 : null;
    }
    if (hasSizes) return null;
    return typeof product.stock === 'number' ? product.stock : null;
  })();
  const isOutOfStock =
    remainingStock === 0 ||
    (!hasSizes && product.stock === 0) ||
    (hasSizes &&
      product.sizes.every((s) =>
        typeof s.stock === 'number' ? s.stock <= 0 : s.available === false
      ));

  const handleAdd = () => {
    if (hasSizes && !selectedSize) {
      setSizeError(true);
      return;
    }
    if (remainingStock === 0) {
      toast.error('This size is out of stock');
      return;
    }
    setAdding(true);
    addItem(product, selectedSize);
    toast.success(`${product.name}${selectedSize ? ` (${selectedSize})` : ''} added to cart! 🛍`);
    setTimeout(() => setAdding(false), 600);
  };

  const wishlisted = product ? isWishlisted(product.id) : false;
  const handleWishlist = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/shop/${id}` } });
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

  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : null;

  const gallery =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images.map(resolveProductImageSrc)
      : [PRODUCT_IMAGE_PLACEHOLDER];

  const waysToWear = Array.isArray(product.ways_to_wear)
    ? product.ways_to_wear.map((w) => String(w).trim()).filter(Boolean)
    : [];

  const goPrevImg = () => {
    if (gallery.length <= 1) return;
    setActiveImg((i) => (i - 1 + gallery.length) % gallery.length);
  };

  const goNextImg = () => {
    if (gallery.length <= 1) return;
    setActiveImg((i) => (i + 1) % gallery.length);
  };

  return (
    <div className="min-h-screen bg-white pt-2 sm:pt-4">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-[#241621]/55 hover:text-[#a8e000] font-display mb-8 transition-colors">
          <ArrowLeft size={15} /> Back to Shop
        </Link>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Left: product gallery */}
          <div className="min-w-0">
            <div className="aspect-[3/4] rounded-3xl overflow-hidden bg-white relative group">
              <AsyncImage
                src={gallery[activeImg]}
                alt={`${product.name}${activeImg === 0 ? '' : ` — view ${activeImg + 1}`}`}
                fill
                showSpinner
                fallbackSrc={PRODUCT_IMAGE_PLACEHOLDER}
                imgClassName="transition-opacity duration-200"
              />
              {discount && (
                <span className="absolute top-4 left-4 z-[2] bg-[#e34334] text-white text-sm font-black rounded-full px-3 py-1 font-display">
                  -{discount}% OFF
                </span>
              )}
              {String(product.image_tag || '').trim() && (
                <span className="absolute top-4 right-4 z-[2] bg-[var(--tj-shop)] text-black text-xs font-mono-tj uppercase tracking-wider px-2.5 py-1">
                  {String(product.image_tag).trim()}
                </span>
              )}

              {gallery.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goPrevImg}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-[2] w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/90 border border-black/10 shadow-sm flex items-center justify-center text-[#0a0a0a] hover:bg-white hover:border-black/25 transition-all"
                  >
                    <ChevronLeft size={22} strokeWidth={2.25} />
                  </button>
                  <button
                    type="button"
                    onClick={goNextImg}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-[2] w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/90 border border-black/10 shadow-sm flex items-center justify-center text-[#0a0a0a] hover:bg-white hover:border-black/25 transition-all"
                  >
                    <ChevronRight size={22} strokeWidth={2.25} />
                  </button>
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[2] bg-black/55 text-white text-[10px] font-mono-tj px-2 py-1 rounded-full tabular-nums">
                    {activeImg + 1} / {gallery.length}
                  </span>
                </>
              )}
            </div>

            {gallery.length > 1 && (
              <div
                className="mt-3 flex gap-2.5 overflow-x-auto pb-1 snap-x snap-mandatory scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="listbox"
                aria-label="Product images"
              >
                {gallery.map((img, i) => (
                  <button
                    key={img + i}
                    type="button"
                    role="option"
                    aria-selected={activeImg === i}
                    onClick={() => setActiveImg(i)}
                    className={`relative shrink-0 w-16 sm:w-20 aspect-square rounded-xl overflow-hidden border-2 snap-start transition-all ${
                      activeImg === i
                        ? 'border-black'
                        : 'border-[#241621]/10 hover:border-[#241621]/35'
                    }`}
                  >
                    <AsyncImage
                      src={img}
                      alt={`${product.name} thumbnail ${i + 1}`}
                      fill
                      loadingClassName="bg-[#241621]/5 animate-pulse"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <span className="text-xs font-bold text-[#a8e000] uppercase tracking-widest font-display">{product.category}</span>
            <h1 className="text-3xl sm:text-4xl font-black text-[#241621] font-display mt-2 mb-4 leading-tight">{product.name}</h1>

            {/* Price */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl font-black text-[#a8e000] font-display">₹{product.price.toLocaleString('en-IN')}</span>
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

            {/* Size selector */}
            {hasSizes && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-sm font-bold font-display ${sizeError ? 'text-[#e34334]' : 'text-[#241621]'}`}>
                    Select size{selectedSize ? ` — ${selectedSize}` : ''}{sizeError ? ' (required)' : ''}
                  </p>
                  <SizeChartLink product={product} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map(s => {
                    const isSelected = selectedSize === s.label;
                    const stockQty = typeof s.stock === 'number' ? s.stock : null;
                    const isOOS =
                      typeof s.stock === 'number' ? s.stock <= 0 : s.available === false;
                    const showLow = stockQty != null && stockQty > 0 && stockQty < 10;
                    return (
                      <button
                        key={s.label}
                        type="button"
                        disabled={isOOS}
                        onClick={() => {
                          if (!isOOS) {
                            setSelectedSize(s.label);
                            setSizeError(false);
                          }
                        }}
                        title={
                          isOOS
                            ? 'Out of stock'
                            : showLow
                              ? `${s.label} — only ${stockQty} left`
                              : s.label
                        }
                        className={[
                          'relative min-w-[3.5rem] h-10 px-2 text-sm font-bold font-display border transition-all',
                          isOOS
                            ? 'border-[#241621]/12 text-[#241621]/25 bg-[#241621]/3 cursor-not-allowed'
                            : isSelected
                              ? 'border-black bg-black text-white'
                              : 'border-[#241621]/20 text-[#241621] hover:border-black',
                        ].join(' ')}
                      >
                        <span className="block leading-none">{s.label}</span>
                        {showLow && (
                          <span
                            className={`block text-[9px] font-mono-tj mt-0.5 ${
                              isSelected ? 'text-white/80' : 'text-[#e34334]'
                            }`}
                          >
                            {stockQty} left
                          </span>
                        )}
                        {isOOS && (
                          <span
                            className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            aria-hidden
                          >
                            <span className="block w-[110%] h-px bg-[#241621]/20 rotate-[-30deg] absolute" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {sizeError && (
                  <p className="text-xs text-[#e34334] mt-2 font-display">Please select a size to continue.</p>
                )}
              </div>
            )}

            {/* Ways to wear — only when admin has added entries */}
            {waysToWear.length > 0 && (
              <div className="mb-8">
                <p className="text-sm font-bold font-display text-[#241621] mb-3">Ways to wear</p>
                <ul className="space-y-2">
                  {waysToWear.map((way) => (
                    <li
                      key={way}
                      className="flex gap-2.5 text-sm text-[#241621]/70 font-body leading-relaxed"
                    >
                      <span className="mt-2 shrink-0 w-1.5 h-1.5 rounded-full bg-[#a8e000]" aria-hidden />
                      <span>{way}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {product.tags.map(t => (
                  <span key={t} className="flex items-center gap-1 bg-[#c8ff2e]/8 text-[#a8e000] text-xs font-semibold rounded-full px-3 py-1 font-display">
                    <Tag size={10} /> {t}
                  </span>
                ))}
              </div>
            )}

            {/* Low stock */}
            {remainingStock != null && remainingStock > 0 && remainingStock < 10 && (
              <p className="text-[#e34334] text-xs font-bold font-display mb-4">
                Only {remainingStock} left{selectedSize ? ` in size ${selectedSize}` : ''}!
              </p>
            )}

            {/* CTA */}
            <div className="flex gap-3">
              <Button
                variant="primary" size="xl" fullWidth icon={ShoppingBag}
                onClick={handleAdd} loading={adding}
                disabled={isOutOfStock || (hasSizes && remainingStock === 0)}
              >
                {isOutOfStock || remainingStock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </Button>
              <button
                type="button"
                onClick={handleWishlist}
                disabled={wishlistLoading}
                aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                className="shrink-0 w-14 h-14 rounded-xl border border-[#241621]/15 bg-white flex items-center justify-center hover:border-[#241621]/40 transition-colors disabled:opacity-50"
              >
                <Heart
                  size={22}
                  className={wishlisted ? 'fill-[#e34334] text-[#e34334]' : 'text-[#241621]/50'}
                />
              </button>
            </div>

            {/* Assurance */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                {
                  label: 'Repair guaranteed',
                  Icon: ShieldCheck,
                  tip: 'Includes 2 complimentary repairs with every item purchased',
                },
                { label: 'Circular fashion', Icon: RefreshCw },
                { label: 'Handmade', Icon: Hand },
              ].map(({ label, Icon, tip }) => (
                <div
                  key={label}
                  className="relative group text-center p-3 bg-white rounded-xl border border-[#241621]/8 flex flex-col items-center gap-1.5"
                >
                  <Icon size={18} strokeWidth={1.75} className="text-[#241621]/55" aria-hidden />
                  <span className="text-[10px] sm:text-[11px] font-semibold text-[#241621]/70 font-display leading-snug block">
                    {label}
                  </span>
                  {tip && (
                    <div
                      role="tooltip"
                      className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+0.5rem)] z-20 w-44 sm:w-52 rounded-lg border border-black bg-white px-3 py-2 text-[11px] leading-snug text-[#241621]/80 font-body opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shadow-[3px_3px_0_0_#000]"
                    >
                      {tip}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

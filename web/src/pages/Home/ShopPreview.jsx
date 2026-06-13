import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import ProductCard from '../../components/ui/ProductCard';
import { useProducts } from '../../hooks/useProducts';

const AUTO_SLIDE_MS = 4500;
const SWIPE_THRESHOLD_PX = 48;

function MobileProductSkeleton() {
  return (
    <div className="tj-card p-3 animate-pulse">
      <div className="aspect-[3/4] bg-black/5" />
      <div className="pt-3 space-y-2">
        <div className="h-4 bg-black/5 rounded w-3/4" />
        <div className="h-3 bg-black/5 rounded w-full" />
      </div>
    </div>
  );
}

function MobileProductSlider({ products }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const touchStartX = useRef(null);
  const didSwipe = useRef(false);
  const timerRef = useRef(null);

  const goNext = useCallback(() => {
    setDirection(1);
    setIndex((prev) => (prev + 1) % products.length);
  }, [products.length]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setIndex((prev) => (prev - 1 + products.length) % products.length);
  }, [products.length]);

  const resetAutoSlide = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (products.length <= 1) return;
    timerRef.current = setInterval(goNext, AUTO_SLIDE_MS);
  }, [products.length, goNext]);

  useEffect(() => {
    setIndex(0);
    setDirection(1);
  }, [products.length]);

  useEffect(() => {
    resetAutoSlide();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resetAutoSlide]);

  const goTo = (i) => {
    setDirection(i > index ? 1 : -1);
    setIndex(i);
    resetAutoSlide();
  };

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    didSwipe.current = false;
  };

  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    didSwipe.current = true;
    if (delta < 0) {
      goNext();
    } else {
      goPrev();
    }
    resetAutoSlide();
  };

  const onClickCapture = (e) => {
    if (didSwipe.current) {
      e.preventDefault();
      e.stopPropagation();
      didSwipe.current = false;
    }
  };

  const current = products[index];
  const slideX = direction > 0 ? 20 : -20;

  return (
    <div className="md:hidden">
      <div
        className="overflow-hidden touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClickCapture={onClickCapture}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: slideX }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -slideX }}
            transition={{ duration: 0.3 }}
          >
            <ProductCard product={current} />
          </motion.div>
        </AnimatePresence>
      </div>

      {products.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          {products.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => goTo(i)}
              className={`h-2.5 rounded-full transition-all ${
                i === index ? 'w-7 bg-black' : 'w-2.5 bg-black/25'
              }`}
              aria-label={`View product ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ShopPreview() {
  const { products, loading } = useProducts({ limit: 4 });

  return (
    <section className="tj-section border-b border-black bg-white !pt-8 md:!pt-10 lg:!pt-12" data-testid="shop-highlight">
      <div className="tj-container">
        <div className="flex items-end justify-between mb-10">
          <div className="flex flex-col gap-1.5">
            <p className="tj-eyebrow m-0 leading-snug">01 · Shop</p>
            <h2 className="tj-h2 m-0 leading-tight text-[#0a0a0a]">
              Pieces that <span className="italic font-light">do six jobs.</span>
            </h2>
          </div>
          <Link
            to="/shop"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-bold uppercase tracking-[0.18em] border-b border-black pb-1 hover:opacity-70 transition-opacity"
            data-testid="see-all-shop"
          >
            See all <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <>
            <div className="md:hidden">
              <MobileProductSkeleton />
              <div className="flex items-center justify-center gap-2 mt-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <span key={i} className="h-2.5 w-2.5 rounded-full bg-black/15" />
                ))}
              </div>
            </div>
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <MobileProductSkeleton key={i} />
              ))}
            </div>
          </>
        ) : (
          <>
            <MobileProductSlider products={products} />
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </>
        )}

        <div className="mt-10 sm:hidden text-center">
          <Link
            to="/shop"
            className="inline-flex items-center gap-1 text-sm font-bold uppercase tracking-[0.18em] border-b border-black pb-1"
          >
            See all <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}

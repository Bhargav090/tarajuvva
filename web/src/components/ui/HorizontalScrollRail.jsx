import { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Horizontal scroll region with edge fades + chevrons when content overflows.
 */
export default function HorizontalScrollRail({
  children,
  className = '',
  innerClassName = '',
  ariaLabel = 'Scrollable list',
}) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollHints = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollHints();
    el.addEventListener('scroll', updateScrollHints, { passive: true });
    const ro = new ResizeObserver(updateScrollHints);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollHints);
      ro.disconnect();
    };
  }, [updateScrollHints, children]);

  const scrollBy = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 140, behavior: 'smooth' });
  };

  return (
    <div className={`relative min-w-0 ${className}`}>
      {canScrollLeft && (
        <>
          <div className="tj-scroll-fade tj-scroll-fade--left pointer-events-none" aria-hidden />
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            className="tj-scroll-arrow tj-scroll-arrow--left"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
        </>
      )}

      {canScrollRight && (
        <>
          <div className="tj-scroll-fade tj-scroll-fade--right pointer-events-none" aria-hidden />
          <button
            type="button"
            onClick={() => scrollBy(1)}
            className="tj-scroll-arrow tj-scroll-arrow--right"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </>
      )}

      <div
        ref={scrollRef}
        className={`flex items-center overflow-x-auto no-scrollbar scroll-smooth ${innerClassName}`}
        aria-label={ariaLabel}
        role="region"
      >
        {children}
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { BRAND } from '../../utils/constants';

export const LOOP_VERTICALS = [
  {
    num: '01',
    action: 'Shop',
    to: '/shop',
    color: BRAND.green,
    textOnColor: BRAND.dark,
    headline: 'New garments built for 100 outfits.',
    subline: 'Modular, functional, easy-wear pieces.',
    cta: 'Shop the drop',
  },
  {
    num: '02',
    action: 'Reimagine',
    to: '/reimagine',
    color: BRAND.burgundy,
    textOnColor: BRAND.textLight,
    headline: 'Send us your old. Get back your new.',
    subline: 'Upcycle into modern presets or go custom.',
    cta: 'Start a remake',
  },
  {
    num: '03',
    action: 'Repair',
    to: '/repair',
    color: '#1a3df0',
    textOnColor: BRAND.textLight,
    headline: 'The mend is the mood.',
    subline: "Coming soon: we'll mend it back to life.",
    cta: 'Notify me',
  },
  {
    num: '04',
    action: 'Donate',
    to: '/donate',
    color: '#ff6a1a',
    textOnColor: BRAND.dark,
    headline: "If we can't reuse it, someone else will.",
    subline: 'Give garments their next life.',
    cta: 'Notify me',
  },
];

const NODE_POSITIONS = [
  { top: '0%', left: '50%' },
  { top: '50%', left: '100%' },
  { top: '100%', left: '50%' },
  { top: '50%', left: '0%' },
];

export function useLoopVerticalState(initialIndex = 0) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [hoverIndex, setHoverIndex] = useState(null);

  const displayIndex = hoverIndex ?? activeIndex;
  const active = LOOP_VERTICALS[displayIndex];

  return {
    activeIndex,
    setActiveIndex,
    hoverIndex,
    setHoverIndex,
    displayIndex,
    active,
  };
}

function LoopNode({ vertical, position, isHighlighted, onEnter, onLeave, onSelect }) {
  return (
    <button
      type="button"
      className="absolute z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#241621] focus-visible:ring-offset-2"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translate(-50%, -50%)',
      }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onClick={onSelect}
      aria-label={`${vertical.num} ${vertical.action}`}
      aria-pressed={isHighlighted}
    >
      <div
        className={[
          'w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full',
          'flex flex-col items-center justify-center border-2 border-[#241621]',
          'transition-all duration-300',
          isHighlighted ? 'scale-110 shadow-[6px_6px_0_0_#000]' : 'scale-100',
        ].join(' ')}
        style={{ background: vertical.color, color: vertical.textOnColor }}
      >
        <span className="text-[10px] sm:text-xs font-bold font-display tracking-widest opacity-90">
          {vertical.num}
        </span>
        <span className="text-sm sm:text-base md:text-lg font-black font-display leading-tight">
          {vertical.action}
        </span>
      </div>
    </button>
  );
}

export default function FashionLoop({
  activeIndex,
  onActiveChange,
  hoverIndex,
  onHoverChange,
}) {
  const displayIndex = useMemo(
    () => (hoverIndex !== null && hoverIndex !== undefined ? hoverIndex : activeIndex),
    [hoverIndex, activeIndex],
  );

  return (
    <div className="relative w-full max-w-[440px] aspect-square mx-auto">
      {/* Outermost dashed orbit — rotates to suggest the closed loop cycle */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none fashion-loop-orbit"
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden
      >
        <circle
          cx="100"
          cy="100"
          r="98"
          stroke="#241621"
          strokeWidth="0.5"
          strokeDasharray="2 4"
        />
      </svg>

      <div className="absolute inset-6 rounded-full border border-[#241621]/20 pointer-events-none" />
      <div className="absolute inset-16 rounded-full border border-[#241621]/10 pointer-events-none" />

      <div className="absolute inset-[22%] flex flex-col items-center justify-center text-center pointer-events-none px-4">
        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] font-display text-[#241621]/45 leading-relaxed">
          Circular Fashion
          <br />
          OS
          <br />
          v1.0 — IN
        </p>
      </div>

      {LOOP_VERTICALS.map((vertical, i) => (
        <LoopNode
          key={vertical.action}
          vertical={vertical}
          position={NODE_POSITIONS[i]}
          isHighlighted={displayIndex === i}
          onEnter={() => onHoverChange(i)}
          onLeave={() => onHoverChange(null)}
          onSelect={() => onActiveChange(i)}
        />
      ))}
    </div>
  );
}

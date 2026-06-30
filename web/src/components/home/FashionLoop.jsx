import { useMemo, useState } from 'react';

export const LOOP_VERTICALS = [
  {
    num: '01',
    action: 'Shop',
    to: '/shop',
    color: '#c8ff2e',
    textOnColor: '#0a0a0a',
    headline: 'Clothes that keep up with change.',
    subline: 'Modular garments designed for everyday versatility and long-term wear',
    cta: 'Shop the collection',
  },
  {
    num: '02',
    action: 'Reimagine',
    cardLabel: 'Remake',
    to: '/reimagine',
    color: '#7A063C',
    textOnColor: '#ffffff',
    headline: 'Your old favourites, made new again.',
    subline: 'Transform existing garments into updated pieces through upcycling and customization',
    cta: 'Start a remake',
  },
  {
    num: '03',
    action: 'Repair',
    to: '/repair',
    color: '#1a3df0',
    textOnColor: '#ffffff',
    headline: 'Good clothes deserve another chance.',
    subline: 'Expert repairs that keep your wardrobe in rotation for longer.',
    cta: 'Book a repair',
  },
  {
    num: '04',
    action: 'Donate',
    to: '/donate',
    color: '#ff6a1a',
    textOnColor: '#ffffff',
    headline: 'What you no longer wear still holds value.',
    subline: 'Donate pre-loved clothing to keep garments in circulation and out of landfill',
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
      className="absolute z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
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
          'flex flex-col items-center justify-center border-2 border-black',
          'transition-all duration-300',
          isHighlighted ? 'scale-110 shadow-[6px_6px_0_0_#0a0a0a]' : 'scale-100 shadow-none',
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
    <div className="relative w-full max-w-[520px] aspect-square mx-auto">
      {/* Safe gutter keeps edge nodes fully visible on mobile. */}
      <div className="absolute inset-10 sm:inset-12 md:inset-14">
        {/* Outer dashed orbit — rotates */}
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
            stroke="#0a0a0a"
            strokeWidth="0.6"
            strokeDasharray="2 4"
          />
        </svg>

        {/* Inner solid rings — static light grey */}
        <div className="absolute inset-6 rounded-full border border-black/20 pointer-events-none" />
        <div className="absolute inset-16 rounded-full border border-black/10 pointer-events-none" />

        <div className="absolute inset-[22%] flex flex-col items-center justify-center text-center pointer-events-none px-4">
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.22em] font-display text-black/40 leading-none">
            Circular Fashion
          </p>
          <p className="font-display font-black text-5xl sm:text-6xl text-[#0a0a0a] leading-none mt-1">
            OS
          </p>
          <p className="text-[9px] sm:text-[10px] font-mono-tj uppercase tracking-[0.18em] text-black/45 mt-1.5">
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
    </div>
  );
}

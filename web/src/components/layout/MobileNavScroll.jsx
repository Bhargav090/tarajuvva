import { useRef, useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { NAV_LINKS } from '../../utils/constants';
import HorizontalScrollRail from '../ui/HorizontalScrollRail';

const VERTICAL_NAV_COLORS = {
  Shop: 'var(--tj-shop-deep)',
  Reimagine: '#de78a4',
  Repair: 'var(--tj-repair)',
  Donate: 'var(--tj-donate)',
};

export default function MobileNavScroll() {
  return (
    <div className="md:hidden border-t border-black/8">
      <HorizontalScrollRail
        ariaLabel="Main navigation"
        innerClassName="gap-1 px-3 py-2.5"
      >
        {NAV_LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold font-display whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-black text-white'
                  : 'text-black/70 hover:text-black hover:bg-black/[0.04]'
              }`
            }
            style={({ isActive }) => {
              const c = VERTICAL_NAV_COLORS[l.label];
              if (!c || isActive) return undefined;
              return { color: `color-mix(in srgb, ${c} 78%, #000 22%)` };
            }}
          >
            {l.label}
          </NavLink>
        ))}
      </HorizontalScrollRail>
    </div>
  );
}

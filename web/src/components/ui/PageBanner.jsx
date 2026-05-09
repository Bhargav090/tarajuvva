import { AccentPill } from './Badge';

/**
 * PageBanner — full-width hero for sub-pages.
 */
export default function PageBanner({ badge, badgeColor, title, subtitle, children, darkBg = false }) {
  return (
    <section
      className="px-4 pt-28 pb-16 sm:pt-32 sm:pb-20"
      style={{ background: darkBg ? '#0b4722' : '#eef4d1' }}
    >
      <div className="max-w-5xl mx-auto">
        {badge && (
          <div className="mb-5">
            <AccentPill color={darkBg ? '#eef4d1' : badgeColor}>{badge}</AccentPill>
          </div>
        )}
        <h1
          className="font-[Outfit] font-black leading-[1.05] text-4xl sm:text-5xl lg:text-7xl tracking-tight"
          style={{ color: darkBg ? '#eef4d1' : '#341631' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="mt-5 text-lg sm:text-xl font-[Poppins] leading-relaxed max-w-2xl"
            style={{ color: darkBg ? 'rgba(238,244,209,0.7)' : 'rgba(52,22,49,0.6)' }}
          >
            {subtitle}
          </p>
        )}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}

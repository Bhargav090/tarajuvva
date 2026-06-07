import LeadCapture from './LeadCapture';
import VerticalPageHero from './VerticalPageHero';

/**
 * Full-bleed waitlist hero — shared by Repair & Donate (matches reference layout).
 */
export default function VerticalWaitlistPage({ config }) {
  return (
    <VerticalPageHero
      bgVar={config.bgVar}
      eyebrow={config.eyebrow}
      headline={config.headline}
      subtext={config.subtext}
      blobPosition={config.blobPosition}
      testId={`${config.type}-page`}
      tall
    >
      <div className="mt-8 md:mt-10 max-w-lg">
        <p className="tj-eyebrow mb-3">{config.formLabel}</p>
        <LeadCapture type={config.type} testId={`lead-${config.type}`} variant="hero" />
      </div>

      <ul className="mt-10 md:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 max-w-2xl">
        {config.stats.map((s) => (
          <li key={s.label} className="border border-white/30 p-4 md:p-5">
            <div className="font-display text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              {s.value}
            </div>
            <p className="text-white/60 text-[10px] md:text-xs font-mono-tj uppercase tracking-[0.18em] mt-1">
              {s.label}
            </p>
          </li>
        ))}
      </ul>
    </VerticalPageHero>
  );
}

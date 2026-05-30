import LeadCapture from './LeadCapture';

/**
 * Full-bleed waitlist hero — shared by Repair & Donate (matches reference layout).
 */
export default function VerticalWaitlistPage({ config }) {
  const blobClass =
    config.blobPosition === 'bottom'
      ? 'tj-blob bg-white w-[500px] h-[500px] -bottom-40 -left-32 opacity-20'
      : 'tj-blob bg-white w-[500px] h-[500px] -top-32 -right-32 opacity-20';

  return (
    <section
      className="tj-vertical-hero min-h-[80vh] flex items-center border-b border-black relative overflow-hidden"
      style={{ background: `var(${config.bgVar})` }}
      data-testid={`${config.type}-page`}
    >
      <div className={blobClass} aria-hidden />
      <div className="tj-container relative w-full flex justify-center md:justify-start py-14 md:py-20 md:pl-[clamp(2rem,11vw,12rem)]">
        <div className="w-full max-w-xl lg:max-w-2xl">
          <p className="tj-eyebrow">{config.eyebrow}</p>
          <h1 className="tj-vertical-hero-title mt-4 text-white">
            {config.headline[0]}
            <br />
            <span className="italic font-light text-white/95">{config.headline[1]}</span>
          </h1>
          <p className="text-base md:text-lg text-white/80 max-w-lg mt-5 leading-relaxed">
            {config.subtext}
          </p>

          <div className="mt-8 md:mt-10 max-w-lg">
            <p className="tj-eyebrow mb-3">{config.formLabel}</p>
            <LeadCapture type={config.type} testId={`lead-${config.type}`} variant="hero" />
          </div>

          <ul className="mt-10 md:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 max-w-2xl">
            {config.stats.map(s => (
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
        </div>
      </div>
    </section>
  );
}

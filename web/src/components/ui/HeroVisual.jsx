import AsyncImage from './AsyncImage';

const VARIANTS = {
  home: {
    tag: 'Banthibhojanam collection SS2026',
    ribbon: 'Circular fashion OS',
    showRibbon: true,
  },
  reimagine: {
    tag: 'Remake · Transform',
    ribbon: null,
    showRibbon: false,
  },
};

export default function HeroVisual({
  heroSrc,
  heroVideo,
  hero,
  testId,
  variant = 'home',
  size = 'full',
  width,
  height,
}) {
  const config = VARIANTS[variant] || VARIANTS.home;
  const isCompact = size === 'compact';
  const isSide = size === 'side';
  const w = width ?? (isSide ? 440 : isCompact ? 280 : 640);
  const h = height ?? (isSide ? 385 : isCompact ? 245 : 560);

  return (
    <div
      className={`tj-hero-visual group${
        isCompact ? ' tj-hero-visual--compact' : isSide ? ' tj-hero-visual--side' : ''
      }`}
      style={{
        width: w,
        height: h,
        maxWidth: '100%',
        maxHeight: h,
      }}
      data-testid={testId}
    >
      <div className="tj-hero-visual-glow" aria-hidden />
      <div className="tj-hero-visual-accent tj-hero-visual-accent--secondary" aria-hidden />
      <div className="tj-hero-visual-accent" aria-hidden />
      <div className="tj-hero-visual-frame">
        {heroVideo ? (
          <video
            src={heroVideo}
            autoPlay
            loop
            muted
            playsInline
            className="tj-hero-visual-media tj-hero-visual-media--video"
            aria-hidden
          />
        ) : (
          <AsyncImage
            src={heroSrc}
            alt=""
            fill
            width={hero?.width}
            height={hero?.height}
            showSpinner
            imgClassName="!object-cover !object-center"
          />
        )}
        <div className="tj-hero-visual-shimmer" aria-hidden />
      </div>
      <span className="tj-hero-visual-tag">{config.tag}</span>
      {config.showRibbon && (
        <span className="tj-hero-visual-ribbon" aria-hidden>
          {config.ribbon}
        </span>
      )}
    </div>
  );
}

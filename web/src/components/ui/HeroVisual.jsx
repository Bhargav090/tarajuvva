import AsyncImage from './AsyncImage';
import { sideWidthForAspect } from '../../utils/aspectRatio';

const VARIANTS = {
  home: {
    tag: 'Banthibhojanam collection SS2026',
    ribbon: 'Circular fashion OS',
    showRibbon: true,
    showSecondaryAccent: false,
    tagClass: '',
  },
  reimagine: {
    tag: 'Remake · Transform',
    ribbon: null,
    showRibbon: false,
    showSecondaryAccent: false,
    tagClass: '',
  },
  repair: {
    tag: 'Repair · Wear longer',
    ribbon: null,
    showRibbon: false,
    showSecondaryAccent: false,
    tagClass: 'tj-hero-visual-tag--repair',
  },
  donate: {
    tag: 'Donate · Keep it in loop',
    ribbon: null,
    showRibbon: false,
    showSecondaryAccent: false,
    tagClass: 'tj-hero-visual-tag--donate',
  },
};

export default function HeroVisual({
  heroSrc,
  heroVideo,
  hero,
  testId,
  variant = 'home',
  size = 'full',
  aspectRatio,
  width,
  height,
  fillTall = false,
}) {
  const config = VARIANTS[variant] || VARIANTS.home;
  const isCompact = size === 'compact';
  const isSide = size === 'side';
  const isFluid = size === 'fluid';
  const w = width ?? (isSide ? sideWidthForAspect(aspectRatio) : isCompact ? 280 : 480);
  const h = height ?? (isSide ? 385 : isCompact ? 245 : 640);
  const ratioClass = aspectRatio ? ` tj-hero-visual--ratio-${aspectRatio.replace('/', '-')}` : '';

  return (
    <div
      className={`tj-hero-visual group${
        isFluid ? ' tj-hero-visual--fluid' : ''
      }${isCompact ? ' tj-hero-visual--compact' : ''      }${isSide ? ' tj-hero-visual--side' : ''}${
        variant === 'home' ? ' tj-hero-visual--home' : ''
      }${variant === 'reimagine' ? ' tj-hero-visual--reimagine' : ''}${fillTall ? ' tj-hero-visual--fill-tall' : ''}${ratioClass}`}
      style={
        isFluid
          ? undefined
          : aspectRatio
            ? {
                width: w,
                aspectRatio,
                height: 'auto',
                maxWidth: '100%',
              }
            : {
                width: w,
                height: h,
                maxWidth: '100%',
                maxHeight: h,
              }
      }
      data-testid={testId}
    >
      <div className="tj-hero-visual-glow" aria-hidden />
      {variant !== 'home' && (
        <>
          <div className="tj-hero-visual-accent" aria-hidden />
          {config.showSecondaryAccent && (
            <div className="tj-hero-visual-accent tj-hero-visual-accent--secondary" aria-hidden />
          )}
        </>
      )}
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
            imgClassName="!object-cover !object-center tj-hero-visual-media"
          />
        )}
        <div className="tj-hero-visual-shimmer" aria-hidden />
      </div>
      <span className={`tj-hero-visual-tag${config.tagClass ? ` ${config.tagClass}` : ''}`}>
        {config.tag}
      </span>
      {config.showRibbon && (
        <span className="tj-hero-visual-ribbon" aria-hidden>
          {config.ribbon}
        </span>
      )}
    </div>
  );
}

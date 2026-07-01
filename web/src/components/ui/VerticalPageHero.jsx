import HeroVisual from './HeroVisual';
import { SIDE_ASPECT_WIDTH, TALL_SIDE_ASPECT_WIDTH, aspectHeight } from '../../utils/aspectRatio';

/**
 * Full-bleed vertical hero — filled brand color + soft glow blob (Repair / Shop / Reimagine).
 * tone="dark" for light backgrounds (Shop lime); default "light" for deep brand colors.
 * tall=true (Repair / Donate): grid layout with side visual from tablet up.
 * tall=false (Reimagine): compact copy block + floating visual on desktop.
 */
export default function VerticalPageHero({
  bgVar,
  eyebrow,
  headline,
  subtext,
  blobPosition = 'top',
  testId,
  tall = false,
  tone = 'light',
  children,
  heroSrc = null,
  heroVideo = null,
  hero = null,
  heroLoading = false,
  visualVariant = 'reimagine',
  visualAspect,
  visualPosition = 'right',
  afterVisual = null,
}) {
  const isDarkTone = tone === 'dark';
  const sideWidths = tall ? { ...SIDE_ASPECT_WIDTH, ...TALL_SIDE_ASPECT_WIDTH } : SIDE_ASPECT_WIDTH;
  const visualWidth = sideWidths[visualAspect] ?? 440;
  const visualHeight = visualAspect ? aspectHeight(visualWidth, visualAspect) : 385;
  const mobileVisualWidth = tall
    ? visualAspect === '3/4'
      ? 340
      : visualAspect === '4/5'
        ? 320
        : 420
    : visualAspect === '3/4'
      ? 300
      : visualAspect === '4/5'
        ? 288
        : 400;
  const mobileVisualHeight = visualAspect ? aspectHeight(mobileVisualWidth, visualAspect) : 315;
  const showVisualSlot = heroLoading || Boolean(heroSrc) || Boolean(heroVideo);
  const desktopVisualBreakpoint = tall ? 'md' : 'lg';
  const copyClassName = tall
    ? 'tj-vertical-hero-copy max-w-xl lg:max-w-2xl min-w-0'
    : 'max-w-xl lg:max-w-2xl min-w-0';

  const sideSkeleton = (
    <div
      className="tj-hero-visual tj-hero-visual--side"
      style={{
        width: visualAspect ? visualWidth : 440,
        height: visualAspect ? visualHeight : 385,
        maxWidth: '100%',
        maxHeight: visualAspect ? visualHeight : 385,
      }}
      aria-hidden
    >
      <div className="tj-hero-visual-frame h-full animate-pulse bg-white/10" />
    </div>
  );

  const mobileSideSkeleton = tall ? (
    <div
      className="tj-hero-visual tj-hero-visual--side tj-hero-visual--fluid w-full"
      style={visualAspect ? { aspectRatio: visualAspect } : undefined}
      aria-hidden
    >
      <div className="tj-hero-visual-frame h-full animate-pulse bg-white/10" />
    </div>
  ) : (
    <div
      className="tj-hero-visual tj-hero-visual--side w-full"
      style={{
        width: visualAspect ? mobileVisualWidth : undefined,
        maxWidth: visualAspect ? mobileVisualWidth : 400,
        height: visualAspect ? mobileVisualHeight : 315,
      }}
      aria-hidden
    >
      <div className="tj-hero-visual-frame h-full animate-pulse bg-white/10" />
    </div>
  );

  const desktopVisual = heroLoading ? (
    sideSkeleton
  ) : (
    <HeroVisual
      heroSrc={heroSrc}
      heroVideo={heroVideo}
      hero={hero}
      testId={`${testId}-image`}
      variant={visualVariant}
      size="side"
      aspectRatio={visualAspect}
      width={tall ? visualWidth : undefined}
    />
  );

  const mobileVisual = heroLoading ? (
    mobileSideSkeleton
  ) : tall ? (
    <HeroVisual
      heroSrc={heroSrc}
      heroVideo={heroVideo}
      hero={hero}
      testId={`${testId}-image-mobile`}
      variant={visualVariant}
      size="fluid"
      aspectRatio={visualAspect}
    />
  ) : (
    <HeroVisual
      heroSrc={heroSrc}
      heroVideo={heroVideo}
      hero={hero}
      testId={`${testId}-image-mobile`}
      variant={visualVariant}
      size="side"
      aspectRatio={visualAspect}
      width={mobileVisualWidth}
    />
  );

  const blobClass =
    blobPosition === 'bottom'
      ? 'tj-blob bg-white w-[500px] h-[500px] -bottom-40 -left-32 opacity-20'
      : 'tj-blob bg-white w-[560px] h-[560px] -top-36 -right-36 opacity-25';

  return (
    <section
      className={`tj-vertical-hero border-b border-black relative overflow-hidden ${
        isDarkTone ? 'tj-vertical-hero--dark' : ''
      } ${tall ? 'tj-vertical-hero--tall min-h-[80vh] flex items-center' : ''} ${showVisualSlot ? `tj-vertical-hero--has-visual tj-vertical-hero--visual-${visualPosition}` : ''}`}
      style={{ background: `var(${bgVar})` }}
      data-testid={testId}
    >
      <div className={blobClass} aria-hidden />
      <div
        className="tj-blob-soft bg-white w-[320px] h-[320px] -top-10 right-[8%] opacity-[0.12] pointer-events-none absolute"
        aria-hidden
      />
      <div
        className={`relative w-full ${tall ? 'py-14 md:py-20' : 'py-14 md:py-20 lg:py-24'} w-full`}
      >
        <div
          className={`tj-container relative ${
            tall
              ? 'md:pl-[clamp(1.5rem,5vw,4rem)] lg:pl-[clamp(2rem,11vw,12rem)]'
              : 'md:pl-[clamp(2rem,11vw,12rem)]'
          }`}
        >
          <div
            className={`tj-vertical-hero-stage${showVisualSlot ? ' tj-vertical-hero-stage--has-visual' : ''}${
              showVisualSlot && tall ? ` tj-vertical-hero-stage--visual-${visualPosition}` : ''
            }`}
          >
            <div className={copyClassName}>
              <p className="tj-eyebrow">{eyebrow}</p>
              <h1 className="tj-vertical-hero-title mt-4">
                {headline[0]}
                {headline[1] != null && headline[1] !== '' && (
                  <>
                    <br />
                    {isDarkTone ? (
                      <span className="tj-vertical-hero-highlight italic font-light">
                        {headline[1]}
                      </span>
                    ) : (
                      <span className="italic font-light text-white/95">{headline[1]}</span>
                    )}
                  </>
                )}
              </h1>
              {subtext && (
                <p
                  className={`text-base md:text-lg max-w-lg mt-5 leading-relaxed ${
                    isDarkTone ? 'text-[#0a0a0a]/75' : 'text-white/80'
                  }`}
                >
                  {subtext}
                </p>
              )}
              {children}
              {afterVisual ? (
                <div className={`hidden ${desktopVisualBreakpoint}:block`}>{afterVisual}</div>
              ) : null}
            </div>

            {showVisualSlot && tall ? (
              <div className={`tj-vertical-hero-visual-cell hidden ${desktopVisualBreakpoint}:flex min-w-0`}>
                {desktopVisual}
              </div>
            ) : null}
          </div>

          {showVisualSlot && !tall ? (
            <div
              className={`tj-vertical-hero-visual-float tj-vertical-hero-visual-float--${visualPosition} hidden lg:block`}
            >
              {desktopVisual}
            </div>
          ) : null}

          {showVisualSlot ? (
            <div
              className={`${desktopVisualBreakpoint}:hidden tj-vertical-hero-visual-slot${
                tall ? ' tj-hero-visual-slot--mobile' : ''
              } flex justify-center items-center mt-6 w-full`}
            >
              {mobileVisual}
            </div>
          ) : null}

          {afterVisual ? (
            <div className={`${desktopVisualBreakpoint}:hidden tj-vertical-hero-after-visual w-full`}>
              {afterVisual}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

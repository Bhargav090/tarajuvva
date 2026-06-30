import HeroVisual from './HeroVisual';

/**
 * Full-bleed vertical hero — filled brand color + soft glow blob (Repair / Shop / Reimagine).
 * tone="dark" for light backgrounds (Shop lime); default "light" for deep brand colors.
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
}) {
  const isDarkTone = tone === 'dark';
  const showVisualSlot = heroLoading || Boolean(heroSrc) || Boolean(heroVideo);

  const sideSkeleton = (
    <div
      className="tj-hero-visual tj-hero-visual--side"
      style={{ width: 440, height: 385, maxWidth: '100%', maxHeight: 385 }}
      aria-hidden
    >
      <div className="tj-hero-visual-frame h-full animate-pulse bg-white/10" />
    </div>
  );

  const mobileSideSkeleton = (
    <div
      className="tj-hero-visual tj-hero-visual--side w-full max-w-[360px]"
      style={{ height: 315 }}
      aria-hidden
    >
      <div className="tj-hero-visual-frame h-full animate-pulse bg-white/10" />
    </div>
  );

  const blobClass =
    blobPosition === 'bottom'
      ? 'tj-blob bg-white w-[500px] h-[500px] -bottom-40 -left-32 opacity-20'
      : 'tj-blob bg-white w-[560px] h-[560px] -top-36 -right-36 opacity-25';

  return (
    <section
      className={`tj-vertical-hero border-b border-black relative overflow-hidden ${
        isDarkTone ? 'tj-vertical-hero--dark' : ''
      } ${tall ? 'min-h-[80vh] flex items-center' : ''} ${showVisualSlot ? 'tj-vertical-hero--has-visual' : ''}`}
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
        <div className="tj-container md:pl-[clamp(2rem,11vw,12rem)] relative">
          <div className={`tj-vertical-hero-stage${showVisualSlot ? ' tj-vertical-hero-stage--has-visual' : ''}`}>
            <div className="max-w-xl lg:max-w-2xl">
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
            </div>
          </div>

          {heroLoading ? (
            <div className="tj-vertical-hero-visual-float hidden lg:block">
              {sideSkeleton}
            </div>
          ) : heroSrc || heroVideo ? (
            <div className="tj-vertical-hero-visual-float hidden lg:block">
              <HeroVisual
                heroSrc={heroSrc}
                heroVideo={heroVideo}
                hero={hero}
                testId={`${testId}-image`}
                variant={visualVariant}
                size="side"
              />
            </div>
          ) : null}

          {heroLoading ? (
            <div className="lg:hidden tj-vertical-hero-visual-slot flex justify-center mt-6 px-2">
              {mobileSideSkeleton}
            </div>
          ) : heroSrc || heroVideo ? (
            <div className="lg:hidden tj-vertical-hero-visual-slot flex justify-center mt-6 px-2">
              <HeroVisual
                heroSrc={heroSrc}
                heroVideo={heroVideo}
                hero={hero}
                testId={`${testId}-image-mobile`}
                variant={visualVariant}
                size="side"
                width={360}
                height={315}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

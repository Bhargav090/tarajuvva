import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { HERO_STATS } from '../../utils/constants';
import { useHeroImage } from '../../hooks/useHeroImage';
import { uploadUrl } from '../../utils/uploadUrl';
import HeroVisual from '../../components/ui/HeroVisual';

export default function Hero() {
  const { hero, loading } = useHeroImage();
  const heroSrc = hero?.image_path ? uploadUrl(hero.image_path) : null;
  const showVisualSlot = loading || Boolean(heroSrc);

  const heroSkeleton = (
    <div
      className="tj-hero-visual"
      style={{ width: 640, height: 560, maxWidth: '100%', maxHeight: 560 }}
      aria-hidden
    >
      <div className="tj-hero-visual-frame h-full animate-pulse bg-black/[0.04]" />
    </div>
  );

  const mobileHeroSkeleton = (
    <div
      className="tj-hero-visual w-full max-w-[min(100%,360px)]"
      style={{ aspectRatio: '5/6' }}
      aria-hidden
    >
      <div className="tj-hero-visual-frame h-full animate-pulse bg-black/[0.04]" />
    </div>
  );

  return (
    <section
      className="relative overflow-x-clip border-b border-black bg-white"
      data-testid="hero-section"
    >
      <div className="tj-blob bg-[var(--tj-shop)] w-[480px] h-[480px] top-10 -right-32" />
      <div className="tj-blob bg-[var(--tj-reimagine)] w-[420px] h-[420px] -bottom-40 -left-24 opacity-30" />

      <div className="tj-container relative pt-7 pb-12 md:pb-16">
        <div className="tj-hero-meta">
          <span className="tj-hero-meta-label">v1.0 — circular fashion OS</span>
          <span className="tj-hero-meta-dash" aria-hidden />
          <span className="tj-hero-meta-label">ESTD. INDIA · 2025</span>
        </div>

        <div className={`tj-hero-stage${showVisualSlot ? ' tj-hero-stage--has-visual' : ''}`}>
          <div className="tj-hero-copy">
            <h1 className="tj-h1 tj-h1-compact text-[#0a0a0a]" data-testid="hero-headline">
              <span>
                <span className="tj-h1-highlight">(Fun)</span>ctional Fashion
              </span>
            </h1>

            <p className="tj-hero-lead hidden md:block">
              At Tarajuvva, we turn wardrobes into ecosystems, where pieces grow with you and outlive seasons.
            </p>

            <div className="mt-6 md:mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/shop" className="tj-btn-shop" data-testid="hero-shop-cta">
                Shop the drop <ArrowRight size={16} />
              </Link>
              <Link to="/reimagine" className="tj-btn-reimagine" data-testid="hero-reimagine-cta">
                Reimagine yours <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="tj-hero-visual-slot hidden md:flex justify-end lg:justify-end">
              {heroSkeleton}
            </div>
          ) : heroSrc ? (
            <div className="tj-hero-visual-slot hidden md:flex justify-end lg:justify-end">
              <HeroVisual heroSrc={heroSrc} hero={hero} testId="hero-image" variant="home" />
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="md:hidden tj-hero-visual-slot flex justify-center px-2">
            {mobileHeroSkeleton}
          </div>
        ) : heroSrc ? (
          <div className="md:hidden tj-hero-visual-slot flex justify-center px-2">
            <HeroVisual heroSrc={heroSrc} hero={hero} testId="hero-image-mobile" variant="home" />
          </div>
        ) : null}

        {!showVisualSlot && (
          <div
            aria-hidden
            className="hidden lg:block absolute top-24 right-8 xl:right-12 w-full max-w-[540px] xl:max-w-[600px] rounded-[1.25rem] border-2 border-dashed border-black/12 bg-black/[0.02]"
            style={{ aspectRatio: '5/6' }}
          />
        )}

        <div className="relative z-[2] grid grid-cols-2 md:grid-cols-4 gap-px mt-10 md:mt-12 border border-black bg-black">
          {HERO_STATS.map(stat => (
            <div key={stat.label} className="bg-white p-6">
              <div className="font-display text-4xl md:text-5xl font-extrabold tracking-tighter text-[#0a0a0a]">
                {stat.value}
              </div>
              <p className="text-xs text-black/55 mt-1 font-mono-tj uppercase tracking-wider">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

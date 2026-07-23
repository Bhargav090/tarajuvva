import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { HERO_STATS } from '../../utils/constants';
import HeroVisual from '../../components/ui/HeroVisual';
import homeHeroImage from '../../assets/hero-banthibhojanam-ss2026.jpeg';

export default function Hero() {
  return (
    <section
      className="relative overflow-x-clip border-b border-black bg-white"
      data-testid="hero-section"
    >
      <div className="tj-blob bg-[var(--tj-shop)] w-[480px] h-[480px] top-10 -right-32" />
      <div className="tj-blob bg-[var(--tj-reimagine)] w-[420px] h-[420px] -bottom-40 -left-24 opacity-30" />

      <div className="tj-container relative pt-7 pb-12 md:pb-16">
        <div className="tj-hero-body">
          <div className="tj-hero-stage tj-hero-stage--has-visual">
            <div className="tj-hero-copy">
              <div className="tj-hero-meta tj-hero-meta--copy">
                <span className="tj-hero-meta-label tj-hero-meta-label--natural">
                  v1.0 — circular fashion OS
                </span>
                <span className="tj-hero-meta-dash hidden sm:block" aria-hidden />
                <span className="tj-hero-meta-label hidden sm:inline">ESTD. INDIA · 2025</span>
              </div>

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

            <div className="tj-hero-visual-slot hidden lg:flex justify-end">
              <Link to="/shop" className="block cursor-pointer rounded-[inherit]" aria-label="Shop the drop">
                <HeroVisual
                  heroSrc={homeHeroImage}
                  testId="hero-image"
                  variant="home"
                  width={480}
                  height={640}
                />
              </Link>
            </div>
          </div>

          <div className="lg:hidden tj-hero-visual-slot tj-hero-visual-slot--mobile">
            <Link to="/shop" className="block cursor-pointer rounded-[inherit]" aria-label="Shop the drop">
              <HeroVisual
                heroSrc={homeHeroImage}
                testId="hero-image-mobile"
                variant="home"
                size="fluid"
              />
            </Link>
          </div>
        </div>

        <div className="relative z-[2] grid grid-cols-2 md:grid-cols-4 gap-px mt-10 md:mt-12 border border-black bg-black">
          {HERO_STATS.map(stat => {
            const toneClass =
              stat.tone === 'shop'
                ? 'bg-[var(--tj-shop)]'
                : stat.tone === 'reimagine'
                  ? 'bg-[var(--tj-reimagine)] text-white'
                  : 'bg-white';
            const labelClass =
              stat.tone === 'reimagine' ? 'text-white/70' : 'text-black/55';
            const valueClass =
              stat.tone === 'reimagine' ? 'text-white' : 'text-[#0a0a0a]';

            const inner = (
              <>
                <div className={`font-display text-4xl md:text-5xl font-extrabold tracking-tighter ${valueClass}`}>
                  {stat.value}
                </div>
                <p className={`text-xs mt-1 font-mono-tj uppercase tracking-wider ${labelClass} ${stat.to ? 'underline underline-offset-4 decoration-1' : ''}`}>
                  {stat.label}
                </p>
              </>
            );
            if (stat.to) {
              return (
                <Link
                  key={stat.label}
                  to={stat.to}
                  className={`${toneClass} p-6 transition-opacity block hover:opacity-90`}
                >
                  {inner}
                </Link>
              );
            }
            return (
              <div key={stat.label} className={`${toneClass} p-6`}>
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { HERO_STATS } from '../../utils/constants';

export default function Hero() {
  return (
    <section
      className="relative overflow-hidden border-b border-black bg-white"
      data-testid="hero-section"
    >
      <div className="tj-blob bg-[var(--tj-shop)] w-[480px] h-[480px] top-10 -right-32" />
      <div className="tj-blob bg-[var(--tj-reimagine)] w-[420px] h-[420px] -bottom-40 -left-24 opacity-30" />

      <div className="tj-container relative pt-7 pb-20 md:pb-28">
        <div className="flex items-center gap-3 mb-8">
          <span className="tj-eyebrow">v1.0 — circular fashion OS</span>
          <span className="h-px flex-1 bg-black/20 max-w-[120px]" />
          <span className="text-[11px] font-mono-tj text-black/50">ESTD. INDIA · 2025</span>
        </div>

        <h1 className="tj-h1 text-[#0a0a0a]" data-testid="hero-headline">
          <span className="block">Fashion</span>
          <span className="block">
            <span className="bg-[var(--tj-shop)] px-3 italic font-light">that doesn&apos;t</span>
          </span>
          <span className="block">end.</span>
        </h1>

        <div className="grid md:grid-cols-12 gap-10 mt-12 items-end">
          <div className="md:col-span-6">
            <p className="text-lg md:text-xl text-black/70 max-w-xl leading-relaxed">
              We&apos;re <strong className="text-black font-medium">Tarajuvva</strong> — a circular fashion OS, not a clothing brand pretending to care. Buy. Remake. Repair. Donate. The same garment, four chapters.
            </p>
          </div>
          <div className="md:col-span-6 flex flex-col sm:flex-row gap-3 md:justify-end">
            <Link to="/shop" className="tj-btn-shop" data-testid="hero-shop-cta">
              Shop the drop <ArrowRight size={16} />
            </Link>
            <Link to="/reimagine" className="tj-btn-reimagine" data-testid="hero-reimagine-cta">
              Reimagine yours <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px mt-16 border border-black bg-black">
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

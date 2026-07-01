import { Link } from 'react-router-dom';
import { NAV_LINKS } from '../../utils/constants';
import BrandLogo from '../ui/BrandLogo';

const linkClass =
  'font-display text-base text-[#0a0a0a] hover:underline underline-offset-4 transition-colors';

export default function Footer() {
  const verticals = NAV_LINKS.filter(l => l.to !== '/about');
  const brandLinks = NAV_LINKS.filter(l => l.to === '/about');

  return (
    <footer className="border-t border-black bg-white">
      <div className="tj-container py-10 sm:py-12 lg:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-x-10 lg:grid-cols-12 lg:gap-x-12">
          {/* Brand block */}
          <div className="lg:col-span-5">
            <BrandLogo
              foreground="#0a0a0a"
              className="h-[clamp(5rem,11vw+2rem,7.5rem)] w-auto max-w-[min(100%,320px)] sm:max-w-[360px] lg:max-w-[420px] object-contain object-left"
            />
            <p className="mt-4 text-base leading-relaxed text-black/60 max-w-md font-display">
              A circular fashion operating system, made in India. Wear it. Remake it. Repair it. Donate it.
            </p>
          </div>

          {/* Link columns — compact 2-up on mobile, 3-up from sm, aligned row on tablet+ */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-3 sm:gap-x-8 sm:gap-y-0 lg:col-span-7 lg:grid-cols-3 lg:gap-x-10">
            <div>
              <p className="tj-eyebrow mb-3">Verticals</p>
              <ul className="space-y-2 font-display">
                {verticals.map(l => (
                  <li key={l.to}>
                    <Link to={l.to} className={linkClass}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="tj-eyebrow mb-3">Brand</p>
              <ul className="space-y-2 font-display">
                {brandLinks.map(l => (
                  <li key={l.to}>
                    <Link to={l.to} className={linkClass}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <p className="tj-eyebrow mb-3">Reach</p>
              <ul className="space-y-2 font-display">
                <li>
                  <a
                    href="mailto:contact@tarajuvva.com"
                    className={`${linkClass} break-all sm:break-normal`}
                  >
                    contact@tarajuvva.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-black/10">
        <div className="tj-container py-5 sm:py-6">
          <p className="text-xs text-black/40 font-display text-center sm:text-left">
            © {new Date().getFullYear()} Tarajuvva. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

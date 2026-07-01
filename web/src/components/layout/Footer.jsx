import { Link } from 'react-router-dom';
import { NAV_LINKS } from '../../utils/constants';
import BrandLogo from '../ui/BrandLogo';

export default function Footer() {
  const verticals = NAV_LINKS.filter(l => l.to !== '/about');
  const brandLinks = NAV_LINKS.filter(l => l.to === '/about');

  return (
    <footer className="border-t border-black bg-white">
      <div className="tj-container py-16 md:py-20 grid md:grid-cols-12 gap-10">
        <div className="md:col-span-5">
          <BrandLogo
            foreground="#0a0a0a"
            className="h-[clamp(5.25rem,6vw+2.5rem,6rem)] w-auto max-w-[min(100%,330px)] object-contain object-left"
          />
          <p className="mt-4 text-black/60 max-w-md font-display">
            A circular fashion operating system, made in India. Wear it. Remake it. Repair it. Donate it.
          </p>
        </div>

        <div className="md:col-span-3">
          <p className="tj-eyebrow mb-4">Verticals</p>
          <ul className="space-y-2 font-display">
            {verticals.map(l => (
              <li key={l.to}>
                <Link to={l.to} className="hover:underline text-[#0a0a0a]">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-2">
          <p className="tj-eyebrow mb-4">Brand</p>
          <ul className="space-y-2 font-display">
            {brandLinks.map(l => (
              <li key={l.to}>
                <Link to={l.to} className="hover:underline text-[#0a0a0a]">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-2">
          <p className="tj-eyebrow mb-4">Reach</p>
          <ul className="space-y-2 font-display">
            <li>
              <a href="mailto:contact@tarajuvva.com" className="hover:underline text-[#0a0a0a]">
                contact@tarajuvva.com
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-black/10">
        <div className="tj-container py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-black/40 font-display">
            © {new Date().getFullYear()} Tarajuvva. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

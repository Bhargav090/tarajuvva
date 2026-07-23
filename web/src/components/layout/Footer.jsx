import { Link } from 'react-router-dom';
import { NAV_LINKS, SOCIAL_LINKS, WHATSAPP_DISPLAY, WHATSAPP_LINK } from '../../utils/constants';
import BrandLogo from '../ui/BrandLogo';

const linkClass =
  'font-display text-base text-[#0a0a0a] hover:underline underline-offset-4 transition-colors';

function InstagramIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" />
    </svg>
  );
}

function FacebookIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H9v3h2v7h3v-7h2.6l.4-3H14V9z" />
    </svg>
  );
}

function LinkedInIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.94 8.5H3.75V20h3.19V8.5zM5.34 3C4.22 3 3.3 3.92 3.3 5.04c0 1.1.9 2.02 2.04 2.02 1.14 0 2.04-.92 2.04-2.02C7.38 3.92 6.48 3 5.34 3zM20.25 20h-3.18v-5.6c0-1.34-.03-3.06-1.86-3.06-1.87 0-2.16 1.46-2.16 2.96V20H9.87V8.5h3.05v1.57h.04c.42-.8 1.46-1.65 3.01-1.65 3.22 0 3.81 2.12 3.81 4.87V20z" />
    </svg>
  );
}

export default function Footer() {
  const verticals = NAV_LINKS.filter((l) => l.to !== '/about');

  return (
    <footer className="border-t border-black bg-white">
      <div className="tj-container py-10 sm:py-12 lg:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-x-10 lg:grid-cols-12 lg:gap-x-12">
          <div className="tj-footer-brand lg:col-span-5">
            <BrandLogo
              foreground="#0a0a0a"
              className="tj-footer-brand__logo block w-auto object-contain object-left object-top"
            />
            <p className="mt-1 md:-mt-4 lg:-mt-5 text-base leading-relaxed text-black/60 max-w-md font-display">
              A circular fashion operating system, made in India. Wear it. Upcycle it. Repair it. Donate it.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-10 h-10 border border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors"
              >
                <InstagramIcon size={18} />
              </a>
              <a
                href={SOCIAL_LINKS.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-10 h-10 border border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors"
              >
                <FacebookIcon size={18} />
              </a>
              <a
                href={SOCIAL_LINKS.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-10 h-10 border border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors"
              >
                <LinkedInIcon size={18} />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-3 sm:gap-x-8 sm:gap-y-0 lg:col-span-7 lg:grid-cols-3 lg:gap-x-10">
            <div>
              <p className="tj-eyebrow mb-3">Verticals</p>
              <ul className="space-y-2 font-display">
                {verticals.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className={linkClass}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="tj-eyebrow mb-3">Company</p>
              <ul className="space-y-2 font-display">
                <li>
                  <Link to="/about" className={linkClass}>
                    About Us
                  </Link>
                </li>
                <li>
                  <Link to="/help" className={linkClass}>
                    Help Centre
                  </Link>
                </li>
                <li className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-display text-base text-[#0a0a0a]">Location</span>
                  <span className="text-sm text-black/55 font-body">Sainikpuri, Hyderabad</span>
                </li>
              </ul>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <p className="tj-eyebrow mb-3">Contact</p>
              <ul className="space-y-2 font-display">
                <li>
                  <a
                    href="mailto:contact@tarajuvva.com"
                    className={`${linkClass} break-all sm:break-normal`}
                  >
                    contact@tarajuvva.com
                  </a>
                </li>
                <li>
                  <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    WhatsApp {WHATSAPP_DISPLAY}
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

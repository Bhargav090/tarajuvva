import { Link } from 'react-router-dom';
import { Globe, AtSign, Mail } from 'lucide-react';
import { NAV_LINKS } from '../../utils/constants';

export default function Footer() {
  return (
    <footer className="bg-[#341631] text-[#eef4d1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-lg bg-[#a8c422] flex items-center justify-center">
                <span className="text-[#341631] font-black text-base font-display">T</span>
              </div>
              <span className="text-xl font-black tracking-tight font-display">Tarajuvva</span>
            </div>
            <p className="text-[#eef4d1]/60 text-sm leading-relaxed font-body max-w-xs">
              A circular fashion system built around your wardrobe. Wear more. Buy less. Fix what you already own.
            </p>
            <div className="flex gap-3 mt-6">
              {[
                { icon: Globe, href: '#', label: 'Website' },
                { icon: AtSign, href: '#', label: 'Instagram' },
                { icon: Mail, href: 'mailto:hello@tarajuvva.com', label: 'Email' },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label} href={href}
                  className="w-9 h-9 rounded-xl border border-[#eef4d1]/12 flex items-center justify-center text-[#eef4d1]/50 hover:text-[#eef4d1] hover:border-[#eef4d1]/30 transition-all"
                  aria-label={label}
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#eef4d1]/40 mb-5 font-display">Explore</h4>
            <ul className="space-y-3">
              {NAV_LINKS.map(l => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-[#eef4d1]/65 hover:text-[#eef4d1] transition-colors font-body">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#eef4d1]/40 mb-5 font-display">Policies</h4>
            <ul className="space-y-3">
              {['Shipping Policy','Returns & Exchanges','Privacy Policy','Terms of Use'].map(l => (
                <li key={l}>
                  <a href="#" className="text-sm text-[#eef4d1]/65 hover:text-[#eef4d1] transition-colors font-body">{l}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#eef4d1]/40 mb-5 font-display">Contact</h4>
            <ul className="space-y-3">
              <li>
                <a href="mailto:hello@tarajuvva.com" className="text-sm text-[#eef4d1]/65 hover:text-[#eef4d1] transition-colors font-body">
                  hello@tarajuvva.com
                </a>
              </li>
              <li className="text-sm text-[#eef4d1]/65 font-body">Hyderabad, India 🇮🇳</li>
              <li>
                <span className="inline-flex items-center gap-1.5 bg-[#a8c422]/50 rounded-full px-3 py-1 text-xs font-semibold text-[#341631] font-display">
                  ✦ Response within 24 hours
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-[#eef4d1]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#eef4d1]/35 font-body">
            © {new Date().getFullYear()} Tarajuvva. All rights reserved.
          </p>
          <p className="text-xs text-[#eef4d1]/35 font-body">
            Wear more. Waste less. 🌿
          </p>
        </div>
      </div>
    </footer>
  );
}

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { QUICK_CARDS } from '../../utils/constants';
import shopIcon from '../../assets/icons/shop.png';
import reimagineIcon from '../../assets/icons/reimagine.png';
import repairIcon from '../../assets/icons/repair.png';
import donateIcon from '../../assets/icons/donate.png';

const ICONS = { ShoppingBag: shopIcon, Sparkles: reimagineIcon, Wrench: repairIcon, Heart: donateIcon };

export default function QuickDecision() {
  return (
    <section className="section bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-widest font-display mb-4"
            style={{ background: '#a8c74a18', color: '#a8c74a', border: '1px solid #a8c74a25' }}>
            Quick Start
          </span>
          <h2 className="font-display font-black text-4xl sm:text-5xl text-[#241621] leading-tight">
            What do you want
            <br className="hidden sm:block" /> to do today?
          </h2>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {QUICK_CARDS.map((card, i) => {
            const iconSrc = ICONS[card.icon] || shopIcon;
            return (
              <motion.div
                key={card.to}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                viewport={{ once: true }}
              >
                <Link
                  to={card.to}
                  className="group block p-5 sm:p-6 rounded-2xl bg-white border border-[#241621]/8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full"
                >
                  {/* Icon */}
                  <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110">
                    <img src={iconSrc} alt={card.action} className="w-8 h-8 sm:w-9 sm:h-9 object-contain" />
                  </div>
                  {/* Label */}
                  <p className="text-[#241621]/55 text-xs font-display mb-1 leading-snug">{card.label}</p>
                  {/* Action */}
                  <div className="flex items-center justify-between mt-2">
                    <span
                      className="text-lg sm:text-xl font-black font-display"
                      style={{ color: card.color }}
                    >
                      {card.action}
                    </span>
                    <ArrowUpRight
                      size={18}
                      style={{ color: card.color }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1 group-hover:translate-x-0 duration-200"
                    />
                  </div>
                  <p className="mt-2 text-xs text-[#241621]/45 font-display leading-relaxed hidden sm:block">
                    {card.desc}
                  </p>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

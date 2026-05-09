import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Sparkles, Wrench, Heart, ArrowUpRight } from 'lucide-react';
import { QUICK_CARDS } from '../../utils/constants';

const ICONS = { ShoppingBag, Sparkles, Wrench, Heart };

export default function QuickDecision() {
  return (
    <section className="section bg-[#eef4d1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-widest font-[Outfit] mb-4"
            style={{ background: '#0b472218', color: '#0b4722', border: '1px solid #0b472225' }}>
            Quick Start
          </span>
          <h2 className="font-[Outfit] font-black text-4xl sm:text-5xl text-[#341631] leading-tight">
            What do you want
            <br className="hidden sm:block" /> to do today?
          </h2>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {QUICK_CARDS.map((card, i) => {
            const Icon = ICONS[card.icon] || ShoppingBag;
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
                  className="group block p-5 sm:p-6 rounded-2xl bg-white border border-[#341631]/8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full"
                >
                  {/* Icon */}
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                    style={{ background: card.color + '18' }}
                  >
                    <Icon size={22} style={{ color: card.color }} />
                  </div>
                  {/* Label */}
                  <p className="text-[#341631]/55 text-xs font-[Poppins] mb-1 leading-snug">{card.label}</p>
                  {/* Action */}
                  <div className="flex items-center justify-between mt-2">
                    <span
                      className="text-lg sm:text-xl font-black font-[Outfit]"
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
                  <p className="mt-2 text-xs text-[#341631]/45 font-[Poppins] leading-relaxed hidden sm:block">
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

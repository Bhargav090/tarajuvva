import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { ShoppingBag, Sparkles, Wrench, Heart, ArrowRight } from 'lucide-react';

const NODES = [
  {
    icon: ShoppingBag, emoji: '🛍', label: 'I want something new',
    action: 'Shop', to: '/shop', color: '#0b4722', bg: '#0b472215',
  },
  {
    icon: Sparkles, emoji: '✨', label: "I'm bored of my clothes",
    action: 'Reimagine', to: '/reimagine', color: '#6c0b20', bg: '#6c0b2015',
  },
  {
    icon: Wrench, emoji: '🔧', label: 'Something is damaged',
    action: 'Repair', to: '/repair', color: '#e34334', bg: '#e3433415',
  },
  {
    icon: Heart, emoji: '💙', label: "I don't need this anymore",
    action: 'Donate', to: '/donate', color: '#015395', bg: '#01539515',
  },
];

function NodeCard({ node, i }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: i * 0.1 }}
      viewport={{ once: true }}
    >
      <Link
        to={node.to}
        className="group relative block rounded-3xl p-6 sm:p-8 border-2 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl overflow-hidden"
        style={{ background: node.bg, borderColor: node.color + '25' }}
      >
        {/* Big emoji bg */}
        <span className="absolute right-4 bottom-4 text-7xl sm:text-8xl opacity-10 select-none pointer-events-none transition-transform duration-300 group-hover:scale-110 group-hover:opacity-15">
          {node.emoji}
        </span>

        {/* Icon */}
        <div
          className="w-13 h-13 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: node.color + '20', width: 52, height: 52 }}
        >
          <node.icon size={24} style={{ color: node.color }} />
        </div>

        {/* Text */}
        <p className="text-[#341631]/55 text-sm font-[Poppins] mb-2 leading-relaxed">{node.label}</p>
        <div className="flex items-center justify-between">
          <span className="text-xl font-black font-[Outfit]" style={{ color: node.color }}>
            {node.action}
          </span>
          <ArrowRight
            size={20} style={{ color: node.color }}
            className="opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-x-2 group-hover:translate-x-0"
          />
        </div>
      </Link>
    </motion.div>
  );
}

export default function LoopSection() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 });

  return (
    <section ref={ref} className="section bg-[#eef4d1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-widest font-[Outfit] mb-5 bg-[#0b4722]/10 text-[#0b4722] border border-[#0b4722]/20">
              The Loop
            </span>
            <h2 className="font-[Outfit] font-black text-4xl sm:text-5xl lg:text-6xl text-[#341631] leading-tight">
              Your clothes.
              <br />
              <span className="text-[#0b4722]">Every stage.</span>
            </h2>
            <p className="mt-5 text-[#341631]/55 font-[Poppins] text-base sm:text-lg max-w-lg mx-auto">
              What do you want to do with your clothes today?
            </p>
          </motion.div>
        </div>

        {/* 2×2 Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 max-w-3xl mx-auto">
          {NODES.map((node, i) => <NodeCard key={node.to} node={node} i={i} />)}
        </div>

        {/* Center connector badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex justify-center mt-10"
        >
          <div className="inline-flex items-center gap-3 bg-[#341631] text-[#eef4d1] rounded-2xl px-6 py-4 shadow-xl">
            <span className="text-2xl">🧵</span>
            <div>
              <p className="text-sm font-black font-[Outfit]">It's all connected</p>
              <p className="text-xs text-[#eef4d1]/55 font-[Poppins]">Buy → Reimagine → Repair → Donate → Repeat</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

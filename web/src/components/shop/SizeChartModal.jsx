import { motion, AnimatePresence } from 'framer-motion';
import { Ruler, X } from 'lucide-react';

export default function SizeChartModal({ chart, onClose }) {
  if (!chart?.columns?.length) return null;

  const title =
    chart.size_type === 'letter'
      ? `Letter size chart · ${chart.garment_type === 'bottom' ? 'Bottom' : 'Top'}`
      : `Numeric size chart · ${chart.garment_type === 'bottom' ? 'Bottom' : 'Top'}`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#241621]/8">
            <div className="flex items-center gap-2 min-w-0">
              <Ruler size={16} className="text-[#a8e000] shrink-0" />
              <h3 className="font-black font-display text-[#241621] truncate">{title}</h3>
              <span className="text-xs text-[#241621]/45 font-body shrink-0">cm</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#241621]/6 text-[#241621]/50 hover:text-[#241621] transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm font-display min-w-[320px]">
              <thead className="bg-[#241621] text-white sticky top-0">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Size</th>
                  {chart.columns.map((col) => (
                    <th key={col.key} className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(chart.rows || []).map((row, i) => (
                  <tr key={row.size} className={i % 2 === 0 ? 'bg-white' : 'bg-[#241621]/3'}>
                    <td className="px-4 py-2.5 font-black text-[#241621]">{row.size}</td>
                    {chart.columns.map((col) => (
                      <td key={col.key} className="px-4 py-2.5 text-[#241621]/75 whitespace-nowrap">
                        {row.values?.[col.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3.5 border-t border-[#241621]/8 bg-[#241621]/2">
            <p className="text-xs text-[#241621]/50 font-body leading-relaxed">
              Measurements are in centimetres. For the best fit, measure your body and compare to the chart. If between sizes, size up.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

import { useState } from 'react';
import { Ruler } from 'lucide-react';
import { useSizeChart } from '../../hooks/useSizeChart';
import SizeChartModal from './SizeChartModal';

export default function SizeChartLink({ product, className = '', compact = false }) {
  const [open, setOpen] = useState(false);
  const { chart, canShow, loading } = useSizeChart(product);

  if (!canShow && !loading) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!canShow}
        aria-label={loading ? 'Loading size chart' : 'View size chart'}
        className={
          className ||
          'text-xs text-[#241621]/50 underline font-display hover:text-[#241621] flex items-center gap-1 disabled:opacity-40'
        }
      >
        <Ruler size={11} />
        {loading ? (
          <span className={compact ? 'hidden sm:inline' : undefined}>Loading…</span>
        ) : (
          <span className={compact ? 'hidden sm:inline' : undefined}>View size chart</span>
        )}
      </button>
      {open && canShow && <SizeChartModal chart={chart} onClose={() => setOpen(false)} />}
    </>
  );
}

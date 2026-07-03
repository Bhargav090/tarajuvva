import { useState } from 'react';
import { Ruler } from 'lucide-react';
import { useSizeChart } from '../../hooks/useSizeChart';
import SizeChartModal from './SizeChartModal';

export default function SizeChartLink({ product, className = '' }) {
  const [open, setOpen] = useState(false);
  const { chart, canShow, loading } = useSizeChart(product);

  if (!canShow && !loading) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!canShow}
        className={
          className ||
          'text-xs text-[#241621]/50 underline font-display hover:text-[#241621] flex items-center gap-1 disabled:opacity-40'
        }
      >
        <Ruler size={11} />
        {loading ? 'Loading chart…' : 'View size chart'}
      </button>
      {open && canShow && <SizeChartModal chart={chart} onClose={() => setOpen(false)} />}
    </>
  );
}

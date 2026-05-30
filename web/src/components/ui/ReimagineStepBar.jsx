import { Check } from 'lucide-react';
import { REIMAGINE_FLOW } from '../../utils/constants';

/** Maps internal steps (0=base, 1=preset, 3=details) to the 4-step bar. */
export function getReimagineFlowIndex(step) {
  if (step <= 0) return 0;
  if (step <= 1) return 1;
  if (step <= 3) return 2;
  return 3;
}

export default function ReimagineStepBar({ currentStep }) {
  const active = getReimagineFlowIndex(currentStep);

  return (
    <div className="border-b border-black sticky top-16 z-30 bg-white">
      <div className="tj-container py-4 flex items-center gap-3 text-xs font-mono-tj uppercase tracking-[0.18em] overflow-x-auto no-scrollbar">
        {REIMAGINE_FLOW.map((label, i) => {
          const isActive = i === active;
          const isDone = i < active;
          return (
            <div key={label} className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 flex items-center justify-center rounded-full border text-xs font-bold shrink-0 ${
                    isDone
                      ? 'bg-[var(--tj-shop)] text-black border-black'
                      : isActive
                        ? 'bg-black text-white border-black'
                        : 'border-black/20 text-black/40 bg-white'
                  }`}
                >
                  {isDone ? <Check size={14} strokeWidth={3} /> : i + 1}
                </div>
                <span
                  className={
                    isActive
                      ? 'text-black font-bold'
                      : isDone
                        ? 'text-black'
                        : 'text-black/40'
                  }
                >
                  {label}
                </span>
              </div>
              {i < REIMAGINE_FLOW.length - 1 && (
                <span className="w-6 h-px bg-black/15 shrink-0" aria-hidden />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

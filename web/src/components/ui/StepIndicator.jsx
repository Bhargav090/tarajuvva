import { Check } from 'lucide-react';

export default function StepIndicator({ steps, current }) {
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((step, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <div key={step} className="flex items-center">
            {/* circle */}
            <div className="flex flex-col items-center">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 font-display"
                style={{
                  background: done ? '#a8c74a' : active ? '#a8c74a' : 'transparent',
                  border:     `2px solid ${done || active ? '#a8c74a' : 'rgba(36,22,33,0.2)'}`,
                  color:      done || active ? '#241621' : 'rgba(36,22,33,0.4)',
                }}
              >
                {done ? <Check size={15} strokeWidth={3} /> : i + 1}
              </div>
              <span
                className="mt-1.5 text-[10px] font-semibold font-display tracking-wide hidden sm:block"
                style={{ color: active ? '#a8c74a' : done ? '#a8c74a' : 'rgba(36,22,33,0.35)' }}
              >
                {step}
              </span>
            </div>
            {/* connector */}
            {i < steps.length - 1 && (
              <div
                className="h-[2px] w-8 sm:w-12 mx-1 transition-all duration-300"
                style={{ background: i < current ? '#a8c74a' : 'rgba(36,22,33,0.15)' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

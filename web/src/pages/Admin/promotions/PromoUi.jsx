import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const PILL_STYLES = {
  Active: 'bg-[#c8ff2e]/30 text-[#3d5200]',
  Inactive: 'bg-[#241621]/8 text-[#241621]/55',
  Expired: 'bg-[#e34334]/12 text-[#b3261e]',
  Scheduled: 'bg-[#1b4e81]/12 text-[#1b4e81]',
  'Limit reached': 'bg-[#7A063C]/12 text-[#7A063C]',
  'Fully used': 'bg-[#7A063C]/12 text-[#7A063C]',
};

export function StatusPill({ status }) {
  return (
    <span
      className={`inline-block text-[10px] font-mono-tj uppercase tracking-wider px-2 py-0.5 rounded ${
        PILL_STYLES[status] || PILL_STYLES.Inactive
      }`}
    >
      {status}
    </span>
  );
}

export function CopyCode({ value }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error('Could not copy');
        }
      }}
      className="inline-flex items-center gap-1 text-[10px] font-mono-tj uppercase tracking-wider text-[#241621]/40 hover:text-[#241621]"
      title="Copy code"
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export function Toggle({ label, checked, onChange, name }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 accent-[#241621]"
      />
      <span className="text-sm font-semibold text-[#241621] font-display">{label}</span>
    </label>
  );
}

export function RadioCards({ name, value, options, onChange }) {
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      {options.map((opt) => (
        <label
          key={opt.value}
          className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
            value === opt.value ? 'border-[#241621] bg-[#241621]/[0.03]' : 'border-[#241621]/15 hover:border-[#241621]/35'
          }`}
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={onChange}
            className="mt-1 accent-[#241621]"
          />
          <span>
            <span className="block text-sm font-semibold text-[#241621] font-display">{opt.label}</span>
            {opt.hint && <span className="block text-xs text-[#241621]/50 font-body mt-0.5">{opt.hint}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}

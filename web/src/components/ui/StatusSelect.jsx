import { STATUS_COLORS } from '../../utils/constants';

export default function StatusSelect({ value, options, onUpdate, loading }) {
  return (
    <select
      value={value}
      onChange={e => onUpdate(e.target.value)}
      disabled={loading}
      className="text-xs font-semibold rounded-lg px-2.5 py-1.5 border border-[#341631]/15 bg-[#eef4d1] cursor-pointer font-display outline-none focus:ring-2 focus:ring-[#a8c422]/20"
      style={{ color: STATUS_COLORS[value] || '#341631' }}
    >
      {options.map(s => (
        <option key={s} value={s} style={{ color: STATUS_COLORS[s] }}>
          {s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </option>
      ))}
    </select>
  );
}

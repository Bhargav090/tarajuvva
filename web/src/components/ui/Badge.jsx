import { STATUS_COLORS } from '../../utils/constants';

/**
 * AccentPill — small label above a section title.
 * Badge      — status badge with auto-color from STATUS_COLORS map.
 */

export function AccentPill({ children, color, className = '' }) {
  const bg  = color || '#0b4722';
  const isDark = bg === '#0b4722' || bg === '#341631' || bg === '#6c0b20' || bg === '#015395';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-widest font-display ${className}`}
      style={{ background: bg + '18', color: bg, border: `1px solid ${bg}25` }}
    >
      {children}
    </span>
  );
}

export function Badge({ status, className = '' }) {
  const color = STATUS_COLORS[status] || '#888';
  const label = status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown';
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold font-display tracking-wide uppercase ${className}`}
      style={{ background: color + '18', color, border: `1px solid ${color}30` }}
    >
      {label}
    </span>
  );
}

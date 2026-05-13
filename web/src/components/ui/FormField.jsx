/**
 * FormField — reusable labelled form elements for light theme.
 * Exports: Input, Textarea, Select
 */

const BASE = [
  'w-full px-4 py-3 rounded-xl text-[#341631] placeholder:text-[#341631]/40 font-body text-sm',
  'bg-[#eef4d1] border border-[#341631]/15 outline-none',
  'transition-all duration-200',
  'focus:border-[#a8c422] focus:ring-2 focus:ring-[#a8c422]/12 focus:bg-white',
  'disabled:opacity-50',
].join(' ');

const Label = ({ label, required, htmlFor }) =>
  label ? (
    <label htmlFor={htmlFor} className="block text-sm font-semibold text-[#341631] mb-1.5 font-display">
      {label}{required && <span className="text-[#e34334] ml-0.5">*</span>}
    </label>
  ) : null;

const Error = ({ msg }) =>
  msg ? <p className="mt-1.5 text-xs text-[#e34334] font-medium font-body">{msg}</p> : null;

export function Input({ label, error, required, id, accent, ...props }) {
  const fid = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div>
      <Label label={label} required={required} htmlFor={fid} />
      <input id={fid} className={BASE} required={required} {...props} />
      <Error msg={error} />
    </div>
  );
}

export function Textarea({ label, error, required, id, rows = 4, ...props }) {
  const fid = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div>
      <Label label={label} required={required} htmlFor={fid} />
      <textarea id={fid} rows={rows} className={`${BASE} resize-none`} required={required} {...props} />
      <Error msg={error} />
    </div>
  );
}

export function Select({ label, error, required, id, children, ...props }) {
  const fid = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div>
      <Label label={label} required={required} htmlFor={fid} />
      <select id={fid} className={`${BASE} cursor-pointer`} required={required} {...props}>
        {children}
      </select>
      <Error msg={error} />
    </div>
  );
}

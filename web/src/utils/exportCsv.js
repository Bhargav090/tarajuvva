/** Escape a CSV cell and wrap in quotes when needed. */
function csvCell(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Download rows as CSV.
 * @param {string} filename
 * @param {string[]} headers
 * @param {Array<Array<string|number|null|undefined>>} rows
 */
export function downloadCsv(filename, headers, rows) {
  const lines = [
    headers.map(csvCell).join(','),
    ...rows.map((row) => row.map(csvCell).join(',')),
  ];
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function flattenOrderItems(items) {
  if (!Array.isArray(items)) return '';
  return items
    .map((it) => {
      const size = it.size ? ` (${it.size})` : '';
      return `${it.name || 'Item'}${size} x${it.qty || 1}`;
    })
    .join('; ');
}

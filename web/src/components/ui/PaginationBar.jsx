import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Simple prev/next pager for admin + profile lists.
 */
export default function PaginationBar({
  page = 1,
  totalPages = 1,
  total = 0,
  onPageChange,
  loading = false,
  className = '',
}) {
  if (totalPages <= 1 && total <= 0) return null;
  if (totalPages <= 1) return null;

  const go = (next) => {
    if (loading) return;
    const p = Math.min(totalPages, Math.max(1, next));
    if (p !== page) onPageChange?.(p);
  };

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 pt-4 ${className}`.trim()}>
      <p className="text-xs text-[#241621]/50 font-body">
        Page {page} of {totalPages}
        {total > 0 ? ` · ${total} total` : ''}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={loading || page <= 1}
          onClick={() => go(page - 1)}
          className="inline-flex items-center gap-1 px-3 py-2 text-xs font-mono-tj uppercase tracking-wider border border-black/20 disabled:opacity-40 hover:border-black"
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <button
          type="button"
          disabled={loading || page >= totalPages}
          onClick={() => go(page + 1)}
          className="inline-flex items-center gap-1 px-3 py-2 text-xs font-mono-tj uppercase tracking-wider border border-black/20 disabled:opacity-40 hover:border-black"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

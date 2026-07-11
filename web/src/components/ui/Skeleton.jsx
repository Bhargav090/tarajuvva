const pulse = 'animate-pulse rounded-xl bg-[#241621]/8';

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-[#241621]/8">
      <div className={`${pulse} h-72 rounded-none`} />
      <div className="p-4 space-y-3">
        <div className={`${pulse} h-4 w-2/3`} />
        <div className={`${pulse} h-4 w-1/3`} />
        <div className={`${pulse} h-9 mt-2`} />
      </div>
    </div>
  );
}

export function SkeletonText({ lines = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`${pulse} h-4`} style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className={`${pulse} h-10 flex-1`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Spinner({ size = 24, color = '#c8ff2e' }) {
  return (
    <div
      className="border-2 border-t-transparent rounded-full animate-spin"
      style={{ width: size, height: size, borderColor: `${color}30`, borderTopColor: color }}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="text-center">
        <Spinner size={36} />
        <p className="mt-4 text-sm text-[#241621]/50 font-body">Loading…</p>
      </div>
    </div>
  );
}

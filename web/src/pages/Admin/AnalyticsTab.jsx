import { useEffect, useMemo, useState } from 'react';
import { BarChart3, ShoppingCart, Users, Scissors, Heart, TrendingDown } from 'lucide-react';
import api from '../../utils/api';
import { Spinner } from '../../components/ui/Skeleton';

const PRESETS = [
  { id: '7', label: '7 days', days: 7 },
  { id: '14', label: '14 days', days: 14 },
  { id: '30', label: '30 days', days: 30 },
  { id: '90', label: '90 days', days: 90 },
  { id: 'lifetime', label: 'Lifetime', range: 'lifetime' },
  { id: 'custom', label: 'Custom', custom: true },
];

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'sales', label: 'Sales' },
  { id: 'funnel', label: 'Funnel' },
  { id: 'customers', label: 'Sign-ins' },
  { id: 'reimagine', label: 'Reimagine' },
  { id: 'engagement', label: 'Engagement' },
];

function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function Metric({ label, value, hint }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-[#241621]/8">
      <p className="text-2xl font-black text-[#241621] font-display">{value}</p>
      <p className="text-xs text-[#241621]/45 font-body mt-1">{label}</p>
      {hint && <p className="text-[10px] text-[#241621]/35 font-body mt-1">{hint}</p>}
    </div>
  );
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#241621]/50 font-display mb-3 mt-8 first:mt-0">
      <Icon size={14} /> {children}
    </h2>
  );
}

function TimeSeriesChart({ rows, valueKey = 'revenue' }) {
  if (!rows?.length) {
    return <p className="text-sm text-[#241621]/45 font-body">No data in this range yet.</p>;
  }
  const max = Math.max(...rows.map((r) => Number(r[valueKey]) || 0), 1);
  const showEvery = rows.length > 45 ? Math.ceil(rows.length / 12) : rows.length > 20 ? 2 : 1;

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-0.5 h-40 w-full">
        {rows.map((r) => {
          const v = Number(r[valueKey]) || 0;
          const pct = Math.max(v > 0 ? 4 : 0, Math.round((v / max) * 100));
          return (
            <div
              key={r.day}
              className="flex-1 min-w-0 h-full flex items-end"
              title={`${r.day}: ${valueKey === 'revenue' ? money(v) : v} · ${r.orders || 0} orders`}
            >
              <div
                className="w-full rounded-t bg-[var(--tj-shop)]/90 hover:bg-[var(--tj-shop)] transition-colors"
                style={{ height: `${pct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] font-mono-tj text-[#241621]/40">
        {rows
          .filter((_, i) => i === 0 || i === rows.length - 1 || i % showEvery === 0)
          .map((r) => (
            <span key={r.day}>{String(r.day).slice(5)}</span>
          ))}
      </div>
      <div className="flex flex-wrap gap-4 text-[11px] font-body text-[#241621]/55">
        <span>
          Peak: <strong className="text-[#241621] font-display">{money(max)}</strong>
        </span>
        <span>
          Days: <strong className="text-[#241621] font-display">{rows.length}</strong>
        </span>
      </div>
    </div>
  );
}

export default function AnalyticsTab() {
  const [preset, setPreset] = useState('30');
  const [customStart, setCustomStart] = useState(() => {
    const t = todayLocal();
    const d = new Date();
    d.setDate(d.getDate() - 29);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [customEnd, setCustomEnd] = useState(todayLocal);
  const [appliedCustom, setAppliedCustom] = useState(null);
  const [section, setSection] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const queryString = useMemo(() => {
    const p = PRESETS.find((x) => x.id === preset);
    if (p?.range === 'lifetime') return 'range=lifetime';
    if (p?.custom) {
      const start = appliedCustom?.start || customStart;
      const end = appliedCustom?.end || customEnd;
      return `start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
    }
    return `days=${p?.days || 30}`;
  }, [preset, appliedCustom, customStart, customEnd]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .get(`/analytics/dashboard?${queryString}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
      })
      .then(({ data: res }) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load analytics');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [queryString]);

  const applyCustom = () => {
    if (!customStart || !customEnd) return;
    setAppliedCustom({ start: customStart, end: customEnd });
    setPreset('custom');
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  if (error && !data) {
    return <p className="text-sm text-[#e34334] font-body">{error}</p>;
  }

  const o = data?.overview || {};
  const funnel = data?.funnel || {};
  const sales = data?.sales || {};
  const customers = data?.customers || {};
  const reimagine = data?.reimagine || {};
  const engagement = data?.engagement || {};
  const rangeLabel = data?.range
    ? `${data.range.start} → ${data.range.end}`
    : '';

  return (
    <div className={loading ? 'opacity-70' : ''}>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-black text-[#241621] font-display">Analytics</h1>
          <p className="text-sm text-[#241621]/50 font-body mt-1">
            Soft-deleted test orders are excluded. {rangeLabel && <span className="font-mono-tj text-[11px]">{rangeLabel}</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                setPreset(r.id);
                if (r.custom) {
                  setAppliedCustom({ start: customStart, end: customEnd });
                } else {
                  setAppliedCustom(null);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-display border transition-colors ${
                preset === r.id
                  ? 'bg-[#241621] text-white border-[#241621]'
                  : 'bg-white text-[#241621]/70 border-[#241621]/12 hover:border-[#241621]/25'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {preset === 'custom' && (
        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-[#241621]/8 bg-white p-4">
          <label className="text-xs font-display font-semibold text-[#241621]">
            Start
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="mt-1 block rounded-lg border border-[#241621]/15 px-3 py-2 text-sm font-body outline-none focus:ring-2 focus:ring-[var(--tj-shop)]/30"
            />
          </label>
          <label className="text-xs font-display font-semibold text-[#241621]">
            End
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="mt-1 block rounded-lg border border-[#241621]/15 px-3 py-2 text-sm font-body outline-none focus:ring-2 focus:ring-[var(--tj-shop)]/30"
            />
          </label>
          <button
            type="button"
            onClick={applyCustom}
            className="px-4 py-2 rounded-lg text-xs font-semibold font-display bg-[var(--tj-shop)] text-[#241621] hover:opacity-90"
          >
            Apply range
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-6 border-b border-[#241621]/8 pb-3">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-display transition-colors ${
              section === s.id
                ? 'bg-[var(--tj-shop)] text-[#241621]'
                : 'text-[#241621]/55 hover:bg-[#241621]/5'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === 'overview' && (
        <>
          <SectionTitle icon={BarChart3}>Overview</SectionTitle>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Metric label="Revenue (completed)" value={money(o.revenue)} hint="Excludes pending payment & cancelled" />
            <Metric label="Orders completed" value={o.orders ?? 0} />
            <Metric label="Average order value" value={money(o.aov)} />
            <Metric
              label="Cart abandonment"
              value={o.cart_abandonment_rate == null ? '—' : `${o.cart_abandonment_rate}%`}
              hint="Sessions that added to cart but did not purchase"
            />
            <Metric
              label="Pending payment"
              value={o.pending_payment ?? 0}
              hint={o.pending_payment_value != null ? `Worth ${money(o.pending_payment_value)} — checkout started, not paid` : undefined}
            />
            <Metric label="Cancelled" value={o.cancelled ?? 0} />
          </div>
          <SectionTitle icon={BarChart3}>Revenue over time (completed only)</SectionTitle>
          <div className="bg-white rounded-2xl p-5 border border-[#241621]/8 mb-6">
            <TimeSeriesChart rows={sales.series} valueKey="revenue" />
          </div>
          <SectionTitle icon={BarChart3}>Orders created (includes unpaid checkouts)</SectionTitle>
          <div className="bg-white rounded-2xl p-5 border border-[#241621]/8">
            <TimeSeriesChart rows={sales.orders_created_series} valueKey="revenue" />
            <p className="mt-3 text-xs text-[#241621]/45 font-body">
              Bars show order value created that day, including Razorpay checkouts still on pending payment.
            </p>
          </div>
        </>
      )}

      {section === 'sales' && (
        <>
          <SectionTitle icon={BarChart3}>Revenue over time (completed only)</SectionTitle>
          <div className="bg-white rounded-2xl p-5 border border-[#241621]/8 mb-6">
            <TimeSeriesChart rows={sales.series} valueKey="revenue" />
          </div>
          <SectionTitle icon={BarChart3}>Orders created (includes unpaid checkouts)</SectionTitle>
          <div className="bg-white rounded-2xl p-5 border border-[#241621]/8 mb-6">
            <TimeSeriesChart rows={sales.orders_created_series} valueKey="revenue" />
          </div>
          <SectionTitle icon={ShoppingCart}>Top products</SectionTitle>
          <div className="bg-white rounded-2xl p-5 border border-[#241621]/8 mb-6 overflow-x-auto">
            {!sales.top_products?.length ? (
              <p className="text-sm text-[#241621]/45 font-body">No product sales yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-[#241621]/40 font-mono-tj">
                    <th className="pb-2">Product</th>
                    <th className="pb-2">Qty</th>
                    <th className="pb-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.top_products.map((p) => (
                    <tr key={p.id || p.name} className="border-t border-[#241621]/6">
                      <td className="py-2 font-display font-semibold text-[#241621]">{p.name}</td>
                      <td className="py-2 font-mono-tj">{p.qty}</td>
                      <td className="py-2 text-right font-mono-tj">{money(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {/* Delivery zones — hidden for now
          <SectionTitle icon={BarChart3}>Delivery zones</SectionTitle>
          <div className="bg-white rounded-2xl p-5 border border-[#241621]/8">
            ...
          </div>
          */}
        </>
      )}

      {section === 'funnel' && (
        <>
          <SectionTitle icon={TrendingDown}>Shop conversion funnel</SectionTitle>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            <Metric label="Add to cart" value={funnel.add_to_cart_sessions ?? 0} />
            <Metric
              label="Address entered"
              value={funnel.address_entered_sessions ?? 0}
              hint="Filled address + PIN + delivery zone"
            />
            <Metric
              label="Stopped after address"
              value={funnel.stopped_after_address_sessions ?? 0}
              hint="Had cart + address, never opened Razorpay"
            />
            <Metric
              label="Opened Razorpay"
              value={funnel.begin_checkout_sessions ?? 0}
              hint="Not counted in “stopped after address”"
            />
            <Metric label="Completed purchase" value={funnel.purchase_sessions ?? 0} />
            <Metric label="Paid orders" value={funnel.paid_orders ?? 0} />
          </div>
          <div className="grid sm:grid-cols-3 gap-3 mb-4">
            <Metric
              label="Cart abandonment"
              value={funnel.cart_abandonment_rate == null ? '—' : `${funnel.cart_abandonment_rate}%`}
              hint={funnel.formula?.cart_abandonment}
            />
            <Metric
              label="Stopped after address %"
              value={
                funnel.stopped_after_address_rate == null
                  ? '—'
                  : `${funnel.stopped_after_address_rate}%`
              }
              hint="Share of address-entered sessions that never reached Razorpay"
            />
            <Metric
              label="Razorpay abandonment"
              value={
                funnel.checkout_abandonment_rate == null
                  ? '—'
                  : `${funnel.checkout_abandonment_rate}%`
              }
              hint="Opened Razorpay but did not purchase (separate metric)"
            />
          </div>
          <p className="text-xs text-[#241621]/45 font-body max-w-2xl">
            <strong className="text-[#241621]">Stopped after address</strong> only counts people
            who added to cart and filled address, then left <em>before</em> Razorpay. Anyone who
            opened payment is excluded from that number.
          </p>
        </>
      )}

      {section === 'customers' && (
        <>
          <SectionTitle icon={Users}>Sign-ins</SectionTitle>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Metric
              label="New sign-ins (period)"
              value={customers.new_signups ?? 0}
              hint="New accounts created in this range"
            />
            <Metric label="Total signed-in users" value={customers.total_users ?? 0} />
            <Metric label="Repeat buyers (all time)" value={customers.repeat_buyers ?? 0} />
          </div>
        </>
      )}

      {section === 'reimagine' && (
        <>
          <SectionTitle icon={Scissors}>Reimagine</SectionTitle>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Metric label="Remake requests" value={reimagine.remake_requests ?? 0} />
            <Metric label="Consultations / callbacks" value={reimagine.consultations ?? 0} />
            <Metric label="Paid consultation fees" value={money(reimagine.paid_consultation_fees)} />
          </div>
        </>
      )}

      {section === 'engagement' && (
        <>
          <SectionTitle icon={Heart}>Engagement</SectionTitle>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Metric label="Wishlist adds" value={engagement.wishlist_adds ?? 0} />
            <Metric label="Repair waitlist" value={engagement.waitlist?.repair ?? 0} />
            <Metric label="Donate waitlist" value={engagement.waitlist?.donate ?? 0} />
            <Metric label="Contact inquiries" value={engagement.contact_inquiries ?? 0} />
          </div>
        </>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Ticket, Gift, TrendingUp, Users } from 'lucide-react';
import api from '../../../utils/api';
import { Spinner } from '../../../components/ui/Skeleton';
import { adminHeaders, rupees, formatDateTime, formatDay } from './promoUtils';

function Card({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-[#241621]/8">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}18` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <p className="text-2xl font-black text-[#241621] font-display">{value}</p>
      <p className="text-xs text-[#241621]/45 font-body mt-1">{label}</p>
      {sub && <p className="text-[11px] text-[#241621]/60 font-body mt-1.5">{sub}</p>}
    </div>
  );
}

export default function PromotionStats() {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState(null);
  const [loadedDays, setLoadedDays] = useState(null);
  const [error, setError] = useState('');
  const loading = loadedDays !== days;

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/admin/promotions/stats?days=${days}`, { headers: adminHeaders() })
      .then(({ data }) => {
        if (!cancelled) {
          setStats(data.stats);
          setError('');
        }
      })
      .catch(() => !cancelled && setError('Could not load stats'))
      .finally(() => !cancelled && setLoadedDays(days));
    return () => {
      cancelled = true;
    };
  }, [days]);

  if (loading && !stats) return <div className="flex justify-center py-16"><Spinner size={28} /></div>;
  if (error && !stats) return <p className="text-center text-sm text-[#e34334] font-body py-10">{error}</p>;

  const c = stats.coupons;
  const g = stats.gift_cards;
  const maxDaily = Math.max(1, ...stats.daily.map((d) => d.coupon_uses + d.gift_card_uses));

  return (
    <div className={`space-y-8 ${loading ? 'opacity-60' : ''}`}>
      <section>
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#241621]/45 font-display mb-3">Coupons</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card icon={Ticket} color="#7A063C" label="Active coupons" value={`${c.active} / ${c.total}`} />
          <Card icon={Users} color="#1b4e81" label="Times used" value={c.redemptions} sub={`${c.customers} unique customers`} />
          <Card icon={Ticket} color="#e34334" label="Discount given" value={rupees(c.discount_given)} />
          <Card icon={TrendingUp} color="#a8e000" label="Revenue from coupon orders" value={rupees(c.revenue)} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#241621]/45 font-display mb-3">Gift cards</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            icon={Gift}
            color="#7A063C"
            label="Active gift cards"
            value={`${g.active} / ${g.total}`}
            sub={`${g.fully_redeemed} fully redeemed`}
          />
          <Card icon={Gift} color="#1b4e81" label="Total value issued" value={rupees(g.issued_value)} sub="value × allowed uses" />
          <Card
            icon={Users}
            color="#e34334"
            label="Value redeemed"
            value={rupees(g.redeemed_value)}
            sub={`${g.redemptions} redemptions · ${g.outstanding_uses} uses left`}
          />
          <Card icon={TrendingUp} color="#a8e000" label="Revenue from gift card orders" value={rupees(g.revenue)} />
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-[#241621]/8 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-bold text-[#241621] font-display">Daily usage</h2>
          <div className="flex gap-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded-lg text-xs font-display font-semibold ${
                  days === d ? 'bg-[#241621] text-white' : 'text-[#241621]/55 hover:bg-[#241621]/5'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        {stats.daily.length === 0 ? (
          <p className="text-sm text-[#241621]/40 font-body py-6 text-center">No coupon or gift card use in this period.</p>
        ) : (
          <div className="space-y-1.5">
            {stats.daily.map((d) => {
              const totalUses = d.coupon_uses + d.gift_card_uses;
              return (
                <div key={d.day} className="flex items-center gap-3 text-xs font-body">
                  <span className="w-24 shrink-0 text-[#241621]/55">{formatDay(d.day)}</span>
                  <div className="flex-1 h-4 bg-[#241621]/5 rounded overflow-hidden flex">
                    <div className="h-full bg-[#7A063C]" style={{ width: `${(d.coupon_uses / maxDaily) * 100}%` }} />
                    <div className="h-full bg-[#c8ff2e]" style={{ width: `${(d.gift_card_uses / maxDaily) * 100}%` }} />
                  </div>
                  <span className="w-40 shrink-0 text-right text-[#241621]/70">
                    {totalUses} used · {rupees(d.discount)} off
                  </span>
                </div>
              );
            })}
            <div className="flex gap-4 pt-2 text-[11px] text-[#241621]/50 font-body">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#7A063C]" /> Coupons</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#c8ff2e]" /> Gift cards</span>
            </div>
          </div>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-[#241621]/8 p-5">
          <h2 className="text-sm font-bold text-[#241621] font-display mb-4">Top coupons</h2>
          {stats.top_coupons.length === 0 ? (
            <p className="text-sm text-[#241621]/40 font-body py-4 text-center">No coupons used yet.</p>
          ) : (
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="text-left text-[10px] font-mono-tj uppercase tracking-wider text-[#241621]/40">
                  <th className="pb-2 font-normal">Code</th>
                  <th className="pb-2 font-normal text-right">Uses</th>
                  <th className="pb-2 font-normal text-right">Discount</th>
                  <th className="pb-2 font-normal text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#241621]/6">
                {stats.top_coupons.map((t) => (
                  <tr key={t.code}>
                    <td className="py-2 font-mono-tj text-[#241621]">{t.code}</td>
                    <td className="py-2 text-right">{t.uses}</td>
                    <td className="py-2 text-right">{rupees(t.discount)}</td>
                    <td className="py-2 text-right">{rupees(t.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-[#241621]/8 p-5">
          <h2 className="text-sm font-bold text-[#241621] font-display mb-4">Recent redemptions</h2>
          {stats.recent.length === 0 ? (
            <p className="text-sm text-[#241621]/40 font-body py-4 text-center">Nothing redeemed yet.</p>
          ) : (
            <div className="divide-y divide-[#241621]/6 max-h-80 overflow-y-auto">
              {stats.recent.map((r) => (
                <div key={r.id} className="py-2.5 flex items-start justify-between gap-3 text-sm font-body">
                  <div className="min-w-0">
                    <p className="text-[#241621]">
                      <span className="text-[10px] font-mono-tj uppercase tracking-wider text-[#241621]/45 mr-1.5">
                        {r.kind === 'coupon' ? 'Coupon' : 'Gift card'}
                      </span>
                      <span className="font-mono-tj">{r.code}</span>
                    </p>
                    <p className="text-xs text-[#241621]/50 truncate">
                      {r.user_name || r.user_email || 'Customer'} · #{String(r.order_id).slice(0, 8).toUpperCase()} ·{' '}
                      {formatDateTime(r.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-[#241621]">−{rupees(r.discount_amount)}</p>
                    {r.order_total != null && (
                      <p className="text-xs text-[#241621]/50">paid {rupees(r.order_total)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

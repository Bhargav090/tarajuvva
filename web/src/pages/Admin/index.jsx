import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ShoppingBag, Scissors, Users, Menu, X,
  LogOut, TrendingUp, Package, Clock, Star,
} from 'lucide-react';
import { useAdminAuth, useAdminStats, useAdminOrders, useAdminReimagine, useAdminWaitlist } from '../../hooks/useAdmin';
import { Input } from '../../components/ui/FormField';
import { Badge } from '../../components/ui/Badge';
import StatusSelect from '../../components/ui/StatusSelect';
import Button from '../../components/ui/Button';
import { Spinner, TableSkeleton } from '../../components/ui/Skeleton';
import { ORDER_STATUSES, REIMAGINE_STATUSES } from '../../utils/constants';

// ── Login ──────────────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAdminAuth();

  const onSubmit = async e => {
    e.preventDefault(); setError('');
    setLoading(true);
    const err = await login(form.username, form.password);
    if (err) { setError(err); setLoading(false); }
    else onLogin();
  };

  return (
    <div className="min-h-screen bg-[#341631] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-[#eef4d1] rounded-3xl p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#0b4722] flex items-center justify-center mx-auto mb-4">
            <span className="text-[#eef4d1] font-black text-xl font-[Outfit]">T</span>
          </div>
          <h1 className="text-2xl font-black text-[#341631] font-[Outfit]">Admin Panel</h1>
          <p className="text-[#341631]/50 text-sm font-[Poppins] mt-1">Sign in to continue</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Username" name="username" value={form.username} onChange={e => setForm(p => ({...p, username: e.target.value}))} required />
          <Input label="Password" name="password" type="password" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} required />
          {error && <p className="text-[#e34334] text-xs font-medium font-[Poppins] text-center">{error}</p>}
          <Button type="submit" variant="primary" fullWidth size="lg" loading={loading}>Sign In</Button>
        </form>
      </motion.div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-[#341631]/8">
      <div className="flex items-center justify-between mb-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: color + '18' }}>
          <Icon size={20} style={{ color }} />
        </div>
        {sub && <span className="text-xs text-[#0b4722] font-semibold font-[Outfit]">{sub}</span>}
      </div>
      <p className="text-2xl font-black text-[#341631] font-[Outfit]">{value ?? '—'}</p>
      <p className="text-xs text-[#341631]/45 font-[Poppins] mt-1">{label}</p>
    </div>
  );
}

const TABS = [
  { id: 'overview',  label: 'Overview',          icon: LayoutDashboard },
  { id: 'orders',    label: 'Orders',             icon: ShoppingBag    },
  { id: 'reimagine', label: 'Reimagine',          icon: Scissors       },
  { id: 'waitlist',  label: 'Waitlist',           icon: Users          },
];

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Admin() {
  const { token, logout, isLoaded } = useAdminAuth();
  const [loggedIn, setLoggedIn] = useState(!!token);
  const [tab, setTab]    = useState('overview');
  const [sidebar, setSidebar] = useState(false);

  if (!isLoaded) return <div className="min-h-screen bg-[#341631] flex items-center justify-center"><Spinner color="#eef4d1" size={32} /></div>;
  if (!loggedIn) return <AdminLogin onLogin={() => setLoggedIn(true)} />;

  return (
    <div className="min-h-screen bg-[#eef4d1] flex">
      {/* Sidebar Overlay (mobile) */}
      <AnimatePresence>
        {sidebar && (
          <motion.div className="fixed inset-0 bg-black/30 z-30 lg:hidden"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSidebar(false)} />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {(sidebar || true) && (
          <motion.aside
            className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-[#341631] z-40 flex flex-col transition-transform duration-300 ${sidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
          >
            <div className="px-6 py-6 border-b border-[#eef4d1]/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#0b4722] flex items-center justify-center">
                  <span className="text-[#eef4d1] font-black text-sm font-[Outfit]">T</span>
                </div>
                <div>
                  <p className="text-[#eef4d1] font-black text-sm font-[Outfit]">Tarajuvva</p>
                  <p className="text-[#eef4d1]/40 text-xs font-[Poppins]">Admin Panel</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1">
              {TABS.map(t => (
                <button key={t.id} onClick={() => { setTab(t.id); setSidebar(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold font-[Outfit] transition-all ${
                    tab === t.id
                      ? 'bg-[#eef4d1] text-[#341631]'
                      : 'text-[#eef4d1]/60 hover:text-[#eef4d1] hover:bg-[#eef4d1]/8'
                  }`}
                >
                  <t.icon size={16} /> {t.label}
                </button>
              ))}
            </nav>

            <div className="px-3 py-4 border-t border-[#eef4d1]/10">
              <button onClick={() => { logout(); setLoggedIn(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold font-[Outfit] text-[#e34334]/70 hover:text-[#e34334] hover:bg-[#e34334]/8 transition-all">
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 min-w-0">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-4 px-4 py-4 bg-white border-b border-[#341631]/8 sticky top-0 z-20">
          <button onClick={() => setSidebar(true)} className="p-2 rounded-xl hover:bg-[#eef4d1]">
            <Menu size={20} className="text-[#341631]" />
          </button>
          <p className="font-black text-[#341631] font-[Outfit]">Admin Panel</p>
        </div>

        <div className="p-5 sm:p-8">
          {tab === 'overview' && <OverviewTab />}
          {tab === 'orders' && <OrdersTab />}
          {tab === 'reimagine' && <ReimagineTab />}
          {tab === 'waitlist' && <WaitlistTab />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab() {
  const { stats, loading } = useAdminStats();
  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;
  return (
    <div>
      <h1 className="text-2xl font-black text-[#341631] font-[Outfit] mb-8">Overview</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingBag} label="Total Orders" value={stats?.orders?.total ?? 0} color="#0b4722" sub={`${stats?.orders?.pending ?? 0} pending`} />
        <StatCard icon={TrendingUp} label="Revenue" value={`₹${Number(stats?.revenue || 0).toLocaleString('en-IN')}`} color="#6c0b20" />
        <StatCard icon={Scissors} label="Reimagine Requests" value={stats?.reimagine?.total ?? 0} color="#e34334" sub={`${stats?.reimagine?.pending ?? 0} pending`} />
        <StatCard icon={Package} label="Products" value={stats?.products ?? 0} color="#015395" />
      </div>
      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        <StatCard icon={Users} label="Repair Waitlist" value={stats?.waitlist?.repair ?? 0} color="#e34334" />
        <StatCard icon={Users} label="Donate Waitlist" value={stats?.waitlist?.donate ?? 0} color="#015395" />
      </div>
    </div>
  );
}

function OrdersTab() {
  const { orders, loading, updateStatus } = useAdminOrders();
  if (loading) return <TableSkeleton rows={6} cols={5} />;
  return (
    <div>
      <h1 className="text-2xl font-black text-[#341631] font-[Outfit] mb-6">Orders ({orders.length})</h1>
      <div className="space-y-3">
        {orders.map(o => (
          <div key={o.id} className="bg-white rounded-2xl p-5 border border-[#341631]/8">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-xs text-[#341631]/40 font-[Poppins]">#{o.id.slice(0,8).toUpperCase()}</p>
                <p className="font-bold text-[#341631] font-[Outfit]">{o.user_name}</p>
                <p className="text-xs text-[#341631]/50 font-[Poppins]">{o.user_phone}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-black text-[#0b4722] font-[Outfit]">₹{o.total.toLocaleString('en-IN')}</span>
                <StatusSelect value={o.status} options={ORDER_STATUSES} onUpdate={s => updateStatus(o.id, s)} />
              </div>
            </div>
            <div className="text-xs text-[#341631]/45 font-[Poppins]">
              {o.items.map((it, i) => `${it.name} ×${it.qty}`).join(', ')}
            </div>
            <p className="text-xs text-[#341631]/35 font-[Poppins] mt-1">{o.address}</p>
          </div>
        ))}
        {orders.length === 0 && <p className="text-center text-[#341631]/40 font-[Poppins] py-12">No orders yet.</p>}
      </div>
    </div>
  );
}

function ReimagineTab() {
  const { requests, loading, updateStatus } = useAdminReimagine();
  if (loading) return <TableSkeleton rows={6} cols={4} />;
  return (
    <div>
      <h1 className="text-2xl font-black text-[#341631] font-[Outfit] mb-6">Reimagine Requests ({requests.length})</h1>
      <div className="space-y-3">
        {requests.map(r => (
          <div key={r.id} className="bg-white rounded-2xl p-5 border border-[#341631]/8">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-bold text-[#341631] font-[Outfit]">{r.user_name}</p>
                <p className="text-sm text-[#6c0b20] font-[Outfit]">{r.garment_type} → {r.transformation}</p>
                <p className="text-xs text-[#341631]/45 font-[Poppins]">{r.user_phone}</p>
              </div>
              <StatusSelect value={r.status} options={REIMAGINE_STATUSES} onUpdate={s => updateStatus(r.id, s)} />
            </div>
            {r.notes && <p className="text-xs text-[#341631]/55 font-[Poppins] bg-[#eef4d1] rounded-lg p-2 mt-2">{r.notes}</p>}
            {r.images?.length > 0 && (
              <div className="flex gap-2 mt-3">
                {r.images.map((img, i) => (
                  <a key={i} href={img} target="_blank" rel="noreferrer">
                    <img src={img} alt="" className="w-12 h-12 rounded-lg object-cover hover:opacity-80" />
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
        {requests.length === 0 && <p className="text-center text-[#341631]/40 font-[Poppins] py-12">No reimagine requests yet.</p>}
      </div>
    </div>
  );
}

function WaitlistTab() {
  const { repair, donate, loading } = useAdminWaitlist();
  if (loading) return <TableSkeleton rows={6} cols={3} />;

  const Section = ({ title, data, color }) => (
    <div>
      <h2 className="text-lg font-bold text-[#341631] font-[Outfit] mb-4" style={{ color }}>{title} ({data.length})</h2>
      <div className="space-y-2 mb-8">
        {data.map(w => (
          <div key={w.id} className="bg-white rounded-xl px-5 py-3 border border-[#341631]/8 flex items-center justify-between">
            <div>
              <p className="font-semibold text-[#341631] font-[Outfit] text-sm">{w.name}</p>
              <p className="text-xs text-[#341631]/45 font-[Poppins]">{w.email} · {w.phone || 'No phone'}</p>
            </div>
            <p className="text-xs text-[#341631]/35 font-[Poppins]">{new Date(w.created_at).toLocaleDateString('en-IN')}</p>
          </div>
        ))}
        {data.length === 0 && <p className="text-[#341631]/40 font-[Poppins] text-sm py-4 text-center">No entries yet.</p>}
      </div>
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-black text-[#341631] font-[Outfit] mb-8">Waitlist</h1>
      <Section title="🔧 Repair" data={repair} color="#e34334" />
      <Section title="💙 Donate" data={donate} color="#015395" />
    </div>
  );
}

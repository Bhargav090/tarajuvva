import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, ShoppingBag, Scissors, Users, Menu, X,
  LogOut, TrendingUp, Package, Key, Tag,
} from 'lucide-react';
import {
  useAdminAuth,
  useAdminStats,
  useAdminOrders,
  useAdminReimagine,
  useAdminWaitlist,
  changeAdminPassword,
} from '../../hooks/useAdmin';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Input } from '../../components/ui/FormField';
import { Badge } from '../../components/ui/Badge';
import StatusSelect from '../../components/ui/StatusSelect';
import Button from '../../components/ui/Button';
import { Spinner, TableSkeleton } from '../../components/ui/Skeleton';
import { ORDER_STATUSES, REIMAGINE_STATUSES } from '../../utils/constants';
import ProductConfiguratorTab from './ProductConfiguratorTab';
import { uploadUrl } from '../../utils/uploadUrl';
import darkBrandIcon from '../../assets/icons/Artboard 2 copy 2@2x-8.png';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-[#241621]/8">
      <div className="flex items-center justify-between mb-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: color + '18' }}>
          <Icon size={20} style={{ color }} />
        </div>
        {sub && <span className="text-xs text-[#a8c74a] font-semibold font-display">{sub}</span>}
      </div>
      <p className="text-2xl font-black text-[#241621] font-display">{value ?? '—'}</p>
      <p className="text-xs text-[#241621]/45 font-body mt-1">{label}</p>
    </div>
  );
}

const TABS = [
  { id: 'overview',  label: 'Overview',          icon: LayoutDashboard },
  { id: 'orders',    label: 'Orders',             icon: ShoppingBag    },
  { id: 'reimagine', label: 'Reimagine',          icon: Scissors       },
  { id: 'waitlist',  label: 'Waitlist',           icon: Users          },
  { id: 'products',  label: 'Products',           icon: Tag            },
];

function AdminChangePasswordModal({ open, onClose }) {
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) {
      setCurrent('');
      setNew('');
      setConfirmPw('');
      setErr('');
    }
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (newPassword !== confirmPw) {
      setErr('New passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await changeAdminPassword(currentPassword, newPassword);
      toast.success('Password updated');
      onClose();
    } catch (err) {
      setErr(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={onSubmit}
        className="relative z-[1] w-full max-w-md rounded-2xl border border-[#241621]/10 bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-black text-[#241621] font-display mb-1">Change password</h2>
        <p className="text-xs text-[#241621]/50 font-body mb-4">Use a strong password you have not used elsewhere.</p>
        <div className="space-y-3">
          <Input label="Current password" name="cur" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} required />
          <Input label="New password" name="new" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNew(e.target.value)} required />
          <Input label="Confirm new password" name="cnew" type="password" autoComplete="new-password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required />
        </div>
        {err && <p className="mt-3 text-xs text-[#e34334] font-body text-center">{err}</p>}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={loading}>Update password</Button>
        </div>
      </form>
    </div>,
    document.body
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Admin() {
  const { token, logout, isLoaded } = useAdminAuth();
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab = TABS.some((t) => t.id === tabParam) ? tabParam : 'overview';
  const setTab = (id) => {
    if (id === 'overview') setSearchParams({}, { replace: true });
    else setSearchParams({ tab: id }, { replace: true });
  };
  const [sidebar, setSidebar] = useState(false);

  if (!isLoaded) return <div className="min-h-screen bg-[#241621] flex items-center justify-center"><Spinner color="#eef4d1" size={32} /></div>;
  if (!token) return <Navigate to="/login" replace state={{ from: '/admin' }} />;

  return (
    <>
    <div className="min-h-screen bg-white flex">
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
            className={`fixed inset-y-0 left-0 z-40 flex h-screen w-56 shrink-0 flex-col overflow-hidden bg-[#241621] transition-transform duration-300 lg:relative lg:translate-x-0 ${sidebar ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <div className="flex justify-center py-6 border-b border-[#eef4d1]/10">
              <img src={darkBrandIcon} alt="Tarajuvva" className="w-24 h-auto object-contain" />
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1">
              {TABS.map(t => (
                <button key={t.id} onClick={() => { setTab(t.id); setSidebar(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold font-display transition-all ${
                    tab === t.id
                      ? 'bg-white text-[#241621]'
                      : 'text-[#eef4d1]/60 hover:text-[#eef4d1] hover:bg-white/10'
                  }`}
                >
                  <t.icon size={16} /> {t.label}
                </button>
              ))}
            </nav>

            <div className="px-3 py-4 border-t border-[#eef4d1]/10 space-y-1">
              <button type="button" onClick={() => setPwOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold font-display text-[#eef4d1]/70 hover:text-[#eef4d1] hover:bg-white/10 transition-all">
                <Key size={16} /> Change password
              </button>
              <button type="button" onClick={() => setLogoutOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold font-display text-[#e34334]/70 hover:text-[#e34334] hover:bg-[#e34334]/8 transition-all">
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 min-w-0">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-4 px-4 py-4 bg-white border-b border-[#241621]/8 sticky top-0 z-20">
          <button onClick={() => setSidebar(true)} className="p-2 rounded-xl hover:bg-gray-50">
            <Menu size={20} className="text-[#241621]" />
          </button>
          <p className="font-black text-[#241621] font-display">Admin Panel</p>
        </div>

        <div className="p-5 sm:p-8">
          {tab === 'overview' && <OverviewTab />}
          {tab === 'orders' && <OrdersTab />}
          {tab === 'reimagine' && <ReimagineTab />}
          {tab === 'waitlist' && <WaitlistTab />}
          {tab === 'products' && <ProductConfiguratorTab />}
        </div>
      </div>
    </div>
    <ConfirmDialog
      open={logoutOpen}
      onClose={() => setLogoutOpen(false)}
      title="Sign out?"
      message="You will need to sign in again to access the admin panel."
      confirmLabel="Sign out"
      cancelLabel="Stay signed in"
      confirmVariant="red"
      onConfirm={() => {
        logout();
        navigate('/login', { replace: true });
      }}
    />
    <AdminChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </>
  );
}

function OverviewTab() {
  const { stats, loading } = useAdminStats();
  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;
  return (
    <div>
      <h1 className="text-2xl font-black text-[#241621] font-display mb-8">Overview</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingBag} label="Total Orders" value={stats?.orders?.total ?? 0} color="#a8c74a" sub={`${stats?.orders?.pending ?? 0} pending`} />
        <StatCard icon={TrendingUp} label="Revenue" value={`₹${Number(stats?.revenue || 0).toLocaleString('en-IN')}`} color="#4c1b1b" />
        <StatCard icon={Scissors} label="Reimagine Requests" value={stats?.reimagine?.total ?? 0} color="#e34334" sub={`${stats?.reimagine?.pending ?? 0} pending`} />
        <StatCard icon={Package} label="Products" value={stats?.products ?? 0} color="#1b4e81" />
      </div>
      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        <StatCard icon={Users} label="Repair Waitlist" value={stats?.waitlist?.repair ?? 0} color="#e34334" />
        <StatCard icon={Users} label="Donate Waitlist" value={stats?.waitlist?.donate ?? 0} color="#1b4e81" />
      </div>
    </div>
  );
}

function OrdersTab() {
  const { orders, loading, updateStatus } = useAdminOrders();
  if (loading) return <TableSkeleton rows={6} cols={5} />;
  return (
    <div>
      <h1 className="text-2xl font-black text-[#241621] font-display mb-6">Orders ({orders.length})</h1>
      <div className="space-y-3">
        {orders.map(o => (
          <div key={o.id} className="bg-white rounded-2xl p-5 border border-[#241621]/8">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-xs text-[#241621]/40 font-body">#{o.id.slice(0,8).toUpperCase()}</p>
                <p className="font-bold text-[#241621] font-display">{o.user_name}</p>
                <p className="text-xs text-[#241621]/50 font-body">{o.user_phone}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-black text-[#a8c74a] font-display">₹{o.total.toLocaleString('en-IN')}</span>
                <StatusSelect value={o.status} options={ORDER_STATUSES} onUpdate={s => updateStatus(o.id, s)} />
              </div>
            </div>
            <div className="text-xs text-[#241621]/45 font-body">
              {o.items.map((it, i) => `${it.name} ×${it.qty}`).join(', ')}
            </div>
            <p className="text-xs text-[#241621]/35 font-body mt-1">{o.address}</p>
          </div>
        ))}
        {orders.length === 0 && <p className="text-center text-[#241621]/40 font-body py-12">No orders yet.</p>}
      </div>
    </div>
  );
}

function ReimagineTab() {
  const { requests, loading, updateStatus } = useAdminReimagine();
  if (loading) return <TableSkeleton rows={6} cols={4} />;
  return (
    <div>
      <h1 className="text-2xl font-black text-[#241621] font-display mb-6">Reimagine Requests ({requests.length})</h1>
      <div className="space-y-4">
        {requests.map(r => (
          <div key={r.id} className="bg-white rounded-2xl p-5 sm:p-6 border border-[#241621]/8">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <p className="text-xs text-[#241621]/40 font-mono-tj uppercase tracking-wider">
                  #{r.id.slice(0, 8).toUpperCase()} · {formatDate(r.created_at)}
                </p>
                <p className="font-bold text-[#241621] font-display text-lg mt-1">{r.user_name}</p>
                <p className="text-sm text-[#4c1b1b] font-display mt-0.5">
                  {capitalize(r.garment_type)} → {r.transformation}
                  {r.is_custom && (
                    <span className="ml-2 inline-block text-[10px] font-mono-tj uppercase tracking-wider bg-[#4c1b1b]/10 text-[#4c1b1b] px-2 py-0.5 rounded">
                      Custom
                    </span>
                  )}
                </p>
              </div>
              <StatusSelect value={r.status} options={REIMAGINE_STATUSES} onUpdate={s => updateStatus(r.id, s)} />
            </div>

            <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm border-t border-[#241621]/8 pt-4">
              <div>
                <dt className="text-[10px] font-mono-tj uppercase tracking-wider text-[#241621]/45 mb-0.5">Phone</dt>
                <dd className="text-[#241621] font-body">{r.user_phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-mono-tj uppercase tracking-wider text-[#241621]/45 mb-0.5">Email</dt>
                <dd className="text-[#241621] font-body break-all">{r.user_email || '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[10px] font-mono-tj uppercase tracking-wider text-[#241621]/45 mb-0.5">Pickup / delivery address</dt>
                <dd className="text-[#241621] font-body whitespace-pre-wrap">{r.address || '—'}</dd>
              </div>
              {r.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-[10px] font-mono-tj uppercase tracking-wider text-[#241621]/45 mb-0.5">Notes</dt>
                  <dd className="text-[#241621]/75 font-body whitespace-pre-wrap bg-[#241621]/[0.03] rounded-lg p-3 mt-0.5">
                    {r.notes}
                  </dd>
                </div>
              )}
            </dl>

            {r.images?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#241621]/8">
                <p className="text-[10px] font-mono-tj uppercase tracking-wider text-[#241621]/45 mb-2">
                  Garment photos ({r.images.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {r.images.map((img, i) => (
                    <a
                      key={i}
                      href={uploadUrl(img)}
                      target="_blank"
                      rel="noreferrer"
                      className="block border border-[#241621]/15 rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                    >
                      <img src={uploadUrl(img)} alt={`Garment photo ${i + 1}`} className="w-16 h-16 object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {requests.length === 0 && <p className="text-center text-[#241621]/40 font-body py-12">No reimagine requests yet.</p>}
      </div>
    </div>
  );
}

function WaitlistTab() {
  const { repair, donate, loading } = useAdminWaitlist();
  if (loading) return <TableSkeleton rows={6} cols={3} />;

  const Section = ({ title, data, color }) => (
    <div>
      <h2 className="text-lg font-bold text-[#241621] font-display mb-4" style={{ color }}>{title} ({data.length})</h2>
      <div className="space-y-2 mb-8">
        {data.map(w => (
          <div key={w.id} className="bg-white rounded-xl px-5 py-3 border border-[#241621]/8 flex items-center justify-between">
            <div>
              <p className="font-semibold text-[#241621] font-display text-sm">{w.name}</p>
              <p className="text-xs text-[#241621]/45 font-body">{w.email} · {w.phone || 'No phone'}</p>
            </div>
            <p className="text-xs text-[#241621]/35 font-body">{new Date(w.created_at).toLocaleDateString('en-IN')}</p>
          </div>
        ))}
        {data.length === 0 && <p className="text-[#241621]/40 font-body text-sm py-4 text-center">No entries yet.</p>}
      </div>
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-black text-[#241621] font-display mb-8">Waitlist</h1>
      <Section title="🔧 Repair" data={repair} color="#e34334" />
      <Section title="💙 Donate" data={donate} color="#1b4e81" />
    </div>
  );
}

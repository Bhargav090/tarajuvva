import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Package, Scissors, LogOut, Edit2, Save, X, Clock, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import UserAvatar from '../../components/ui/UserAvatar';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Spinner } from '../../components/ui/Skeleton';
import api from '../../utils/api';
import { formatAddressWithPincode, parseAddressWithPincode } from '../../utils/address';
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '../../utils/constants';
import OrderItemLine from '../../components/orders/OrderItemLine';
import PaginationBar from '../../components/ui/PaginationBar';
import LazyReimagineImages from '../../components/reimagine/LazyReimagineImages';

const TABS = [
  { id: 'profile', label: 'Profile',           icon: User     },
  { id: 'orders',  label: 'My Orders',         icon: Package  },
  { id: 'reimagine', label: 'Reimagine Requests', icon: Scissors },
];

export default function Profile() {
  const { section } = useParams();
  const location = useLocation();
  const { user, loading: authLoading, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab]       = useState(() =>
    section && TABS.some((t) => t.id === section) ? section : 'profile'
  );
  const [editing, setEditing] = useState(false);
  const [form, setForm]     = useState({ name: '', phone: '', address: '', pincode: '' });
  const [saving, setSaving]  = useState(false);
  const [orders, setOrders]  = useState([]);
  const [reimagine, setReimagine] = useState([]);
  const [ordersPage, setOrdersPage] = useState(1);
  const [reimaginePage, setReimaginePage] = useState(1);
  const [ordersPagination, setOrdersPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [reimaginePagination, setReimaginePagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loadingData, setLoadingData] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    if (section && TABS.some((t) => t.id === section)) setTab(section);
    else if (!section) setTab('profile');
  }, [section]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { replace: true, state: { from: location.pathname + location.search } });
      return;
    }
    const parsed = parseAddressWithPincode(user.address);
    setForm({
      name: user.name || '',
      phone: user.phone || '',
      address: parsed.address_line,
      pincode: parsed.pincode,
    });
  }, [user, authLoading, navigate, location.pathname, location.search]);

  useEffect(() => {
    if (tab === 'orders') fetchOrders(ordersPage);
  }, [tab, ordersPage]);

  useEffect(() => {
    if (tab === 'reimagine') fetchReimagine(reimaginePage);
  }, [tab, reimaginePage]);

  const fetchOrders = async (page = 1) => {
    setLoadingData(true);
    try {
      const { data } = await api.get('/users/me/orders', { params: { page, limit: 10 } });
      setOrders(data.orders || []);
      setOrdersPagination(data.pagination || { page, totalPages: 1, total: data.orders?.length || 0 });
    } catch {
      setOrders([]);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchReimagine = async (page = 1) => {
    setLoadingData(true);
    try {
      const { data } = await api.get('/users/me/reimagine', { params: { page, limit: 10 } });
      setReimagine(data.requests || []);
      setReimaginePagination(data.pagination || { page, totalPages: 1, total: data.requests?.length || 0 });
    } catch {
      setReimagine([]);
    } finally {
      setLoadingData(false);
    }
  };

  const onSave = async () => {
    const pin = String(form.pincode || '').trim();
    if (form.address.trim() && !/^\d{6}$/.test(pin)) {
      toast.error('Enter a valid 6-digit pincode');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        address: formatAddressWithPincode(form.address, pin),
      };
      const { data } = await api.put('/users/me', payload);
      updateUser(data.user);
      setEditing(false);
      toast.success('Profile updated!');
    } catch { toast.error('Update failed'); }
    finally { setSaving(false); }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center pt-4">
        <Spinner size={32} />
      </div>
    );
  }
  if (!user) return null;

  return (
    <>
    <div className="min-h-screen bg-white pt-4 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-[#241621]/55 hover:text-[#a8e000] font-display mb-6 transition-colors"
        >
          <ArrowLeft size={15} /> Back to Home
        </Link>
        {/* Header */}
        <div className="flex items-center gap-5 mb-10 p-6 bg-[#c8ff2e] rounded-3xl">
          <UserAvatar
            src={user.avatar}
            name={user.name}
            className="w-16 h-16 rounded-2xl border-2 border-white/40"
            fallbackClassName="bg-[#241621]/10 text-2xl font-black text-[#241621]"
          />
          <motion.div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-[#241621] font-display">{user.name}</h1>
            <p className="text-[#241621]/60 text-sm font-body">{user.email}</p>
          </motion.div>
          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#241621]/20 text-[#241621]/70 hover:text-[#241621] hover:border-[#241621]/40 text-sm font-display transition-all"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                navigate(t.id === 'profile' ? '/profile' : `/profile/${t.id}`, { replace: true });
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold font-display whitespace-nowrap transition-all ${
                tab === t.id
                  ? 'bg-[#c8ff2e] text-[#241621]'
                  : 'text-[#241621] hover:text-[#a8e000] bg-white border border-[#241621]/8'
              }`}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'profile' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#241621]/8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#241621] font-display">Personal Information</h2>
              {!editing ? (
                <Button variant="outline-green" size="sm" icon={Edit2} onClick={() => setEditing(true)}>Edit</Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" icon={Save} loading={saving} onClick={onSave}>Save</Button>
                  <Button variant="ghost" size="sm" icon={X} onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              {editing ? (
                <>
                  <Input label="Full Name" name="name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                  <Input label="Phone" name="phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                  <div className="sm:col-span-2 flex flex-col gap-4">
                    <Input label="Address" name="address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
                    <Input
                      label="Pincode"
                      name="pincode"
                      value={form.pincode}
                      onChange={e => setForm(p => ({ ...p, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                      required={!!form.address.trim()}
                      pattern="[0-9]{6}"
                      inputMode="numeric"
                      placeholder="6-digit PIN"
                    />
                  </div>
                </>
              ) : (
                [
                  { l: 'Full Name', v: user.name },
                  { l: 'Email',     v: user.email },
                  { l: 'Phone',     v: user.phone || '—' },
                  { l: 'Address',   v: user.address || '—' },
                ].map(f => (
                  <div key={f.l} className={f.l === 'Address' ? 'sm:col-span-2' : ''}>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#241621]/40 mb-1 font-display">{f.l}</p>
                    <p className="text-[#241621] font-body text-sm whitespace-pre-wrap">{f.v}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === 'orders' && (
          <div className="space-y-4">
            {loadingData ? (
              <div className="flex justify-center py-16"><Spinner size={32} /></div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-[#241621]/8">
                <Package size={40} className="text-[#241621]/20 mx-auto mb-4" />
                <p className="text-[#241621]/50 font-body">No orders yet.</p>
                <Link to="/shop" className="mt-4 inline-block text-[#a8e000] font-semibold text-sm font-display hover:underline">
                  Start shopping →
                </Link>
              </div>
            ) : orders.map(o => {
              const itemCount = o.items.reduce((n, i) => n + (i.qty || 1), 0);
              const paymentLabel = PAYMENT_METHOD_LABELS[o.payment_method] || o.payment_method;
              const paymentStatus = o.payment_status
                ? PAYMENT_STATUS_LABELS[o.payment_status] || o.payment_status
                : null;

              return (
              <article
                key={o.id}
                className="border border-black bg-white overflow-hidden"
              >
                <Link
                  to={`/profile/orders/${o.id}`}
                  className="flex items-start justify-between gap-4 p-4 sm:p-5 bg-[var(--tj-shop)]/20 border-b border-black/10 hover:bg-[var(--tj-shop)]/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/45 font-display">
                      Order #{o.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-2xl font-black text-[#0a0a0a] font-display mt-1">
                      ₹{o.total.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-black/50 font-body mt-1 flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(o.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                      · {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </p>
                    <p className="text-xs text-black/45 font-body mt-1">
                      {paymentLabel}{paymentStatus ? ` · ${paymentStatus}` : ''}
                    </p>
                  </div>
                  <Badge status={o.status} />
                </Link>

                <div className="p-4 sm:px-5 space-y-0.5">
                  {o.items.slice(0, 3).map((item, i) => (
                    <OrderItemLine key={`${item.id}-${i}`} item={item} compact />
                  ))}
                  {o.items.length > 3 && (
                    <p className="text-xs text-black/40 font-body pt-2 pl-2">
                      +{o.items.length - 3} more item{o.items.length - 3 > 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                <div className="px-4 sm:px-5 pb-4">
                  <Link
                    to={`/profile/orders/${o.id}`}
                    className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-[#0a0a0a] font-display border-b border-black pb-0.5 hover:opacity-70 transition-opacity"
                  >
                    View order details →
                  </Link>
                </div>
              </article>
            );})}
            {!loadingData && orders.length > 0 && (
              <PaginationBar
                page={ordersPagination.page || ordersPage}
                totalPages={ordersPagination.totalPages || 1}
                total={ordersPagination.total || 0}
                onPageChange={setOrdersPage}
                loading={loadingData}
              />
            )}
          </div>
        )}

        {tab === 'reimagine' && (
          <div className="space-y-4">
            {loadingData ? (
              <div className="flex justify-center py-16"><Spinner size={32} /></div>
            ) : reimagine.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-[#241621]/8">
                <Scissors size={40} className="text-[#241621]/20 mx-auto mb-4" />
                <p className="text-[#241621]/50 font-body">No reimagine requests yet.</p>
                <Link to="/reimagine" className="mt-4 inline-block text-[#7A063C] font-semibold text-sm font-display hover:underline">
                  Start Reimagining →
                </Link>
              </div>
            ) : reimagine.map(r => (
              <div key={r.id} className="bg-white rounded-2xl p-5 sm:p-6 border border-[#241621]/8">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-[#241621]/40 font-body mb-1">Request #{r.id.slice(0,8).toUpperCase()}</p>
                    <p className="font-bold text-[#241621] font-display">
                      {r.garment_type} → {r.transformation}
                      {r.is_custom && (
                        <span className="ml-2 text-[10px] font-semibold uppercase text-[#7A063C]">Custom</span>
                      )}
                    </p>
                    <p className="text-xs text-[#241621]/45 font-body mt-0.5 flex items-center gap-1">
                      <Clock size={11} /> {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <Badge status={r.status} />
                </div>
                <dl className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
                  {r.user_phone && (
                    <div>
                      <dt className="text-[10px] uppercase tracking-wider text-[#241621]/40 font-display">Phone</dt>
                      <dd className="text-[#241621]/75 font-body">{r.user_phone}</dd>
                    </div>
                  )}
                  {r.user_email && (
                    <div>
                      <dt className="text-[10px] uppercase tracking-wider text-[#241621]/40 font-display">Email</dt>
                      <dd className="text-[#241621]/75 font-body break-all">{r.user_email}</dd>
                    </div>
                  )}
                  {r.address && (
                    <div className="sm:col-span-2">
                      <dt className="text-[10px] uppercase tracking-wider text-[#241621]/40 font-display">Address</dt>
                      <dd className="text-[#241621]/75 font-body whitespace-pre-wrap">{r.address}</dd>
                    </div>
                  )}
                  {r.notes && (
                    <div className="sm:col-span-2">
                      <dt className="text-[10px] uppercase tracking-wider text-[#241621]/40 font-display">Your notes</dt>
                      <dd className="text-[#241621]/75 font-body whitespace-pre-wrap">{r.notes}</dd>
                    </div>
                  )}
                </dl>
                <LazyReimagineImages
                  requestId={r.id}
                  imageCount={r.image_count || r.images?.length || 0}
                  endpoint={`/users/me/reimagine/${r.id}/images`}
                  thumbClassName="w-14 h-14 rounded-lg object-cover border border-[#241621]/10"
                />
                {r.admin_notes && (
                  <div className="mt-4 p-3 bg-[#7A063C]/5 rounded-xl border border-[#7A063C]/10">
                    <p className="text-xs font-bold text-[#241621]/50 mb-1 font-display">Note from team</p>
                    <p className="text-sm text-[#241621] font-body">{r.admin_notes}</p>
                  </div>
                )}
              </div>
            ))}
            {!loadingData && reimagine.length > 0 && (
              <PaginationBar
                page={reimaginePagination.page || reimaginePage}
                totalPages={reimaginePagination.totalPages || 1}
                total={reimaginePagination.total || 0}
                onPageChange={setReimaginePage}
                loading={loadingData}
              />
            )}
          </div>
        )}
      </div>
    </div>
    <ConfirmDialog
      open={logoutOpen}
      onClose={() => setLogoutOpen(false)}
      title="Sign out?"
      message="You will need to sign in again to access your account and orders."
      confirmLabel="Sign out"
      cancelLabel="Stay signed in"
      confirmVariant="red"
      onConfirm={() => {
        logout();
        navigate('/');
        toast.success('Signed out.');
      }}
    />
    </>
  );
}

import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Package, Scissors, LogOut, Edit2, Save, X, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import UserAvatar from '../../components/ui/UserAvatar';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Spinner } from '../../components/ui/Skeleton';
import api from '../../utils/api';
import { uploadUrl } from '../../utils/uploadUrl';
import OrderItemLine from '../../components/orders/OrderItemLine';

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
  const [form, setForm]     = useState({ name: '', phone: '', address: '' });
  const [saving, setSaving]  = useState(false);
  const [orders, setOrders]  = useState([]);
  const [reimagine, setReimagine] = useState([]);
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
    setForm({ name: user.name || '', phone: user.phone || '', address: user.address || '' });
  }, [user, authLoading, navigate, location.pathname, location.search]);

  useEffect(() => {
    if (tab === 'orders' && orders.length === 0)   fetchOrders();
    if (tab === 'reimagine' && reimagine.length === 0) fetchReimagine();
  }, [tab]);

  const fetchOrders = async () => {
    setLoadingData(true);
    try { const { data } = await api.get('/users/me/orders'); setOrders(data.orders || []); }
    catch {} finally { setLoadingData(false); }
  };

  const fetchReimagine = async () => {
    setLoadingData(true);
    try { const { data } = await api.get('/users/me/reimagine'); setReimagine(data.requests || []); }
    catch {} finally { setLoadingData(false); }
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/users/me', form);
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
        {/* Header */}
        <div className="flex items-center gap-5 mb-10 p-6 bg-[#a8c74a] rounded-3xl">
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
                  ? 'bg-[#a8c74a] text-[#241621]'
                  : 'text-[#241621]/60 hover:text-[#241621] bg-white border border-[#241621]/8'
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
                  <div className="sm:col-span-2">
                    <Input label="Address" name="address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
                  </div>
                </>
              ) : (
                [
                  { l: 'Full Name', v: user.name },
                  { l: 'Email',     v: user.email },
                  { l: 'Phone',     v: user.phone || '—' },
                  { l: 'Address',   v: user.address || '—' },
                ].map(f => (
                  <div key={f.l}>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#241621]/40 mb-1 font-display">{f.l}</p>
                    <p className="text-[#241621] font-body text-sm">{f.v}</p>
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
                <Link to="/shop" className="mt-4 inline-block text-[#a8c74a] font-semibold text-sm font-display hover:underline">
                  Start shopping →
                </Link>
              </div>
            ) : orders.map(o => (
              <div
                key={o.id}
                className="bg-white rounded-2xl p-5 sm:p-6 border border-[#241621]/8"
              >
                <Link
                  to={`/profile/orders/${o.id}`}
                  className="flex items-start justify-between gap-4 mb-4 group"
                >
                  <div>
                    <p className="text-xs text-[#241621]/40 font-body mb-1">Order #{o.id.slice(0,8).toUpperCase()}</p>
                    <p className="text-lg font-black text-[#a8c74a] font-display">₹{o.total.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-[#241621]/45 font-body mt-0.5 flex items-center gap-1">
                      <Clock size={11} /> {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <Badge status={o.status} />
                </Link>
                <div className="space-y-1 border-t border-[#241621]/8 pt-3">
                  {o.items.map((item, i) => (
                    <OrderItemLine key={`${item.id}-${i}`} item={item} />
                  ))}
                </div>
                <Link
                  to={`/profile/orders/${o.id}`}
                  className="mt-4 inline-block text-xs font-semibold text-[#a8c74a] font-display hover:underline"
                >
                  View order details →
                </Link>
              </div>
            ))}
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
                <Link to="/reimagine" className="mt-4 inline-block text-[#4c1b1b] font-semibold text-sm font-display hover:underline">
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
                        <span className="ml-2 text-[10px] font-semibold uppercase text-[#4c1b1b]">Custom</span>
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
                {r.images?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {r.images.map((img, i) => (
                      <a key={i} href={uploadUrl(img)} target="_blank" rel="noreferrer">
                        <img src={uploadUrl(img)} alt="" className="w-14 h-14 rounded-lg object-cover border border-[#241621]/10 hover:opacity-80" />
                      </a>
                    ))}
                  </div>
                )}
                {r.admin_notes && (
                  <div className="mt-4 p-3 bg-[#4c1b1b]/5 rounded-xl border border-[#4c1b1b]/10">
                    <p className="text-xs font-bold text-[#241621]/50 mb-1 font-display">Note from team</p>
                    <p className="text-sm text-[#241621] font-body">{r.admin_notes}</p>
                  </div>
                )}
              </div>
            ))}
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

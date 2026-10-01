import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  Mail,
  Phone,
  Calendar,
  ShoppingBag,
  Scissors,
  ArrowUpDown,
  ExternalLink,
  Copy,
  Check,
  X,
  UserCheck,
  ShieldCheck,
  TrendingUp,
  MapPin,
  Package,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminUsers } from '../../hooks/useAdmin';
import Button from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner, TableSkeleton } from '../../components/ui/Skeleton';
import PaginationBar from '../../components/ui/PaginationBar';
import { downloadCsv } from '../../utils/exportCsv';
import api from '../../utils/api';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function money(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}

function CopyBtn({ value, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(String(value));
          setCopied(true);
          toast.success(`Copied ${label}`);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error('Failed to copy');
        }
      }}
      className="inline-flex items-center gap-1 text-[11px] font-mono-tj text-[#241621]/45 hover:text-[#241621] transition-colors"
      title={`Copy ${label}`}
    >
      {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
      {copied ? 'Copied' : label}
    </button>
  );
}

function UserDetailModal({ userId, onClose, onNavigateTab }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useState(() => {
    if (!userId) return;
    setLoading(true);
    setError('');
    api
      .get(`/users/${userId}/admin-details`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
      })
      .then((res) => {
        if (res.data.success) {
          setDetails(res.data);
        } else {
          setError(res.data.message || 'Could not load details');
        }
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Error fetching user details');
      })
      .finally(() => setLoading(false));
  }, [userId]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="relative z-10 w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-[#241621]/10 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#241621]/8 bg-[#fafafa]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#7A063C]/10 text-[#7A063C] flex items-center justify-center font-display font-black text-lg">
              {details?.user?.name ? details.user.name.charAt(0).toUpperCase() : <Users size={18} />}
            </div>
            <div>
              <h2 className="text-lg font-black text-[#241621] font-display">
                {details?.user?.name || 'User Profile'}
              </h2>
              <p className="text-xs text-[#241621]/50 font-mono-tj">
                ID: {userId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#241621]/45 hover:text-[#241621] hover:bg-[#241621]/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner size={32} color="#7A063C" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600 font-body text-sm">{error}</div>
          ) : details?.user ? (
            <>
              {/* User Overview Grid */}
              <div className="grid sm:grid-cols-2 gap-4 bg-[#fcfbf7] p-5 rounded-2xl border border-[#241621]/8">
                <div className="space-y-1">
                  <p className="text-[10px] font-mono-tj uppercase tracking-wider text-[#241621]/45">Email</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#241621] font-body break-all">{details.user.email}</p>
                    <CopyBtn value={details.user.email} label="Email" />
                  </div>
                  {details.user.email && (
                    <a
                      href={`mailto:${details.user.email}`}
                      className="inline-flex items-center gap-1 text-xs text-[#7A063C] hover:underline mt-1 font-medium"
                    >
                      <Mail size={12} /> Send Email
                    </a>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-mono-tj uppercase tracking-wider text-[#241621]/45">Phone</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#241621] font-body">{details.user.phone || 'Not provided'}</p>
                    {details.user.phone && <CopyBtn value={details.user.phone} label="Phone" />}
                  </div>
                  {details.user.phone && (
                    <a
                      href={`tel:${details.user.phone}`}
                      className="inline-flex items-center gap-1 text-xs text-[#7A063C] hover:underline mt-1 font-medium"
                    >
                      <Phone size={12} /> Call User
                    </a>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-mono-tj uppercase tracking-wider text-[#241621]/45">Joined Date</p>
                  <p className="text-sm text-[#241621] font-body flex items-center gap-1.5">
                    <Calendar size={13} className="text-[#241621]/40" />
                    {formatDate(details.user.created_at)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-mono-tj uppercase tracking-wider text-[#241621]/45">Role & Status</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={details.user.role === 'admin' ? 'purple' : 'gray'}>
                      {details.user.role || 'user'}
                    </Badge>
                  </div>
                </div>

                {details.user.address && (
                  <div className="sm:col-span-2 space-y-1 border-t border-[#241621]/8 pt-3 mt-1">
                    <p className="text-[10px] font-mono-tj uppercase tracking-wider text-[#241621]/45 flex items-center gap-1">
                      <MapPin size={11} /> Saved Address
                    </p>
                    <p className="text-xs text-[#241621]/80 font-body whitespace-pre-wrap">
                      {details.user.address}
                    </p>
                  </div>
                )}
              </div>

              {/* Order History */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black text-[#241621] font-display flex items-center gap-2">
                    <ShoppingBag size={16} className="text-[#7A063C]" />
                    Orders ({details.orders?.length || 0})
                  </h3>
                </div>

                {!details.orders?.length ? (
                  <p className="text-xs text-[#241621]/40 font-body bg-gray-50 rounded-xl p-4 text-center">
                    No store orders placed yet.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {details.orders.map((o) => (
                      <div
                        key={o.id}
                        className="bg-white rounded-xl p-4 border border-[#241621]/10 hover:border-[#7A063C]/30 transition-colors"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono-tj font-bold text-[#241621]">
                              #{o.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span className="text-xs text-[#241621]/40 font-body">· {formatShortDate(o.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={o.status === 'delivered' ? 'green' : o.status === 'cancelled' ? 'red' : 'yellow'}>
                              {o.status}
                            </Badge>
                            <span className="font-display font-black text-sm text-[#241621]">
                              {money(o.total)}
                            </span>
                          </div>
                        </div>

                        {o.items?.length > 0 && (
                          <div className="text-xs text-[#241621]/70 font-body pl-2 border-l-2 border-[#7A063C]/20 space-y-1 my-2">
                            {o.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center">
                                <span>
                                  {item.title || item.name} {item.size ? `(${item.size})` : ''} × {item.quantity || 1}
                                </span>
                                <span className="font-mono-tj">{money(item.price * (item.quantity || 1))}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reimagine Requests */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black text-[#241621] font-display flex items-center gap-2">
                    <Scissors size={16} className="text-[#e34334]" />
                    Reimagine & Consultations ({details.reimagine?.length || 0})
                  </h3>
                </div>

                {!details.reimagine?.length ? (
                  <p className="text-xs text-[#241621]/40 font-body bg-gray-50 rounded-xl p-4 text-center">
                    No Reimagine transformation requests.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {details.reimagine.map((r) => (
                      <div
                        key={r.id}
                        className="bg-white rounded-xl p-4 border border-[#241621]/10 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono-tj font-bold text-[#241621]">
                              #{r.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span className="text-xs text-[#241621]/40 font-body">· {formatShortDate(r.created_at)}</span>
                          </div>
                          <p className="text-xs font-semibold text-[#7A063C] font-display">
                            {r.garment_type} → {r.transformation}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="blue">{r.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#241621]/8 bg-[#fafafa] flex justify-end">
          <Button type="button" variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

export default function UsersTab({ onNavigateTab }) {
  const { users, loading, reload } = useAdminUsers();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'buyers', 'reimagine', 'new30d'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'spent', 'orders', 'name'
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Stats calculation
  const stats = useMemo(() => {
    const total = users.length;
    const withOrders = users.filter((u) => Number(u.order_count) > 0);
    const totalRevenue = users.reduce((acc, u) => acc + Number(u.total_spent || 0), 0);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const new30d = users.filter((u) => u.created_at && new Date(u.created_at) >= thirtyDaysAgo).length;

    return {
      total,
      withOrdersCount: withOrders.length,
      totalRevenue,
      new30d,
    };
  }, [users]);

  // Filter & Search & Sort
  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Filter type
    if (filter === 'buyers') {
      result = result.filter((u) => Number(u.order_count) > 0);
    } else if (filter === 'reimagine') {
      result = result.filter((u) => Number(u.reimagine_count) > 0);
    } else if (filter === 'new30d') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      result = result.filter((u) => u.created_at && new Date(u.created_at) >= thirtyDaysAgo);
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q) ||
          u.id?.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }
      if (sortBy === 'spent') {
        return Number(b.total_spent || 0) - Number(a.total_spent || 0);
      }
      if (sortBy === 'orders') {
        return Number(b.order_count || 0) - Number(a.order_count || 0);
      }
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      return 0;
    });

    return result;
  }, [users, filter, search, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page]);

  const handleExportCsv = () => {
    downloadCsv(
      `tarajuvva-users-${new Date().toISOString().slice(0, 10)}.csv`,
      ['id', 'name', 'email', 'phone', 'role', 'order_count', 'total_spent_inr', 'reimagine_count', 'created_at'],
      filteredUsers.map((u) => [
        u.id,
        u.name || '',
        u.email || '',
        u.phone || '',
        u.role || 'user',
        u.order_count || 0,
        u.total_spent || 0,
        u.reimagine_count || 0,
        u.created_at || '',
      ])
    );
  };

  if (loading && !users.length) return <TableSkeleton rows={8} cols={5} />;

  return (
    <div className="space-y-6">
      {/* Header & CSV Export */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#241621] font-display flex items-center gap-2.5">
            <Users className="text-[#7A063C]" size={26} />
            Users & Sign-ups ({users.length})
          </h1>
          <p className="text-sm text-[#241621]/55 font-body mt-1">
            Registered customer accounts, sign-in history, and lifetime customer analytics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline-green"
            size="sm"
            onClick={handleExportCsv}
            disabled={!filteredUsers.length}
          >
            Download CSV ({filteredUsers.length})
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-[#241621]/8 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#241621]/50 font-body font-medium">Total Registered</span>
            <div className="w-8 h-8 rounded-xl bg-[#7A063C]/10 text-[#7A063C] flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-[#241621] font-display">{stats.total}</p>
          <p className="text-xs text-[#241621]/45 font-body mt-1">All accounts created</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#241621]/8 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#241621]/50 font-body font-medium">Active Buyers</span>
            <div className="w-8 h-8 rounded-xl bg-[#c8ff2e]/20 text-[#241621] flex items-center justify-center">
              <ShoppingBag size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-[#241621] font-display">{stats.withOrdersCount}</p>
          <p className="text-xs text-[#241621]/45 font-body mt-1">Placed ≥ 1 order</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#241621]/8 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#241621]/50 font-body font-medium">New (Last 30d)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <UserCheck size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-[#241621] font-display">{stats.new30d}</p>
          <p className="text-xs text-emerald-600 font-display font-bold mt-1">Recent signups</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#241621]/8 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#241621]/50 font-body font-medium">Customer Spend</span>
            <div className="w-8 h-8 rounded-xl bg-[#1b4e81]/10 text-[#1b4e81] flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-[#241621] font-display">{money(stats.totalRevenue)}</p>
          <p className="text-xs text-[#241621]/45 font-body mt-1">Lifetime revenue</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#241621]/8 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#241621]/35" size={16} />
            <input
              type="text"
              placeholder="Search by name, email, phone, or ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#241621]/12 bg-[#fafafa] text-sm text-[#241621] font-body placeholder:text-[#241621]/35 focus:outline-none focus:border-[#7A063C] focus:bg-white transition-all"
            />
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#241621]/12 bg-white">
              <ArrowUpDown size={14} className="text-[#241621]/45" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs font-display font-bold text-[#241621] bg-transparent outline-none cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="spent">Highest Spend</option>
                <option value="orders">Most Orders</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#241621]/6">
          {[
            { id: 'all', label: `All Users (${users.length})` },
            { id: 'buyers', label: `Buyers (${stats.withOrdersCount})` },
            { id: 'reimagine', label: 'Reimagine Clients' },
            { id: 'new30d', label: `New 30d (${stats.new30d})` },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setFilter(item.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-display font-bold transition-all ${
                filter === item.id
                  ? 'bg-[#241621] text-white shadow-xs'
                  : 'bg-[#fafafa] text-[#241621]/60 hover:bg-[#241621]/5 hover:text-[#241621]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-[#241621]/8 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#fafafa] border-b border-[#241621]/8 text-[10px] font-mono-tj uppercase tracking-wider text-[#241621]/45">
              <tr>
                <th className="py-3.5 px-5">User</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">Joined</th>
                <th className="py-3.5 px-4 text-center">Orders</th>
                <th className="py-3.5 px-4 text-center">Reimagine</th>
                <th className="py-3.5 px-4 text-right">Lifetime Spend</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#241621]/6">
              {paginatedUsers.map((u) => {
                const initials = (u.name || u.email || 'U').slice(0, 2).toUpperCase();
                return (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className="hover:bg-[#fcfbf7] transition-colors cursor-pointer group"
                  >
                    {/* User info */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#7A063C]/10 text-[#7A063C] flex items-center justify-center font-display font-black text-sm shrink-0 border border-[#7A063C]/15">
                          {u.avatar ? (
                            <img src={u.avatar} alt="" className="w-full h-full rounded-2xl object-cover" />
                          ) : (
                            initials
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-display font-bold text-[#241621] truncate group-hover:text-[#7A063C] transition-colors">
                              {u.name || 'Anonymous User'}
                            </p>
                            {u.role === 'admin' && (
                              <Badge variant="purple">Admin</Badge>
                            )}
                          </div>
                          <p className="text-xs text-[#241621]/40 font-mono-tj truncate">
                            ID: {u.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-4 px-4">
                      <div className="space-y-0.5 min-w-[140px]">
                        <div className="flex items-center gap-1.5 text-xs text-[#241621] font-body truncate">
                          <Mail size={12} className="text-[#241621]/40 shrink-0" />
                          <span className="truncate">{u.email}</span>
                        </div>
                        {u.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-[#241621]/60 font-body">
                            <Phone size={12} className="text-[#241621]/40 shrink-0" />
                            <span>{u.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Joined Date */}
                    <td className="py-4 px-4 whitespace-nowrap text-xs text-[#241621]/60 font-body">
                      {formatShortDate(u.created_at)}
                    </td>

                    {/* Orders count */}
                    <td className="py-4 px-4 text-center">
                      {Number(u.order_count) > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono-tj font-bold bg-[#c8ff2e]/25 text-[#241621]">
                          <ShoppingBag size={11} /> {u.order_count}
                        </span>
                      ) : (
                        <span className="text-xs text-[#241621]/30 font-mono-tj">0</span>
                      )}
                    </td>

                    {/* Reimagine count */}
                    <td className="py-4 px-4 text-center">
                      {Number(u.reimagine_count) > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono-tj font-bold bg-[#7A063C]/10 text-[#7A063C]">
                          <Scissors size={11} /> {u.reimagine_count}
                        </span>
                      ) : (
                        <span className="text-xs text-[#241621]/30 font-mono-tj">0</span>
                      )}
                    </td>

                    {/* Lifetime Spend */}
                    <td className="py-4 px-4 text-right font-display font-black text-sm text-[#241621] whitespace-nowrap">
                      {money(u.total_spent)}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUserId(u.id);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-display font-bold text-[#7A063C] bg-[#7A063C]/8 hover:bg-[#7A063C] hover:text-white transition-all shadow-2xs"
                      >
                        Details <ExternalLink size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && !loading && (
          <div className="py-16 text-center space-y-2">
            <Users size={32} className="mx-auto text-[#241621]/20" />
            <p className="font-display font-bold text-[#241621]">No users found</p>
            <p className="text-xs text-[#241621]/45 font-body">Try changing your search term or filter.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          total={filteredUsers.length}
          onPageChange={setPage}
          loading={loading}
        />
      )}

      {/* User Details Modal */}
      <AnimatePresence>
        {selectedUserId && (
          <UserDetailModal
            userId={selectedUserId}
            onClose={() => setSelectedUserId(null)}
            onNavigateTab={onNavigateTab}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

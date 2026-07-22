import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  MapPin,
  Phone,
  Mail,
  User,
  CreditCard,
  Package,
  StickyNote,
  Copy,
  Check,
  Truck,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminOrders } from '../../hooks/useAdmin';
import StatusSelect from '../../components/ui/StatusSelect';
import { Badge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Input } from '../../components/ui/FormField';
import { TableSkeleton } from '../../components/ui/Skeleton';
import PaginationBar from '../../components/ui/PaginationBar';
import OrderItemLine from '../../components/orders/OrderItemLine';
import { ORDER_STATUSES, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '../../utils/constants';
import { downloadCsv, flattenOrderItems } from '../../utils/exportCsv';

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

function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3 min-w-0">
      <div className="w-8 h-8 shrink-0 rounded-lg border border-[#241621]/10 bg-[#fafafa] flex items-center justify-center">
        <Icon size={14} className="text-[#241621]/45" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-mono-tj uppercase tracking-[0.14em] text-[#241621]/40 mb-0.5">
          {label}
        </p>
        <div className="text-sm text-[#241621] font-body leading-relaxed break-words">{children}</div>
      </div>
    </div>
  );
}

function CopyButton({ value, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(String(value));
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error('Could not copy');
        }
      }}
      className="inline-flex items-center gap-1 text-[10px] font-mono-tj uppercase tracking-[0.12em] text-[#241621]/40 hover:text-[#241621]"
      title={label}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied' : label}
    </button>
  );
}

function ShippingLinkDialog({ open, order, onClose, onConfirm }) {
  const [url, setUrl] = useState(order?.tracking_url || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  if (typeof document === 'undefined') return null;

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = url.trim();
    setErr('');
    if (!trimmed) {
      setErr('Tracking URL is required');
      return;
    }
    try {
      // eslint-disable-next-line no-new
      new URL(trimmed);
    } catch {
      setErr('Enter a valid URL starting with https://');
      return;
    }
    setSaving(true);
    try {
      await onConfirm(trimmed);
      onClose();
    } catch (error) {
      setErr(error.response?.data?.message || error.message || 'Could not update status');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && order && (
        <motion.div
          key="ship-overlay"
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
          <motion.form
            onSubmit={submit}
            role="dialog"
            aria-modal="true"
            className="relative z-[1] w-full max-w-md rounded-2xl border border-[#241621]/10 bg-white p-6 shadow-xl"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
          >
            <h2 className="text-lg font-black text-[#241621] font-display flex items-center gap-2">
              <Truck size={18} /> Mark as shipped
            </h2>
            <p className="mt-2 text-sm text-[#241621]/65 font-body leading-relaxed">
              Add the courier tracking link for order #{String(order.id).slice(0, 8).toUpperCase()}. The customer
              will see it on their order page and receive an email.
            </p>
            <div className="mt-4">
              <Input
                label="Shipping / tracking URL"
                name="tracking_url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                required
              />
            </div>
            {err && <p className="mt-2 text-xs text-[#e34334] font-body">{err}</p>}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={saving}>
                Save &amp; ship
              </Button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function OrderCard({ order, updateStatus }) {
  const [open, setOpen] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const shortId = String(order.id || '').slice(0, 8).toUpperCase();
  const items = Array.isArray(order.items) ? order.items : [];
  const itemCount = items.reduce((n, i) => n + (i.qty || 1), 0);
  const paymentMethod = PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method || '—';
  const paymentStatus = order.payment_status
    ? PAYMENT_STATUS_LABELS[order.payment_status] || order.payment_status
    : null;

  const onStatusChange = async (next) => {
    if (next === 'shipped') {
      setShipOpen(true);
      return;
    }
    try {
      await updateStatus(order.id, next);
      toast.success(`Status → ${next.replace(/_/g, ' ')}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update status');
    }
  };

  return (
    <article className="bg-white rounded-2xl border border-[#241621]/10 overflow-hidden">
      <ShippingLinkDialog
        key={shipOpen ? `ship-${order.id}` : 'ship-closed'}
        open={shipOpen}
        order={order}
        onClose={() => setShipOpen(false)}
        onConfirm={async (tracking_url) => {
          await updateStatus(order.id, 'shipped', { tracking_url });
          toast.success('Marked shipped — tracking email sent');
        }}
      />

      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <p className="text-[11px] font-mono-tj uppercase tracking-[0.16em] text-[#241621]/40">
                #{shortId}
              </p>
              <Badge status={order.status} />
              <CopyButton value={order.id} label="ID" />
            </div>
            <p className="font-display font-bold text-lg text-[#241621] leading-tight">
              {order.user_name || 'Customer'}
            </p>
            <p className="text-xs text-[#241621]/50 font-body mt-1">
              {formatDate(order.created_at)}
              {order.user_phone ? ` · ${order.user_phone}` : ''}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <p className="font-display font-black text-xl text-[#0a0a0a] tabular-nums">
              ₹{Number(order.total || 0).toLocaleString('en-IN')}
            </p>
            <StatusSelect
              value={order.status}
              options={ORDER_STATUSES}
              onUpdate={onStatusChange}
            />
          </div>
        </div>

        {!open && (
          <p className="mt-3 text-xs text-[#241621]/50 font-body line-clamp-2">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
            {items.length
              ? ` — ${items.map((it) => `${it.name}${it.size ? ` (${it.size})` : ''} ×${it.qty}`).join(', ')}`
              : ''}
          </p>
        )}

        {order.tracking_url && (
          <a
            href={order.tracking_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-mono-tj uppercase tracking-[0.14em] text-[#a8e000] hover:text-[#241621]"
          >
            <Truck size={12} /> Track shipment <ExternalLink size={11} />
          </a>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-mono-tj uppercase tracking-[0.14em] text-[#241621]/55 hover:text-[#241621]"
        >
          <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          {open ? 'Hide details' : 'View full order'}
        </button>
      </div>

      {open && (
        <div className="border-t border-[#241621]/8">
          <div className="grid lg:grid-cols-2 gap-0 lg:divide-x divide-[#241621]/8">
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-[10px] font-mono-tj uppercase tracking-[0.16em] text-[#241621]/40 flex items-center gap-1.5">
                  <Package size={12} /> Items ({itemCount})
                </h3>
                <p className="text-xs font-display font-bold text-[#241621]">
                  Total ₹{Number(order.total || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="divide-y divide-[#241621]/6">
                {items.map((item, i) => (
                  <OrderItemLine
                    key={`${item.id || item.name}-${i}`}
                    item={item}
                    openInNewTab
                    className="py-2.5"
                  />
                ))}
                {items.length === 0 && (
                  <p className="text-sm text-[#241621]/40 font-body py-4">No line items.</p>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-4 bg-[#fafafa]/80">
              <h3 className="text-[10px] font-mono-tj uppercase tracking-[0.16em] text-[#241621]/40">
                Customer & delivery
              </h3>
              <div className="space-y-3.5">
                <DetailRow icon={User} label="Customer">
                  <span className="font-display font-semibold">{order.user_name || '—'}</span>
                </DetailRow>
                {order.user_phone && (
                  <DetailRow icon={Phone} label="Phone">
                    <a href={`tel:${order.user_phone}`} className="hover:underline">
                      {order.user_phone}
                    </a>
                  </DetailRow>
                )}
                {order.user_email && (
                  <DetailRow icon={Mail} label="Email">
                    <a href={`mailto:${order.user_email}`} className="break-all hover:underline">
                      {order.user_email}
                    </a>
                  </DetailRow>
                )}
                <DetailRow icon={MapPin} label="Delivery address">
                  <span className="whitespace-pre-wrap">{order.address || '—'}</span>
                </DetailRow>
                {order.tracking_url && (
                  <DetailRow icon={Truck} label="Tracking link">
                    <a
                      href={order.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all hover:underline text-[#241621]"
                    >
                      {order.tracking_url}
                    </a>
                  </DetailRow>
                )}
                <DetailRow icon={CreditCard} label="Payment">
                  <p className="font-medium">{paymentMethod}</p>
                  {paymentStatus && (
                    <p className="text-xs text-[#241621]/50 mt-0.5">{paymentStatus}</p>
                  )}
                  {order.razorpay_payment_id && (
                    <p className="text-[11px] font-mono-tj text-[#241621]/45 mt-1 break-all">
                      {order.razorpay_payment_id}
                      <span className="ml-2 inline-block align-middle">
                        <CopyButton value={order.razorpay_payment_id} label="Copy" />
                      </span>
                    </p>
                  )}
                </DetailRow>
                {order.notes && (
                  <DetailRow icon={StickyNote} label="Customer notes">
                    <span className="whitespace-pre-wrap text-[#241621]/80">{order.notes}</span>
                  </DetailRow>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export default function OrdersTab() {
  const { orders, loading, updateStatus, pagination, page, setPage } = useAdminOrders();
  if (loading && !orders.length) return <TableSkeleton rows={6} cols={5} />;

  const exportOrders = () => {
    downloadCsv(
      `tarajuvva-orders-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        'id', 'created_at', 'user_name', 'user_email', 'user_phone', 'address',
        'items', 'total', 'status', 'payment_method', 'payment_status', 'tracking_url', 'notes',
      ],
      orders.map((o) => [
        o.id,
        o.created_at,
        o.user_name,
        o.user_email,
        o.user_phone,
        o.address,
        flattenOrderItems(o.items),
        o.total,
        o.status,
        o.payment_method,
        o.payment_status,
        o.tracking_url,
        o.notes,
      ])
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-[#241621] font-display">
            Orders ({pagination.total || orders.length})
          </h1>
          <p className="text-sm text-[#241621]/50 font-body mt-1">
            Expanding an order shows items, address, payment, and tracking. Choosing <strong>Shipped</strong> asks for a tracking URL.
          </p>
        </div>
        <Button type="button" variant="outline-green" size="sm" onClick={exportOrders} disabled={!orders.length}>
          Download CSV
        </Button>
      </div>

      <div className={`space-y-3 ${loading ? 'opacity-60' : ''}`}>
        {orders.map((o) => (
          <OrderCard key={o.id} order={o} updateStatus={updateStatus} />
        ))}
        {orders.length === 0 && !loading && (
          <p className="text-center text-[#241621]/40 font-body py-12">No orders yet.</p>
        )}
      </div>

      <PaginationBar
        page={pagination.page || page}
        totalPages={pagination.totalPages || 1}
        total={pagination.total || 0}
        onPageChange={setPage}
        loading={loading}
      />
    </div>
  );
}

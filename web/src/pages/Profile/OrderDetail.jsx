import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, Phone, Mail, CreditCard, Package, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Skeleton';
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '../../utils/constants';
import api from '../../utils/api';
import OrderItemLine from '../../components/orders/OrderItemLine';

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3">
      <div className="w-9 h-9 shrink-0 border border-black/10 flex items-center justify-center bg-[#f9f9f9]">
        <Icon size={16} className="text-black/50" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 font-display mb-0.5">
          {label}
        </p>
        <div className="text-sm text-[#0a0a0a] font-body leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

export default function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { replace: true, state: { from: `/profile/orders/${orderId}` } });
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/users/me/orders/${orderId}`);
        if (!cancelled) setOrder(data.order);
      } catch (err) {
        if (!cancelled) {
          toast.error(err.response?.data?.message || 'Order not found');
          navigate('/profile/orders', { replace: true });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orderId, user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center pt-4">
        <Spinner size={32} />
      </div>
    );
  }

  if (!order) return null;

  const shortId = order.id.slice(0, 8).toUpperCase();
  const placed = new Date(order.created_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const paymentLabel = PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method;
  const paymentStatus = order.payment_status
    ? PAYMENT_STATUS_LABELS[order.payment_status] || order.payment_status
    : null;
  const itemCount = order.items.reduce((n, i) => n + (i.qty || 1), 0);

  return (
    <div className="min-h-screen bg-[#f9f9f9] pt-4 pb-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <Link
          to="/profile/orders"
          className="inline-flex items-center gap-2 text-sm text-black/55 hover:text-[#0a0a0a] font-display mb-6 transition-colors"
        >
          <ArrowLeft size={15} /> All orders
        </Link>

        <div className="border border-black bg-white overflow-hidden">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-black bg-[var(--tj-shop)]/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/50 font-display">
                  Order #{shortId}
                </p>
                <h1 className="text-3xl sm:text-4xl font-black text-[#0a0a0a] font-display mt-1 tracking-tight">
                  ₹{order.total.toLocaleString('en-IN')}
                </h1>
                <p className="text-xs text-black/55 font-body mt-2 flex items-center gap-1.5">
                  <Clock size={12} /> Placed {placed}
                </p>
              </div>
              <Badge status={order.status} />
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold font-display bg-white border border-black/15 px-3 py-1.5">
                <Package size={12} />
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold font-display bg-white border border-black/15 px-3 py-1.5">
                <CreditCard size={12} />
                {paymentLabel}
                {paymentStatus ? ` · ${paymentStatus}` : ''}
              </span>
            </div>
          </div>

          {/* Items */}
          <div className="p-5 sm:p-6 border-b border-black/10">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-black/45 font-display mb-4">
              Items ordered
            </h2>
            <div className="space-y-1 divide-y divide-black/5">
              {order.items.map((item, i) => (
                <OrderItemLine key={`${item.id}-${i}`} item={item} className="py-3" />
              ))}
            </div>
          </div>

          {/* Delivery & payment */}
          <div className="p-5 sm:p-6 space-y-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-black/45 font-display">
              Delivery & payment
            </h2>
            <div className="space-y-4">
              <InfoRow icon={User} label="Recipient">
                <span className="font-semibold font-display">{order.user_name}</span>
              </InfoRow>
              {order.user_phone && (
                <InfoRow icon={Phone} label="Phone">{order.user_phone}</InfoRow>
              )}
              {order.user_email && (
                <InfoRow icon={Mail} label="Email">
                  <span className="break-all">{order.user_email}</span>
                </InfoRow>
              )}
              <InfoRow icon={MapPin} label="Address">
                <span className="whitespace-pre-wrap">{order.address}</span>
              </InfoRow>
              {order.notes && (
                <InfoRow icon={Package} label="Order notes">
                  <span className="whitespace-pre-wrap text-black/70">{order.notes}</span>
                </InfoRow>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/shop"><Button variant="primary">Continue shopping</Button></Link>
          <Link to="/profile/orders"><Button variant="outline">All orders</Button></Link>
          <Link to="/"><Button variant="outline">Home</Button></Link>
        </div>
      </div>
    </div>
  );
}

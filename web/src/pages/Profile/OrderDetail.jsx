import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, Phone, Mail, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Skeleton';
import api from '../../utils/api';
import OrderItemLine from '../../components/orders/OrderItemLine';

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
      <div className="min-h-screen bg-white flex items-center justify-center pt-4">
        <Spinner size={32} />
      </div>
    );
  }

  if (!order) return null;

  const shortId = order.id.slice(0, 8).toUpperCase();
  const placed = new Date(order.created_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-white pt-4 pb-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <Link
          to="/profile/orders"
          className="inline-flex items-center gap-2 text-sm text-[#241621]/55 hover:text-[#a8c74a] font-display mb-8 transition-colors"
        >
          <ArrowLeft size={15} /> All orders
        </Link>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#241621]/8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-xs text-[#241621]/40 font-body mb-1">Order #{shortId}</p>
              <h1 className="text-2xl font-black text-[#a8c74a] font-display">
                ₹{order.total.toLocaleString('en-IN')}
              </h1>
              <p className="text-xs text-[#241621]/45 font-body mt-1 flex items-center gap-1">
                <Clock size={11} /> {placed}
              </p>
            </div>
            <Badge status={order.status} />
          </div>

          <div className="space-y-2 mb-8 pb-8 border-b border-[#241621]/8">
            <h2 className="text-sm font-bold text-[#241621] font-display uppercase tracking-wider mb-3">Items</h2>
            {order.items.map((item, i) => (
              <OrderItemLine key={`${item.id}-${i}`} item={item} />
            ))}
          </div>

          <div className="space-y-4 text-sm font-body">
            <h2 className="text-sm font-bold text-[#241621] font-display uppercase tracking-wider">Delivery</h2>
            <p className="font-semibold text-[#241621] font-display">{order.user_name}</p>
            {order.user_phone && (
              <p className="flex items-center gap-2 text-[#241621]/70">
                <Phone size={14} className="shrink-0" /> {order.user_phone}
              </p>
            )}
            {order.user_email && (
              <p className="flex items-center gap-2 text-[#241621]/70 break-all">
                <Mail size={14} className="shrink-0" /> {order.user_email}
              </p>
            )}
            <p className="flex items-start gap-2 text-[#241621]/70 whitespace-pre-wrap">
              <MapPin size={14} className="shrink-0 mt-0.5" /> {order.address}
            </p>
            <p className="flex items-center gap-2 text-[#241621]/70 capitalize">
              <CreditCard size={14} className="shrink-0" />
              {order.payment_method === 'cod' ? 'Cash on delivery' : order.payment_method}
            </p>
            {order.notes && (
              <div className="pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[#241621]/40 font-display mb-1">Notes</p>
                <p className="text-[#241621]/70 whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/shop"><Button variant="primary">Continue Shopping</Button></Link>
          <Link to="/profile/orders"><Button variant="outline-green">All orders</Button></Link>
        </div>
      </div>
    </div>
  );
}

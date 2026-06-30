import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { openRazorpayCheckout } from '../utils/razorpay';

export function useOrderSubmit({ items, total, user, onSuccess }) {
  const [form, setForm] = useState({
    user_name:  user?.name  || '',
    user_email: user?.email || '',
    user_phone: user?.phone || '',
    address:    user?.address || '',
    notes:      '',
  });
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const onChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const placeCodOrder = async (orderItems) => {
    const { data } = await api.post('/shop/orders', {
      ...form,
      items: orderItems,
      payment_method: 'cod',
    });
    setPlacedOrderId(data.order?.id || null);
    setSuccessMessage(
      data.message || 'Thank you for shopping with Tarajuvva. Your order is being processed and will be dispatched soon.'
    );
    setDone(true);
    onSuccess?.();
  };

  const placeRazorpayOrder = async (orderItems) => {
    const { data } = await api.post('/shop/orders', {
      ...form,
      items: orderItems,
      payment_method: 'razorpay',
    });

    const orderId = data.order?.id;
    const rzp = data.razorpay;
    if (!orderId || !rzp?.order_id || !rzp?.key_id) {
      const hint = data.order && !rzp
        ? 'Online payment is not available on the server yet. Redeploy the latest backend and set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in backend/.env.'
        : 'Could not start payment — missing payment details from server.';
      throw new Error(hint);
    }

    const payment = await openRazorpayCheckout({
      keyId: rzp.key_id,
      amount: rzp.amount,
      currency: rzp.currency,
      orderId: rzp.order_id,
      prefill: {
        name: form.user_name,
        email: form.user_email,
        contact: form.user_phone,
      },
      onDismiss: () => toast.error('Payment cancelled'),
    });

    const { data: verified } = await api.post(`/shop/orders/${orderId}/razorpay/verify`, {
      razorpay_order_id: payment.razorpay_order_id,
      razorpay_payment_id: payment.razorpay_payment_id,
      razorpay_signature: payment.razorpay_signature,
    });

    setPlacedOrderId(orderId);
    setSuccessMessage(
      verified.message || 'Payment successful. Your order is being processed and will be dispatched soon.'
    );
    setDone(true);
    onSuccess?.();
  };

  const onSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const orderItems = items.map(({ id, qty, size }) => ({ id, qty, ...(size ? { size } : {}) }));

      if (paymentMethod === 'cod') {
        await placeCodOrder(orderItems);
      } else {
        await placeRazorpayOrder(orderItems);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not place order';
      if (msg !== 'Payment cancelled') toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return {
    form,
    onChange,
    onSubmit,
    loading,
    done,
    placedOrderId,
    successMessage,
    paymentMethod,
    setPaymentMethod,
  };
}

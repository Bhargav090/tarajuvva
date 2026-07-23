import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { openRazorpayCheckout } from '../utils/razorpay';
import { formatAddressWithPincode } from '../utils/address';
import { getDeliveryFee, isValidDeliveryZone } from '../utils/delivery';
import { useDeliverySettings } from './useDeliverySettings';

export function useOrderSubmit({ items, total, user, onSuccess }) {
  const { settings: deliveryFees } = useDeliverySettings();
  const [form, setForm] = useState({
    user_name:  user?.name  || '',
    user_email: user?.email || '',
    user_phone: user?.phone || '',
    address_line: user?.address || '',
    pincode: '',
    delivery_zone: '',
    notes:      '',
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const deliveryFee = isValidDeliveryZone(form.delivery_zone)
    ? getDeliveryFee('shop', form.delivery_zone, deliveryFees)
    : 0;
  const grandTotal = Number(total || 0) + deliveryFee;

  const onChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const setDeliveryZone = (zone) => setForm((p) => ({ ...p, delivery_zone: zone }));

  const orderPayload = () => ({
    user_name: form.user_name,
    user_email: form.user_email,
    user_phone: form.user_phone,
    address: formatAddressWithPincode(form.address_line, form.pincode),
    delivery_zone: form.delivery_zone,
    notes: form.notes,
  });

  const placeRazorpayOrder = async (orderItems) => {
    const { data } = await api.post('/shop/orders', {
      ...orderPayload(),
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
    if (!formatAddressWithPincode(form.address_line, form.pincode).trim()) {
      toast.error('Delivery address is required');
      return;
    }
    if (!isValidDeliveryZone(form.delivery_zone)) {
      toast.error('Please select Hyderabad & around or Outside Hyderabad');
      return;
    }
    setLoading(true);
    try {
      const orderItems = items.map(({ id, qty, size }) => ({ id, qty, ...(size ? { size } : {}) }));
      await placeRazorpayOrder(orderItems);
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
    setDeliveryZone,
    onSubmit,
    loading,
    done,
    placedOrderId,
    successMessage,
    deliveryFee,
    deliveryFees,
    grandTotal,
  };
}

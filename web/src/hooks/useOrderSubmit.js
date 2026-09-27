import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { openRazorpayCheckout } from '../utils/razorpay';
import { formatAddressWithPincode } from '../utils/address';
import { getDeliveryFee, isValidDeliveryZone } from '../utils/delivery';
import { useDeliverySettings } from './useDeliverySettings';
import { trackAnalyticsEvent } from '../utils/analytics';

function isAddressComplete(form) {
  const line = String(form.address_line || '').trim();
  const pin = String(form.pincode || '').trim();
  return line.length >= 8 && /^\d{6}$/.test(pin) && isValidDeliveryZone(form.delivery_zone);
}

function buildOrderLines(items) {
  return items.map(({ id, qty, size, custom_measurements }) => {
    const line = { id, qty, ...(size ? { size } : {}) };
    if (String(size || '').toLowerCase() === 'custom' && custom_measurements) {
      line.custom_measurements = custom_measurements;
    }
    return line;
  });
}

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
  const addressTracked = useRef(false);

  const [couponCode, setCouponCode] = useState('');
  const [giftCardCode, setGiftCardCode] = useState('');
  const [promo, setPromo] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [availableGiftCards, setAvailableGiftCards] = useState([]);
  const previewSeq = useRef(0);

  const deliveryFee = isValidDeliveryZone(form.delivery_zone)
    ? getDeliveryFee('shop', form.delivery_zone, deliveryFees)
    : 0;
  const couponDiscount = couponCode ? Number(promo?.coupon_discount || 0) : 0;
  const giftCardDiscount = giftCardCode ? Number(promo?.gift_card_discount || 0) : 0;
  const grandTotal = Math.max(
    0,
    Math.round((Number(total || 0) + deliveryFee - couponDiscount - giftCardDiscount) * 100) / 100
  );

  const cartKey = JSON.stringify(items.map((i) => [i.id, i.qty, i.size || '']));

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api
      .get('/shop/gift-cards/mine')
      .then(({ data }) => {
        if (!cancelled) setAvailableGiftCards(data.gift_cards || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  const requestPreview = useCallback(
    async ({ coupon, gift }) => {
      const { data } = await api.post('/shop/promotions/preview', {
        items: buildOrderLines(items),
        delivery_zone: isValidDeliveryZone(form.delivery_zone) ? form.delivery_zone : undefined,
        coupon_code: coupon || undefined,
        gift_card_code: gift || undefined,
      });
      return { summary: data.summary || null, errors: data.errors || {} };
    },
    [items, form.delivery_zone]
  );

  // Cart or delivery changes can push the cart under a minimum or change the gift card cover — re-check.
  useEffect(() => {
    if (done || (!couponCode && !giftCardCode) || !items.length) return;
    const seq = ++previewSeq.current;
    requestPreview({ coupon: couponCode, gift: giftCardCode })
      .then(({ summary, errors }) => {
        if (seq !== previewSeq.current) return;
        if (errors.coupon) {
          setCouponCode('');
          toast.error(`Coupon removed: ${errors.coupon}`);
        }
        if (errors.gift_card) {
          setGiftCardCode('');
          toast.error(`Gift card removed: ${errors.gift_card}`);
        }
        setPromo(summary);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey, form.delivery_zone]);

  const applyPromo = async ({ coupon, gift }, field) => {
    setPromoLoading(true);
    const seq = ++previewSeq.current;
    try {
      const { summary, errors } = await requestPreview({ coupon, gift });
      if (seq !== previewSeq.current) return false;
      if (errors[field]) {
        toast.error(errors[field]);
        return false;
      }
      const otherField = field === 'coupon' ? 'gift_card' : 'coupon';
      if (errors[otherField]) {
        if (otherField === 'coupon') setCouponCode('');
        else setGiftCardCode('');
        toast.error(errors[otherField]);
      }
      setCouponCode(summary?.coupon?.code || '');
      setGiftCardCode(summary?.gift_card?.code || '');
      setPromo(summary);
      toast.success(field === 'coupon' ? 'Coupon applied' : 'Gift card redeemed');
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not apply. Please try again.');
      return false;
    } finally {
      setPromoLoading(false);
    }
  };

  const applyCoupon = (code) => {
    const next = String(code || '').trim().toUpperCase();
    if (!next) {
      toast.error('Enter a coupon code');
      return Promise.resolve(false);
    }
    return applyPromo({ coupon: next, gift: giftCardCode }, 'coupon');
  };

  const applyGiftCard = (code) => {
    const next = String(code || '').trim().toUpperCase();
    if (!next) {
      toast.error('Enter a gift card code');
      return Promise.resolve(false);
    }
    return applyPromo({ coupon: couponCode, gift: next }, 'gift_card');
  };

  const clearPromo = async (field) => {
    const coupon = field === 'coupon' ? '' : couponCode;
    const gift = field === 'gift_card' ? '' : giftCardCode;
    if (field === 'coupon') setCouponCode('');
    else setGiftCardCode('');
    const seq = ++previewSeq.current;
    if (!coupon && !gift) {
      setPromo(null);
      return;
    }
    try {
      const { summary } = await requestPreview({ coupon, gift });
      if (seq === previewSeq.current) setPromo(summary);
    } catch {
      /* totals fall back to the remaining discount until the next preview */
    }
  };

  // Funnel: cart → address filled → pay. Fire once when shipping details are complete.
  useEffect(() => {
    if (addressTracked.current || done) return;
    if (!isAddressComplete(form)) return;
    addressTracked.current = true;
    trackAnalyticsEvent('address_entered', {
      meta: {
        delivery_zone: form.delivery_zone,
        has_pincode: true,
      },
    });
  }, [form.address_line, form.pincode, form.delivery_zone, done]);

  const onChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const setDeliveryZone = (zone) => setForm((p) => ({ ...p, delivery_zone: zone }));

  const orderPayload = () => ({
    user_name: form.user_name,
    user_email: form.user_email,
    user_phone: form.user_phone,
    address: formatAddressWithPincode(form.address_line, form.pincode),
    delivery_zone: form.delivery_zone,
    notes: form.notes,
    coupon_code: couponCode || undefined,
    gift_card_code: giftCardCode || undefined,
  });

  const finishOrder = (orderId, message) => {
    trackAnalyticsEvent('purchase', {
      orderId,
      meta: { total: grandTotal },
    });
    setPlacedOrderId(orderId);
    setSuccessMessage(message);
    setDone(true);
    onSuccess?.();
  };

  const placeRazorpayOrder = async (orderItems) => {
    trackAnalyticsEvent('begin_checkout', {
      meta: { item_count: orderItems.length, total: grandTotal },
    });

    const { data } = await api.post('/shop/orders', {
      ...orderPayload(),
      items: orderItems,
      payment_method: 'razorpay',
    });

    const orderId = data.order?.id;
    if (data.paid && orderId) {
      finishOrder(orderId, data.message || 'Order placed. Your coupon / gift card covered the full amount.');
      return;
    }

    const rzp = data.razorpay;
    if (!orderId || !rzp?.order_id || !rzp?.key_id) {
      const hint = data.order && !rzp
        ? 'Online payment is not available on the server yet. Redeploy the latest backend and set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in backend/.env.'
        : 'Could not start payment - missing payment details from server.';
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

    finishOrder(
      orderId,
      verified.message || 'Payment successful. Your order is being processed and will be dispatched soon.'
    );
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
      await placeRazorpayOrder(buildOrderLines(items));
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
    couponCode,
    giftCardCode,
    couponDiscount,
    giftCardDiscount,
    promo,
    promoLoading,
    availableGiftCards,
    applyCoupon,
    applyGiftCard,
    removeCoupon: () => clearPromo('coupon'),
    removeGiftCard: () => clearPromo('gift_card'),
  };
}

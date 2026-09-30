import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatAddressWithPincode } from '../utils/address';
import { openRazorpayCheckout } from '../utils/razorpay';
import { getDeliveryFee, isValidDeliveryZone } from '../utils/delivery';
import { useDeliverySettings } from './useDeliverySettings';
import {
  loadCustomizeDraft,
  saveCustomizeDraft,
  clearCustomizeDraft,
  loadRemakeDraft,
  saveRemakeDraft,
  clearRemakeDraft,
} from '../utils/reimagineDraft';

const VALID_STEPS = [0, 1, 3, 4];

function parseStep(raw) {
  const n = Number(raw);
  return VALID_STEPS.includes(n) ? n : 0;
}

function emptyDetails() {
  return {
    user_name: '',
    user_phone: '',
    user_email: '',
    address: '',
    pincode: '',
    delivery_zone: '',
    notes: '',
    garment_size: '',
    transformation_size: '',
    height_ft: '',
    height_in: '',
    pickup_date: '',
    pickup_period: '',
    consultation_date: '',
    consultation_slot_id: '',
    consultation_time: '',
    consultation_slot_label: '',
    request_callback: false,
  };
}

function mergeDraftDetails(draftDetails) {
  if (!draftDetails || typeof draftDetails !== 'object') return emptyDetails();
  return { ...emptyDetails(), ...draftDetails };
}

function clampCardStep(raw, maxInclusive) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), maxInclusive);
}

export function needsReimaginePayment(isCustomize, details, price, deliveryFees, discountTotal = 0) {
  if (details.request_callback) return false;
  const delivery =
    !isCustomize && isValidDeliveryZone(details.delivery_zone)
      ? getDeliveryFee('reimagine', details.delivery_zone, deliveryFees)
      : 0;
  return Number(price) + delivery - Number(discountTotal || 0) > 0;
}

export function useReimagineSubmit({ sessionPrice = 0, remakePrice = 0 } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { settings: deliveryFees } = useDeliverySettings();

  const authReturnTo = location.pathname + location.search;

  const isCustomize = searchParams.get('mode') === 'customize';
  const phase = searchParams.get('phase') || '';
  const step = isCustomize ? (phase === 'payment' ? 4 : 3) : parseStep(searchParams.get('step'));
  const garment = searchParams.get('garment') || '';
  const transformation = searchParams.get('transformation') || '';
  const conversionId = searchParams.get('conversion') || '';

  const [files, setFiles] = useState([]);
  const [details, setDetails] = useState(() => {
    if (typeof window === 'undefined') return emptyDetails();
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'customize') {
      return mergeDraftDetails(loadCustomizeDraft()?.details);
    }
    if (params.get('step') === '3') {
      const draft = loadRemakeDraft();
      if (draft?.conversionId && draft.conversionId === params.get('conversion')) {
        return mergeDraftDetails(draft.details);
      }
    }
    return emptyDetails();
  });
  const [customizeCardStep, setCustomizeCardStep] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') !== 'customize') return 0;
    return clampCardStep(loadCustomizeDraft()?.cardStep, 6);
  });
  const [remakeCardStep, setRemakeCardStep] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const params = new URLSearchParams(window.location.search);
    if (params.get('step') !== '3') return 0;
    const draft = loadRemakeDraft();
    if (draft?.conversionId && draft.conversionId === params.get('conversion')) {
      return clampCardStep(draft.cardStep, 4);
    }
    return 0;
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [doneCallback, setDoneCallback] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [giftCardCode, setGiftCardCode] = useState('');
  const [promo, setPromo] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [availableGiftCards, setAvailableGiftCards] = useState([]);
  const previewSeq = useRef(0);

  const redirectToLogin = useCallback(
    (from = authReturnTo) => {
      if (isCustomize) {
        saveCustomizeDraft({ details, cardStep: customizeCardStep });
      } else if (step === 3) {
        saveRemakeDraft({ details, cardStep: remakeCardStep, conversionId });
      }
      navigate('/login', { replace: true, state: { from } });
    },
    [
      navigate,
      authReturnTo,
      isCustomize,
      details,
      customizeCardStep,
      step,
      remakeCardStep,
      conversionId,
    ],
  );

  const basePrice = isCustomize ? sessionPrice : remakePrice;
  const deliveryFee =
    !isCustomize && isValidDeliveryZone(details.delivery_zone)
      ? getDeliveryFee('reimagine', details.delivery_zone, deliveryFees)
      : 0;
  const couponDiscount = couponCode ? Number(promo?.coupon_discount || 0) : 0;
  const giftCardDiscount = giftCardCode ? Number(promo?.gift_card_discount || 0) : 0;
  const discountTotal = couponDiscount + giftCardDiscount;
  const payPrice = Math.max(
    0,
    Math.round((Number(basePrice || 0) + deliveryFee - discountTotal) * 100) / 100
  );
  const showPromotions = !details.request_callback && Number(basePrice || 0) + deliveryFee > 0;

  const requestPreview = useCallback(
    async ({ coupon, gift }) => {
      const { data } = await api.post('/reimagine/promotions/preview', {
        conversion_id: !isCustomize ? conversionId || undefined : undefined,
        is_consultation: isCustomize && !details.request_callback ? '1' : undefined,
        request_callback: details.request_callback ? '1' : undefined,
        delivery_zone:
          !isCustomize && isValidDeliveryZone(details.delivery_zone)
            ? details.delivery_zone
            : undefined,
        coupon_code: coupon || undefined,
        gift_card_code: gift || undefined,
      });
      return { summary: data.summary || null, errors: data.errors || {} };
    },
    [isCustomize, conversionId, details.request_callback, details.delivery_zone]
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api
      .get('/reimagine/gift-cards/mine')
      .then(({ data }) => {
        if (!cancelled) setAvailableGiftCards(data.gift_cards || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Delivery / price changes can invalidate a min-cart coupon — re-check applied codes.
  useEffect(() => {
    if (done || (!couponCode && !giftCardCode) || !showPromotions) return;
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
  }, [basePrice, deliveryFee, details.delivery_zone, conversionId, isCustomize]);

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
      /* totals fall back until the next preview */
    }
  };

  const clearPromoState = () => {
    setCouponCode('');
    setGiftCardCode('');
    setPromo(null);
    setAvailableGiftCards([]);
  };

  // Keep draft fresh while filling the customize wizard (survives login remount)
  useEffect(() => {
    if (!isCustomize || done) return;
    saveCustomizeDraft({ details, cardStep: customizeCardStep });
  }, [isCustomize, details, customizeCardStep, done]);

  useEffect(() => {
    if (isCustomize || done || step !== 3 || !conversionId) return;
    saveRemakeDraft({ details, cardStep: remakeCardStep, conversionId });
  }, [isCustomize, done, step, details, remakeCardStep, conversionId]);

  // Always wipe drafts once the flow completes (covers success + any missed clear paths)
  useEffect(() => {
    if (!done) return;
    clearCustomizeDraft();
    clearRemakeDraft();
  }, [done]);

  const goToStep = useCallback(
    (newStep, extra = {}, { replace = false } = {}) => {
      const params = new URLSearchParams(searchParams);
      params.delete('mode');
      params.delete('phase');
      params.set('step', String(newStep));

      if ('garment' in extra) {
        if (extra.garment) params.set('garment', extra.garment);
        else params.delete('garment');
      }
      if ('transformation' in extra) {
        if (extra.transformation) params.set('transformation', extra.transformation);
        else params.delete('transformation');
      }
      if ('conversion' in extra) {
        if (extra.conversion) params.set('conversion', extra.conversion);
        else params.delete('conversion');
      }

      setSearchParams(params, { replace });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    if (prefilled || !user) return;
    const addr = user.address || '';
    const pinMatch = addr.match(/\bPIN:\s*(\d{6})\b/i);
    const lineOnly = pinMatch ? addr.replace(/\n?PIN:\s*\d{6}\s*/i, '').trim() : addr;
    setDetails((p) => ({
      ...p,
      user_name: p.user_name || user.name || '',
      user_email: p.user_email || user.email || '',
      user_phone: p.user_phone || user.phone || '',
      address: p.address || lineOnly,
      pincode: p.pincode || (pinMatch ? pinMatch[1] : ''),
    }));
    setPrefilled(true);
  }, [user, prefilled]);

  useEffect(() => {
    if (done || isCustomize) return;
    // Remake no longer uses an intermediate payment step - open Razorpay from details
    if (step === 4) {
      goToStep(3, {}, { replace: true });
      return;
    }
    if (step === 1 && !garment) {
      setSearchParams({}, { replace: true });
    } else if (step === 3 && (!garment || !transformation || !conversionId)) {
      const params = new URLSearchParams();
      if (garment) {
        params.set('step', '1');
        params.set('garment', garment);
      }
      setSearchParams(params, { replace: true });
    }
  }, [step, garment, transformation, conversionId, done, isCustomize, setSearchParams, goToStep]);

  // Customize: drop legacy ?phase=payment - payment opens from the form directly
  useEffect(() => {
    if (!isCustomize || phase !== 'payment' || done) return;
    setSearchParams({ mode: 'customize' }, { replace: true });
  }, [isCustomize, phase, done, setSearchParams]);

  const goToPaymentPhase = useCallback(() => {
    if (isCustomize) {
      setSearchParams({ mode: 'customize', phase: 'payment' }, { replace: false });
      return;
    }
    goToStep(4, {}, { replace: false });
  }, [isCustomize, setSearchParams, goToStep]);

  const startCustomize = useCallback(() => {
    setSearchParams({ mode: 'customize' }, { replace: false });
  }, [setSearchParams]);

  const exitCustomize = useCallback(() => {
    clearCustomizeDraft();
    setCustomizeCardStep(0);
    setDetails(emptyDetails());
    setFiles([]);
    setPrefilled(false);
    clearPromoState();
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const goBack = useCallback(() => {
    if (isCustomize) {
      exitCustomize();
      return;
    }
    // From form or transform options → presets page (never homepage)
    if (step === 4 || step === 3 || step === 1) {
      clearRemakeDraft();
      setRemakeCardStep(0);
      setDetails(emptyDetails());
      setFiles([]);
      setPrefilled(false);
      clearPromoState();
      goToStep(0, { garment: '', transformation: '', conversion: '' }, { replace: true });
      return;
    }
    setSearchParams({}, { replace: true });
  }, [isCustomize, exitCustomize, setSearchParams, step, goToStep]);

  const setGarment = useCallback(
    (id) => goToStep(1, { garment: id, transformation: '', conversion: '' }),
    [goToStep],
  );

  const setTransformation = useCallback(
    (t, conversion = null) => {
      const convId = conversion?.id || '';
      const params = new URLSearchParams(searchParams);
      params.delete('mode');
      params.set('step', '3');
      if (garment) params.set('garment', garment);
      params.set('transformation', t);
      if (convId) params.set('conversion', convId);
      else params.delete('conversion');
      if (!user) {
        redirectToLogin(`/reimagine?${params.toString()}`);
        return;
      }
      goToStep(3, { transformation: t, conversion: convId });
    },
    [goToStep, user, redirectToLogin, garment, searchParams],
  );

  const addFiles = (newFiles) => setFiles((p) => [...p, ...newFiles]);
  const removeFile = (idx) => setFiles((p) => p.filter((_, i) => i !== idx));

  const buildSubmitFields = useCallback((fields) => {
    const { pincode, address, ...rest } = fields;
    return {
      ...rest,
      address: formatAddressWithPincode(address, pincode),
    };
  }, []);

  const buildPayloadFields = useCallback(() => {
    if (isCustomize) {
      const callback = details.request_callback;
      const { request_callback: _rc, ...detailFields } = details;
      return {
        garment_type: 'customize',
        transformation: callback
          ? 'Customize Consultation - Callback requested'
          : 'Customize Consultation',
        is_consultation: callback ? '0' : '1',
        is_custom: '1',
        request_callback: callback ? '1' : '0',
        consultation_slot_id: callback ? '' : details.consultation_slot_id,
        ...detailFields,
      };
    }
    return {
      garment_type: garment,
      transformation,
      conversion_id: conversionId,
      is_custom: transformation === 'Custom' ? '1' : '0',
      ...details,
    };
  }, [isCustomize, details, garment, transformation, conversionId]);

  const postRequest = async (extraFields = {}) => {
    const fd = new FormData();
    const fields = buildSubmitFields({
      ...buildPayloadFields(),
      ...extraFields,
      ...(couponCode ? { coupon_code: couponCode } : {}),
      ...(giftCardCode ? { gift_card_code: giftCardCode } : {}),
    });
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v ?? ''));
    files.forEach((f) => fd.append('images', f));
    const { data } = await api.post('/reimagine/requests', fd);
    return data;
  };

  const completeRazorpayPayment = async (createData) => {
    const payment = await openRazorpayCheckout({
      keyId: createData.razorpay.key_id,
      amount: createData.razorpay.amount,
      currency: createData.razorpay.currency,
      orderId: createData.razorpay.order_id,
      prefill: {
        name: details.user_name,
        email: details.user_email,
        contact: details.user_phone,
      },
      onDismiss: () => toast.error('Payment cancelled'),
    });

    const { data: verified } = await api.post(
      `/reimagine/requests/${createData.requestId}/razorpay/verify`,
      {
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: payment.razorpay_payment_id,
        razorpay_signature: payment.razorpay_signature,
      }
    );

    clearCustomizeDraft();
    clearRemakeDraft();
    clearPromoState();
    setDone(true);
    setDoneCallback(false);
    toast.success(verified.message || 'Payment confirmed');
  };

  const handleSubmitError = (err) => {
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      redirectToLogin();
      toast.error(err.response?.data?.message || 'Please sign in to submit your order.');
      return;
    }
    const msg = err.response?.data?.message || err.message || 'Could not submit your order. Please try again.';
    if (msg !== 'Payment cancelled') toast.error(msg);
  };

  const resetDone = useCallback(() => {
    setDone(false);
    setDoneCallback(false);
    setFiles([]);
    setDetails(emptyDetails());
    setCustomizeCardStep(0);
    setRemakeCardStep(0);
    setPrefilled(false);
    clearPromoState();
    clearCustomizeDraft();
    clearRemakeDraft();
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const validateContactDetails = () => {
    if (!details.user_name?.trim()) {
      toast.error('Full name is required');
      return false;
    }
    if (!details.user_phone?.trim()) {
      toast.error('Phone is required');
      return false;
    }
    if (!details.address?.trim()) {
      toast.error('Address is required');
      return false;
    }
    if (!/^\d{6}$/.test(String(details.pincode || '').trim())) {
      toast.error('Enter a valid 6-digit pincode');
      return false;
    }
    if (!String(details.notes || '').trim()) {
      toast.error('Please add notes / description before continuing');
      return false;
    }
    if (!isCustomize) {
      if (!files.length) {
        toast.error('Please upload at least one garment photo');
        return false;
      }
      if (!String(details.garment_size || '').trim() || !String(details.transformation_size || '').trim()) {
        toast.error('Please select current and desired garment sizes');
        return false;
      }
      const ft = Number(details.height_ft);
      const inch = Number(details.height_in);
      if (!Number.isFinite(ft) || ft < 4 || ft > 7 || !Number.isFinite(inch) || inch < 0 || inch > 11) {
        toast.error('Please enter your height in feet and inches');
        return false;
      }
      if (!String(details.pickup_date || '').trim()) {
        toast.error('Please select a preferred pickup date');
        return false;
      }
      if (!['morning', 'afternoon', 'evening'].includes(String(details.pickup_period || '').trim())) {
        toast.error('Please choose morning, afternoon, or evening for pickup');
        return false;
      }
    }
    return true;
  };

  const finishPromoCovered = (data) => {
    clearCustomizeDraft();
    clearRemakeDraft();
    clearPromoState();
    setDone(true);
    setDoneCallback(false);
    toast.success(data.message || 'Request placed. Your coupon / gift card covered the full amount.');
  };

  const submitRequest = async (extraFields = {}) => {
    if (!user) {
      redirectToLogin();
      toast.error('Please sign in to submit your order.');
      return;
    }
    setLoading(true);
    try {
      const data = await postRequest(extraFields);
      if (data.paid) {
        finishPromoCovered(data);
        return;
      }
      if (data.requires_payment && data.razorpay) {
        await completeRazorpayPayment(data);
        return;
      }
      clearCustomizeDraft();
      clearRemakeDraft();
      clearPromoState();
      setDone(true);
      setDoneCallback(Boolean(extraFields.request_callback === '1' || details.request_callback));
    } catch (err) {
      handleSubmitError(err);
    } finally {
      setLoading(false);
    }
  };

  const shouldCharge =
    needsReimaginePayment(isCustomize, details, basePrice, deliveryFees, discountTotal) ||
    Boolean(couponCode || giftCardCode);

  const onWizardComplete = (e) => {
    e?.preventDefault();
    if (!validateContactDetails()) return;

    if (isCustomize && !details.request_callback && !details.consultation_slot_id) {
      toast.error('Please select a consultation slot or request a callback');
      return;
    }

    if (!isCustomize && !isValidDeliveryZone(details.delivery_zone)) {
      toast.error('Please select Hyderabad & around or Outside Hyderabad');
      return;
    }

    // Open Razorpay (or promo-covered place) immediately - no intermediate payment screen
    if (shouldCharge) {
      void onPayment();
      return;
    }
    void onSubmit(e);
  };

  const onSubmit = async (e) => {
    e?.preventDefault();
    if (!validateContactDetails()) return;
    await submitRequest({ payment_method: 'none' });
  };

  const onPayment = async () => {
    if (!user) {
      redirectToLogin();
      toast.error('Please sign in to complete payment.');
      return;
    }
    if (!validateContactDetails()) return;
    setLoading(true);
    try {
      const payFields = { payment_method: 'razorpay' };
      const data = await postRequest(payFields);
      if (data.paid) {
        finishPromoCovered(data);
        return;
      }
      if (data.requires_payment && data.razorpay) {
        await completeRazorpayPayment(data);
      } else {
        clearCustomizeDraft();
        clearRemakeDraft();
        clearPromoState();
        setDone(true);
      }
    } catch (err) {
      handleSubmitError(err);
    } finally {
      setLoading(false);
    }
  };

  const onPresetContinue = (e) => {
    e?.preventDefault();
    if (!validateContactDetails()) return;
    if (!isValidDeliveryZone(details.delivery_zone)) {
      toast.error('Please select Hyderabad & around or Outside Hyderabad');
      return;
    }
    // Open Razorpay immediately - no intermediate payment screen
    if (
      needsReimaginePayment(false, details, basePrice, deliveryFees, discountTotal) ||
      couponCode ||
      giftCardCode
    ) {
      void onPayment();
      return;
    }
    void onSubmit(e);
  };

  return {
    step,
    phase,
    isCustomize,
    goToStep,
    goToPaymentPhase,
    startCustomize,
    exitCustomize,
    goBack,
    garment,
    setGarment,
    transformation,
    setTransformation,
    conversionId,
    files,
    addFiles,
    removeFile,
    details,
    setDetails,
    customizeCardStep,
    setCustomizeCardStep,
    remakeCardStep,
    setRemakeCardStep,
    onSubmit,
    onWizardComplete,
    onPayment,
    onPresetContinue,
    loading,
    done,
    doneCallback,
    resetDone,
    needsPayment: shouldCharge && payPrice > 0,
    payPrice,
    basePrice,
    deliveryFee,
    deliveryFees,
    couponCode,
    giftCardCode,
    couponDiscount,
    giftCardDiscount,
    promo,
    promoLoading,
    availableGiftCards,
    showPromotions,
    applyCoupon,
    applyGiftCard,
    removeCoupon: () => clearPromo('coupon'),
    removeGiftCard: () => clearPromo('gift_card'),
  };
}

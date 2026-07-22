import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatAddressWithPincode } from '../utils/address';
import { openRazorpayCheckout } from '../utils/razorpay';

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

export function needsReimaginePayment(isCustomize, details, price) {
  if (details.request_callback) return false;
  return Number(price) > 0;
}

export function useReimagineSubmit({ sessionPrice = 0, remakePrice = 0 } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const authReturnTo = location.pathname + location.search;

  const redirectToLogin = useCallback(
    (from = authReturnTo) => {
      navigate('/login', { replace: true, state: { from } });
    },
    [navigate, authReturnTo],
  );

  const isCustomize = searchParams.get('mode') === 'customize';
  const phase = searchParams.get('phase') || '';
  const step = isCustomize ? (phase === 'payment' ? 4 : 3) : parseStep(searchParams.get('step'));
  const garment = searchParams.get('garment') || '';
  const transformation = searchParams.get('transformation') || '';
  const conversionId = searchParams.get('conversion') || '';

  const [files, setFiles] = useState([]);
  const [details, setDetails] = useState(emptyDetails);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [doneCallback, setDoneCallback] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  const payPrice = isCustomize ? sessionPrice : remakePrice;

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
    // Remake no longer uses an intermediate payment step — open Razorpay from details
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

  // Customize: drop legacy ?phase=payment — payment opens from the form directly
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
    if (!user) {
      redirectToLogin('/reimagine?mode=customize');
      return;
    }
    setSearchParams({ mode: 'customize' }, { replace: false });
  }, [setSearchParams, user, redirectToLogin]);

  const exitCustomize = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const goBack = useCallback(() => {
    if (isCustomize) {
      exitCustomize();
      return;
    }
    // Explicit steps — never navigate(-1); history after payment ↔ details is unreliable
    if (step === 4 || step === 3) {
      goToStep(1, { transformation: '', conversion: '' }, { replace: true });
      return;
    }
    if (step === 1) {
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
          ? 'Customize Consultation — Callback requested'
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
    const fields = buildSubmitFields({ ...buildPayloadFields(), ...extraFields });
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
    setPrefilled(false);
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

  const submitRequest = async (extraFields = {}) => {
    if (!user) {
      redirectToLogin();
      toast.error('Please sign in to submit your order.');
      return;
    }
    setLoading(true);
    try {
      const data = await postRequest(extraFields);
      if (data.requires_payment && data.razorpay) {
        await completeRazorpayPayment(data);
        return;
      }
      setDone(true);
      setDoneCallback(Boolean(extraFields.request_callback === '1' || details.request_callback));
    } catch (err) {
      handleSubmitError(err);
    } finally {
      setLoading(false);
    }
  };

  const onWizardComplete = (e) => {
    e?.preventDefault();
    if (!validateContactDetails()) return;

    if (isCustomize && !details.request_callback && !details.consultation_slot_id) {
      toast.error('Please select a consultation slot or request a callback');
      return;
    }

    // Open Razorpay immediately — no intermediate payment screen
    if (needsReimaginePayment(isCustomize, details, payPrice)) {
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
    if (!validateContactDetails()) return;
    setLoading(true);
    try {
      const payFields = { payment_method: 'razorpay' };
      const data = await postRequest(payFields);
      if (data.requires_payment && data.razorpay) {
        await completeRazorpayPayment(data);
      } else {
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
    // Open Razorpay immediately — no intermediate payment screen
    if (needsReimaginePayment(false, details, payPrice)) {
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
    onSubmit,
    onWizardComplete,
    onPayment,
    onPresetContinue,
    loading,
    done,
    doneCallback,
    resetDone,
    needsPayment: needsReimaginePayment(isCustomize, details, payPrice),
    payPrice,
  };
}

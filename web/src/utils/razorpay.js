/** Load Razorpay checkout.js once. */
export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Open Razorpay checkout. Resolves with payment response on success; rejects on dismiss/failure.
 */
export async function openRazorpayCheckout({
  keyId,
  amount,
  currency = 'INR',
  orderId,
  name = 'Tarajuvva',
  description = 'Order payment',
  prefill = {},
  onDismiss,
}) {
  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) {
    throw new Error('Could not load payment gateway');
  }

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: keyId,
      amount,
      currency,
      name,
      description,
      order_id: orderId,
      prefill: {
        name: prefill.name || '',
        email: prefill.email || '',
        contact: prefill.contact || '',
      },
      theme: { color: '#c8ff2e' },
      handler(response) {
        resolve(response);
      },
      modal: {
        ondismiss() {
          onDismiss?.();
          reject(new Error('Payment cancelled'));
        },
      },
    });
    rzp.on('payment.failed', (err) => {
      reject(new Error(err.error?.description || 'Payment failed'));
    });
    rzp.open();
  });
}

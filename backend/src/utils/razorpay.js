const Razorpay = require('razorpay');
const crypto = require('crypto');

function getRazorpayConfig() {
  const key_id = process.env.RAZORPAY_KEY_ID?.trim();
  const key_secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!key_id || !key_secret) return null;
  return { key_id, key_secret };
}

function getRazorpayClient() {
  const cfg = getRazorpayConfig();
  if (!cfg) return null;
  return new Razorpay({ key_id: cfg.key_id, key_secret: cfg.key_secret });
}

function verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const cfg = getRazorpayConfig();
  if (!cfg) return false;
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto.createHmac('sha256', cfg.key_secret).update(body).digest('hex');
  return expected === razorpay_signature;
}

/** INR total → paise (Razorpay expects integer paise). */
function toPaise(amountInr) {
  return Math.round(Number(amountInr) * 100);
}

module.exports = {
  getRazorpayConfig,
  getRazorpayClient,
  verifyPaymentSignature,
  toPaise,
};

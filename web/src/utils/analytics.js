import api from './api';

const SESSION_KEY = 'tj_analytics_session';

export function getAnalyticsSessionId() {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `s_${Date.now()}`;
  }
}

/** Fire-and-forget storefront funnel event. */
export function trackAnalyticsEvent(eventName, { productId, orderId, meta } = {}) {
  const session_id = getAnalyticsSessionId();
  api
    .post('/analytics/events', {
      event_name: eventName,
      session_id,
      product_id: productId || undefined,
      order_id: orderId || undefined,
      meta: meta || undefined,
    })
    .catch(() => {});
}

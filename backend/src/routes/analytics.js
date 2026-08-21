const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { get, all, run } = require('../db/database');
const { authenticateAdmin, optionalAuth } = require('../middleware/auth');

const ALLOWED_EVENTS = new Set([
  'add_to_cart',
  'address_entered',
  'begin_checkout',
  'purchase',
]);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function toDayString(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function addDays(isoDay, n) {
  const d = new Date(`${isoDay}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function fillSeries(rawRows, startDay, endDay) {
  const byDay = new Map();
  for (const r of rawRows || []) {
    const day = toDayString(r.day);
    byDay.set(day, {
      day,
      orders: Number(r.orders) || 0,
      revenue: Number(r.revenue) || 0,
    });
  }
  const out = [];
  if (!startDay || !endDay || startDay > endDay) return out;
  for (let day = startDay; day <= endDay; day = addDays(day, 1)) {
    out.push(byDay.get(day) || { day, orders: 0, revenue: 0 });
  }
  return out;
}

/**
 * Query params:
 * - days=7|14|30|90
 * - range=lifetime
 * - start=YYYY-MM-DD&end=YYYY-MM-DD (custom)
 */
async function resolveRange(query) {
  const endToday = todayUtc();

  if (String(query.range || '').toLowerCase() === 'lifetime') {
    const minRow = await get(
      `SELECT DATE(MIN(created_at)) AS d FROM orders WHERE deleted_at IS NULL`
    );
    const eventMin = await get(`SELECT DATE(MIN(created_at)) AS d FROM analytics_events`);
    const candidates = [minRow?.d, eventMin?.d].filter(Boolean).map(toDayString);
    const start = candidates.length ? candidates.sort()[0] : endToday;
    return {
      mode: 'lifetime',
      startDay: start,
      endDay: endToday,
      createdClause: 'created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)',
      createdParams: [start, endToday],
      paidClause: 'COALESCE(paid_at, created_at) >= ? AND COALESCE(paid_at, created_at) < DATE_ADD(?, INTERVAL 1 DAY)',
      paidParams: [start, endToday],
    };
  }

  if (DATE_RE.test(String(query.start || '')) && DATE_RE.test(String(query.end || ''))) {
    let start = String(query.start);
    let end = String(query.end);
    if (start > end) [start, end] = [end, start];
    return {
      mode: 'custom',
      startDay: start,
      endDay: end,
      createdClause: 'created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)',
      createdParams: [start, end],
      paidClause: 'COALESCE(paid_at, created_at) >= ? AND COALESCE(paid_at, created_at) < DATE_ADD(?, INTERVAL 1 DAY)',
      paidParams: [start, end],
    };
  }

  const n = Number(query.days);
  const days = [7, 14, 30, 90].includes(n) ? n : 30;
  const start = addDays(endToday, -(days - 1));
  return {
    mode: 'days',
    days,
    startDay: start,
    endDay: endToday,
    createdClause: 'created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)',
    createdParams: [start, endToday],
    paidClause: 'COALESCE(paid_at, created_at) >= ? AND COALESCE(paid_at, created_at) < DATE_ADD(?, INTERVAL 1 DAY)',
    paidParams: [start, endToday],
  };
}

/** Public: record funnel events from the storefront. */
router.post('/events', optionalAuth, async (req, res) => {
  try {
    const { event_name: eventName, session_id: sessionId, product_id: productId, order_id: orderId, meta } = req.body || {};
    if (!ALLOWED_EVENTS.has(eventName)) {
      return res.status(400).json({ success: false, message: 'Invalid event' });
    }
    const sid = String(sessionId || '').trim().slice(0, 64);
    if (!sid) {
      return res.status(400).json({ success: false, message: 'session_id required' });
    }

    const id = uuidv4();
    const userId = req.user?.id || null;
    let metaJson = null;
    if (meta != null) {
      try {
        metaJson = JSON.stringify(meta).slice(0, 4000);
      } catch {
        metaJson = null;
      }
    }

    await run(
      `INSERT INTO analytics_events (id, event_name, session_id, user_id, product_id, order_id, meta_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        eventName,
        sid,
        userId,
        productId ? String(productId).slice(0, 36) : null,
        orderId ? String(orderId).slice(0, 36) : null,
        metaJson,
      ]
    );

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('analytics event error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to record event' });
  }
});

async function funnelMetrics(range) {
  const { createdClause, createdParams, paidClause, paidParams } = range;

  const addCart = Number(
    (await get(
      `SELECT COUNT(DISTINCT session_id) AS c FROM analytics_events
       WHERE event_name = 'add_to_cart' AND ${createdClause}`,
      createdParams
    ))?.c || 0
  );
  const addressEntered = Number(
    (await get(
      `SELECT COUNT(DISTINCT session_id) AS c FROM analytics_events
       WHERE event_name = 'address_entered' AND ${createdClause}`,
      createdParams
    ))?.c || 0
  );
  const beginCheckout = Number(
    (await get(
      `SELECT COUNT(DISTINCT session_id) AS c FROM analytics_events
       WHERE event_name = 'begin_checkout' AND ${createdClause}`,
      createdParams
    ))?.c || 0
  );
  const purchaseSessions = Number(
    (await get(
      `SELECT COUNT(DISTINCT session_id) AS c FROM analytics_events
       WHERE event_name = 'purchase' AND ${createdClause}`,
      createdParams
    ))?.c || 0
  );
  const paidOrders = Number(
    (await get(
      `SELECT COUNT(*) AS c FROM orders
       WHERE deleted_at IS NULL
         AND payment_status = 'paid'
         AND ${paidClause}`,
      paidParams
    ))?.c || 0
  );

  // Cart + address filled, but never opened Razorpay (stopped after address).
  const stoppedAfterAddress = Number(
    (await get(
      `SELECT COUNT(DISTINCT a.session_id) AS c
       FROM analytics_events a
       WHERE a.event_name = 'address_entered'
         AND a.created_at >= ? AND a.created_at < DATE_ADD(?, INTERVAL 1 DAY)
         AND EXISTS (
           SELECT 1 FROM analytics_events c
           WHERE c.session_id = a.session_id
             AND c.event_name = 'add_to_cart'
             AND c.created_at >= ? AND c.created_at < DATE_ADD(?, INTERVAL 1 DAY)
         )
         AND NOT EXISTS (
           SELECT 1 FROM analytics_events b
           WHERE b.session_id = a.session_id
             AND b.event_name IN ('begin_checkout', 'purchase')
             AND b.created_at >= ? AND b.created_at < DATE_ADD(?, INTERVAL 1 DAY)
         )`,
      [...createdParams, ...createdParams, ...createdParams]
    ))?.c || 0
  );

  const cartAbandonmentRate =
    addCart > 0 ? Math.round(((addCart - purchaseSessions) / addCart) * 1000) / 10 : null;
  const checkoutAbandonmentRate =
    beginCheckout > 0
      ? Math.round(((beginCheckout - purchaseSessions) / beginCheckout) * 1000) / 10
      : null;
  // Of people who reached address step: % who never went to Razorpay
  const stoppedAfterAddressRate =
    addressEntered > 0
      ? Math.round((stoppedAfterAddress / addressEntered) * 1000) / 10
      : null;

  return {
    add_to_cart_sessions: addCart,
    address_entered_sessions: addressEntered,
    stopped_after_address_sessions: stoppedAfterAddress,
    stopped_after_address_rate: stoppedAfterAddressRate,
    begin_checkout_sessions: beginCheckout,
    purchase_sessions: purchaseSessions,
    paid_orders: paidOrders,
    cart_abandonment_rate: cartAbandonmentRate,
    checkout_abandonment_rate: checkoutAbandonmentRate,
    formula: {
      cart_abandonment:
        '(sessions with add_to_cart − sessions with purchase) / sessions with add_to_cart',
      stopped_after_address:
        'sessions with add_to_cart + address_entered, and no Razorpay (begin_checkout/purchase)',
      checkout_abandonment:
        '(sessions with begin_checkout − sessions with purchase) / sessions with begin_checkout',
    },
  };
}

router.get('/dashboard', authenticateAdmin, async (req, res) => {
  try {
    const range = await resolveRange(req.query);
    const { createdClause, createdParams, startDay, endDay } = range;

    const [
      revenueRow,
      ordersRow,
      aovRow,
      pendingPayRow,
      cancelledRow,
      revenueSeriesRaw,
      ordersCreatedSeriesRaw,
      topProductsRaw,
      // Delivery zones — kept in query but unused in UI for now
      zoneRows,
      usersRow,
      googleUsersRow,
      emailOnlyRow,
      wishlistRow,
      waitlistRows,
      contactRow,
      reimagineRow,
      consultationRow,
      reimaginePaidRow,
      funnel,
      pendingPayValueRow,
    ] = await Promise.all([
      get(
        `SELECT COALESCE(SUM(total), 0) AS total FROM orders
         WHERE deleted_at IS NULL
           AND status NOT IN ('pending_payment', 'cancelled')
           AND ${createdClause}`,
        createdParams
      ),
      get(
        `SELECT COUNT(*) AS c FROM orders
         WHERE deleted_at IS NULL
           AND status NOT IN ('pending_payment', 'cancelled')
           AND ${createdClause}`,
        createdParams
      ),
      get(
        `SELECT COALESCE(AVG(total), 0) AS aov FROM orders
         WHERE deleted_at IS NULL
           AND status NOT IN ('pending_payment', 'cancelled')
           AND ${createdClause}`,
        createdParams
      ),
      get(
        `SELECT COUNT(*) AS c FROM orders
         WHERE deleted_at IS NULL
           AND status = 'pending_payment' AND ${createdClause}`,
        createdParams
      ),
      get(
        `SELECT COUNT(*) AS c FROM orders
         WHERE deleted_at IS NULL
           AND status = 'cancelled' AND ${createdClause}`,
        createdParams
      ),
      all(
        `SELECT DATE(created_at) AS day,
                COUNT(*) AS orders,
                COALESCE(SUM(CASE WHEN status NOT IN ('pending_payment', 'cancelled') THEN total ELSE 0 END), 0) AS revenue
         FROM orders
         WHERE deleted_at IS NULL AND ${createdClause}
         GROUP BY DATE(created_at)
         ORDER BY day ASC`,
        createdParams
      ),
      all(
        `SELECT DATE(created_at) AS day,
                COUNT(*) AS orders,
                COALESCE(SUM(total), 0) AS revenue
         FROM orders
         WHERE deleted_at IS NULL
           AND status != 'cancelled'
           AND ${createdClause}
         GROUP BY DATE(created_at)
         ORDER BY day ASC`,
        createdParams
      ),
      all(
        `SELECT items FROM orders
         WHERE deleted_at IS NULL
           AND status NOT IN ('pending_payment', 'cancelled')
           AND ${createdClause}`,
        createdParams
      ),
      all(
        `SELECT COALESCE(delivery_zone, 'unknown') AS zone,
                COUNT(*) AS orders,
                COALESCE(SUM(total), 0) AS revenue
         FROM orders
         WHERE deleted_at IS NULL
           AND status NOT IN ('pending_payment', 'cancelled')
           AND ${createdClause}
         GROUP BY COALESCE(delivery_zone, 'unknown')`,
        createdParams
      ),
      get(`SELECT COUNT(*) AS c FROM users WHERE ${createdClause}`, createdParams),
      get(
        `SELECT COUNT(*) AS c FROM users
         WHERE google_id IS NOT NULL AND google_id != '' AND ${createdClause}`,
        createdParams
      ),
      get(
        `SELECT COUNT(*) AS c FROM users
         WHERE (google_id IS NULL OR google_id = '')
           AND password_hash IS NOT NULL AND password_hash != ''
           AND ${createdClause}`,
        createdParams
      ),
      get(`SELECT COUNT(*) AS c FROM wishlists WHERE ${createdClause}`, createdParams),
      all(
        `SELECT type, COUNT(*) AS c FROM waitlist
         WHERE ${createdClause}
         GROUP BY type`,
        createdParams
      ),
      get(`SELECT COUNT(*) AS c FROM contact_inquiries WHERE ${createdClause}`, createdParams),
      get(
        `SELECT COUNT(*) AS c FROM reimagine_requests
         WHERE COALESCE(consultation_paid, 0) = 0
           AND COALESCE(callback_requested, 0) = 0
           AND ${createdClause}`,
        createdParams
      ),
      get(
        `SELECT COUNT(*) AS c FROM reimagine_requests
         WHERE (COALESCE(consultation_paid, 0) = 1 OR COALESCE(callback_requested, 0) = 1)
           AND ${createdClause}`,
        createdParams
      ),
      get(
        `SELECT COUNT(*) AS c,
                COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN COALESCE(consultation_fee, 0) ELSE 0 END), 0) AS fees
         FROM reimagine_requests
         WHERE ${createdClause}`,
        createdParams
      ),
      funnelMetrics(range),
      get(
        `SELECT COALESCE(SUM(total), 0) AS total FROM orders
         WHERE deleted_at IS NULL
           AND status = 'pending_payment'
           AND ${createdClause}`,
        createdParams
      ),
    ]);

    const productMap = new Map();
    for (const row of topProductsRaw) {
      let items = [];
      try {
        items = typeof row.items === 'string' ? JSON.parse(row.items) : row.items || [];
      } catch {
        items = [];
      }
      if (!Array.isArray(items)) continue;
      for (const it of items) {
        const key = it.id || it.name || 'unknown';
        const prev = productMap.get(key) || { id: it.id, name: it.name || key, qty: 0, revenue: 0 };
        const qty = Number(it.qty) || 1;
        prev.qty += qty;
        prev.revenue += (Number(it.price) || 0) * qty;
        productMap.set(key, prev);
      }
    }
    const top_products = [...productMap.values()]
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    const waitlist = { repair: 0, donate: 0 };
    for (const w of waitlistRows) {
      if (w.type === 'repair') waitlist.repair = Number(w.c);
      if (w.type === 'donate') waitlist.donate = Number(w.c);
    }

    const totalUsers = Number(
      (await get('SELECT COUNT(*) AS c FROM users'))?.c || 0
    );
    const googleLinked = Number(
      (await get(
        `SELECT COUNT(*) AS c FROM users WHERE google_id IS NOT NULL AND google_id != ''`
      ))?.c || 0
    );
    const repeatBuyers = Number(
      (await get(
        `SELECT COUNT(*) AS c FROM (
           SELECT user_id FROM orders
           WHERE deleted_at IS NULL
             AND user_id IS NOT NULL
             AND status NOT IN ('pending_payment', 'cancelled')
           GROUP BY user_id
           HAVING COUNT(*) >= 2
         ) t`
      ))?.c || 0
    );

    const series = fillSeries(revenueSeriesRaw, startDay, endDay);
    const ordersCreatedSeries = fillSeries(ordersCreatedSeriesRaw, startDay, endDay);
    void zoneRows; // delivery zones hidden in UI for now

    res.json({
      success: true,
      range: {
        mode: range.mode,
        days: range.days || null,
        start: startDay,
        end: endDay,
      },
      overview: {
        revenue: Number(revenueRow?.total || 0),
        orders: Number(ordersRow?.c || 0),
        aov: Math.round(Number(aovRow?.aov || 0)),
        pending_payment: Number(pendingPayRow?.c || 0),
        pending_payment_value: Number(pendingPayValueRow?.total || 0),
        cancelled: Number(cancelledRow?.c || 0),
        cart_abandonment_rate: funnel.cart_abandonment_rate,
      },
      sales: {
        series,
        orders_created_series: ordersCreatedSeries,
        top_products,
        // delivery_zones intentionally omitted from response UI use
      },
      funnel,
      customers: {
        new_signups: Number(usersRow?.c || 0),
        new_google: Number(googleUsersRow?.c || 0),
        new_email_only: Number(emailOnlyRow?.c || 0),
        total_users: totalUsers,
        google_linked: googleLinked,
        repeat_buyers: repeatBuyers,
      },
      reimagine: {
        remake_requests: Number(reimagineRow?.c || 0),
        consultations: Number(consultationRow?.c || 0),
        paid_consultation_fees: Number(reimaginePaidRow?.fees || 0),
      },
      engagement: {
        wishlist_adds: Number(wishlistRow?.c || 0),
        waitlist,
        contact_inquiries: Number(contactRow?.c || 0),
      },
    });
  } catch (err) {
    console.error('analytics dashboard error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to load analytics' });
  }
});

module.exports = router;

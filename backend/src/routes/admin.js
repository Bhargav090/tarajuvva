const express = require('express');
const router = express.Router();
const { get } = require('../db/database');
const { authenticateAdmin } = require('../middleware/auth');
const { CHART_KEYS, getAllSizeCharts, getSizeChart, saveSizeChart } = require('../utils/sizeCharts');

// Dashboard stats
router.get('/stats', authenticateAdmin, async (req, res) => {
  const totalOrders = Number((await get('SELECT COUNT(*) AS count FROM orders WHERE deleted_at IS NULL')).count);
  const pendingOrders = Number((await get("SELECT COUNT(*) AS count FROM orders WHERE deleted_at IS NULL AND status = 'received'")).count);
  const totalRevenue = Number(
    (await get(
      "SELECT COALESCE(SUM(total), 0) AS total FROM orders WHERE deleted_at IS NULL AND status NOT IN ('pending_payment', 'cancelled')"
    )).total
  );
  const paidOnline = Number(
    (await get("SELECT COUNT(*) AS count FROM orders WHERE deleted_at IS NULL AND payment_status = 'paid'")).count
  );
  const totalReimagine = Number(
    (await get(
      `SELECT COUNT(*) AS count FROM reimagine_requests
       WHERE COALESCE(consultation_paid, 0) = 0 AND COALESCE(callback_requested, 0) = 0`
    )).count
  );
  const pendingReimagine = Number(
    (await get(
      `SELECT COUNT(*) AS count FROM reimagine_requests
       WHERE status = 'pending_review'
         AND COALESCE(consultation_paid, 0) = 0 AND COALESCE(callback_requested, 0) = 0`
    )).count
  );
  const totalConsultations = Number(
    (await get(
      `SELECT COUNT(*) AS count FROM reimagine_requests
       WHERE COALESCE(consultation_paid, 0) = 1 OR COALESCE(callback_requested, 0) = 1`
    )).count
  );
  const repairWaitlist = Number((await get("SELECT COUNT(*) AS count FROM waitlist WHERE type = 'repair'")).count);
  const donateWaitlist = Number((await get("SELECT COUNT(*) AS count FROM waitlist WHERE type = 'donate'")).count);
  const totalProducts = Number((await get('SELECT COUNT(*) AS count FROM products')).count);
  const totalUsers = Number((await get("SELECT COUNT(*) AS count FROM users WHERE role != 'admin' OR role IS NULL")).count) || Number((await get("SELECT COUNT(*) AS count FROM users")).count) || 0;
  const newSignups30d = Number((await get("SELECT COUNT(*) AS count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")).count) || 0;

  res.json({
    success: true,
    stats: {
      orders: { total: totalOrders, pending: pendingOrders, paid_online: paidOnline },
      revenue: totalRevenue,
      reimagine: { total: totalReimagine, pending: pendingReimagine, consultations: totalConsultations },
      waitlist: { repair: repairWaitlist, donate: donateWaitlist },
      products: totalProducts,
      users: { total: totalUsers, new_30d: newSignups30d }
    }
  });
});

router.get('/size-charts', authenticateAdmin, async (req, res) => {
  const charts = await getAllSizeCharts();
  res.json({ success: true, charts });
});

router.put('/size-charts/:key', authenticateAdmin, async (req, res) => {
  const { key } = req.params;
  if (!CHART_KEYS.includes(key)) {
    return res.status(400).json({ success: false, message: 'Invalid chart key' });
  }
  try {
    const chart = await saveSizeChart(key, req.body);
    res.json({ success: true, chart });
  } catch (err) {
    res.status(err.status || 400).json({ success: false, message: err.message });
  }
});

module.exports = router;

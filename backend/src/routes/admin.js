const express = require('express');
const router = express.Router();
const { get } = require('../db/database');
const { authenticateAdmin } = require('../middleware/auth');

// Dashboard stats
router.get('/stats', authenticateAdmin, async (req, res) => {
  const totalOrders = Number((await get('SELECT COUNT(*) AS count FROM orders')).count);
  const pendingOrders = Number((await get("SELECT COUNT(*) AS count FROM orders WHERE status = 'received'")).count);
  const totalRevenue = Number((await get('SELECT COALESCE(SUM(total), 0) AS total FROM orders')).total);
  const totalReimagine = Number((await get('SELECT COUNT(*) AS count FROM reimagine_requests')).count);
  const pendingReimagine = Number((await get("SELECT COUNT(*) AS count FROM reimagine_requests WHERE status = 'pending_review'")).count);
  const repairWaitlist = Number((await get("SELECT COUNT(*) AS count FROM waitlist WHERE type = 'repair'")).count);
  const donateWaitlist = Number((await get("SELECT COUNT(*) AS count FROM waitlist WHERE type = 'donate'")).count);
  const totalProducts = Number((await get('SELECT COUNT(*) AS count FROM products')).count);

  res.json({
    success: true,
    stats: {
      orders: { total: totalOrders, pending: pendingOrders },
      revenue: totalRevenue,
      reimagine: { total: totalReimagine, pending: pendingReimagine },
      waitlist: { repair: repairWaitlist, donate: donateWaitlist },
      products: totalProducts
    }
  });
});

module.exports = router;

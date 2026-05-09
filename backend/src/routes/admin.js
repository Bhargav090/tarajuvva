const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateAdmin } = require('../middleware/auth');

// Dashboard stats
router.get('/stats', authenticateAdmin, (req, res) => {
  const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'received'").get().count;
  const totalRevenue = db.prepare('SELECT COALESCE(SUM(total), 0) as total FROM orders').get().total;
  const totalReimagine = db.prepare('SELECT COUNT(*) as count FROM reimagine_requests').get().count;
  const pendingReimagine = db.prepare("SELECT COUNT(*) as count FROM reimagine_requests WHERE status = 'pending_review'").get().count;
  const repairWaitlist = db.prepare("SELECT COUNT(*) as count FROM waitlist WHERE type = 'repair'").get().count;
  const donateWaitlist = db.prepare("SELECT COUNT(*) as count FROM waitlist WHERE type = 'donate'").get().count;
  const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;

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

// routes/reportsRoutes.js
// Admin-only routes that expose:
//   - Stored procedure with cursor  → /category-revenue
//   - vw_product_stock_status view  → /stock-status
//   - vw_order_summary view         → /order-summary

const express = require('express');
const router  = express.Router();
const rc      = require('../controllers/reportsController');
const { verifyToken, adminOnly } = require('../middleware/auth');

// All report routes require admin login
router.use(verifyToken, adminOnly);

router.get('/category-revenue', rc.getCategoryReport);  // stored procedure + cursor
router.get('/stock-status',     rc.getStockStatus);     // view 1
router.get('/order-summary',    rc.getOrderSummary);    // view 2

module.exports = router;

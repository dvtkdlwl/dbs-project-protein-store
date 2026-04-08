// routes/orderRoutes.js
const express = require('express');
const router  = express.Router();
const oc      = require('../controllers/orderController');
const { verifyToken, adminOnly } = require('../middleware/auth');

router.use(verifyToken);

router.post('/checkout',  oc.checkout);          // user places order
router.get('/my',         oc.getUserOrders);     // user order history
router.get('/all',        adminOnly, oc.getAllOrders);  // admin: all orders
router.get('/revenue',    adminOnly, oc.getRevenue);   // admin: aggregate stats

module.exports = router;

// routes/cartRoutes.js
const express = require('express');
const router  = express.Router();
const cc      = require('../controllers/cartController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);                             // all cart routes need login

router.get('/',                  cc.getCart);
router.post('/add',              cc.addItem);
router.put('/item/:itemId',      cc.updateItem);
router.delete('/item/:itemId',   cc.removeItem);
router.delete('/clear',          cc.clearCart);

module.exports = router;

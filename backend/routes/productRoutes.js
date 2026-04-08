// routes/productRoutes.js
const express    = require('express');
const router     = express.Router();
const pc         = require('../controllers/productController');
const { verifyToken, adminOnly } = require('../middleware/auth');

router.get('/',             pc.getAll);          // public
router.get('/categories',   pc.getCategories);   // public
router.get('/:id',          pc.getOne);          // public
router.post('/',            verifyToken, adminOnly, pc.create);
router.put('/:id',          verifyToken, adminOnly, pc.update);
router.delete('/:id',       verifyToken, adminOnly, pc.remove);

module.exports = router;

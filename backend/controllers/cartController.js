// controllers/cartController.js
// Uses a JOIN between Cart, Cart_Items, and Products to return full cart details.

const db = require('../config/db');

// Helper: get or create a cart for the logged-in user
async function getOrCreateCart(user_id) {
  let [rows] = await db.query('SELECT cart_id FROM Cart WHERE user_id = ?', [user_id]);
  if (rows.length > 0) return rows[0].cart_id;

  const [result] = await db.query('INSERT INTO Cart (user_id) VALUES (?)', [user_id]);
  return result.insertId;
}

// ── GET cart with product details (JOIN) ──────────────────────
async function getCart(req, res) {
  try {
    const cart_id = await getOrCreateCart(req.user.user_id);

    // JOIN to fetch product info alongside cart item
    const [items] = await db.query(
      `SELECT ci.cart_item_id, ci.quantity,
              p.product_id, p.name, p.price, p.stock, p.in_stock, p.category
       FROM Cart_Items ci
       JOIN Products p ON ci.product_id = p.product_id
       WHERE ci.cart_id = ?`,
      [cart_id]
    );
    res.json({ cart_id, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── POST add item to cart ─────────────────────────────────────
async function addItem(req, res) {
  try {
    const { product_id, quantity = 1 } = req.body;
    if (!product_id) return res.status(400).json({ error: 'product_id required' });

    // Check product exists and is in stock
    const [products] = await db.query(
      'SELECT * FROM Products WHERE product_id = ? AND in_stock = 1', [product_id]
    );
    if (products.length === 0)
      return res.status(404).json({ error: 'Product not available' });

    const cart_id = await getOrCreateCart(req.user.user_id);

    // If already in cart, increment quantity; otherwise insert
    const [existing] = await db.query(
      'SELECT cart_item_id, quantity FROM Cart_Items WHERE cart_id=? AND product_id=?',
      [cart_id, product_id]
    );

    if (existing.length > 0) {
      await db.query(
        'UPDATE Cart_Items SET quantity = quantity + ? WHERE cart_item_id = ?',
        [quantity, existing[0].cart_item_id]
      );
    } else {
      await db.query(
        'INSERT INTO Cart_Items (cart_id, product_id, quantity) VALUES (?,?,?)',
        [cart_id, product_id, quantity]
      );
    }
    res.json({ message: 'Item added to cart' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── PUT update cart item quantity ─────────────────────────────
async function updateItem(req, res) {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1)
      return res.status(400).json({ error: 'quantity must be >= 1' });

    await db.query(
      'UPDATE Cart_Items SET quantity = ? WHERE cart_item_id = ?',
      [quantity, req.params.itemId]
    );
    res.json({ message: 'Quantity updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── DELETE remove item from cart ──────────────────────────────
async function removeItem(req, res) {
  try {
    await db.query(
      'DELETE FROM Cart_Items WHERE cart_item_id = ?', [req.params.itemId]
    );
    res.json({ message: 'Item removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── DELETE clear entire cart ──────────────────────────────────
async function clearCart(req, res) {
  try {
    const cart_id = await getOrCreateCart(req.user.user_id);
    await db.query('DELETE FROM Cart_Items WHERE cart_id = ?', [cart_id]);
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getCart, addItem, updateItem, removeItem, clearCart };

// controllers/orderController.js
// Checkout uses a MySQL TRANSACTION to ensure atomicity:
//   1. Insert into Orders
//   2. Insert into Order_Items
//   3. Deduct stock from Products
//   4. Clear cart
//   5. Insert into Payments
// If any step fails → ROLLBACK

const db = require('../config/db');

// ── POST checkout / place order ────────────────────────────────
async function checkout(req, res) {
  const { payment_method = 'card' } = req.body;
  const user_id = req.user.user_id;

  // Get a raw connection from the pool so we can manage transactions manually
  const conn = await db.getConnection();

  try {
    // ---- 1. Fetch cart ----
    const [cartRows] = await conn.query(
      'SELECT cart_id FROM Cart WHERE user_id = ?', [user_id]
    );
    if (cartRows.length === 0)
      return res.status(400).json({ error: 'Cart not found' });

    const cart_id = cartRows[0].cart_id;

    const [items] = await conn.query(
      `SELECT ci.cart_item_id, ci.quantity, p.product_id, p.price, p.stock, p.name
       FROM Cart_Items ci
       JOIN Products p ON ci.product_id = p.product_id
       WHERE ci.cart_id = ?`,
      [cart_id]
    );

    if (items.length === 0)
      return res.status(400).json({ error: 'Cart is empty' });

    // ---- 2. Validate stock ----
    for (const item of items) {
      if (item.stock < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for "${item.name}" (available: ${item.stock})`
        });
      }
    }

    // ---- BEGIN TRANSACTION ----
    await conn.beginTransaction();

    // ---- 3. Create order ----
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const [orderResult] = await conn.query(
      'INSERT INTO Orders (user_id, total_amount, status) VALUES (?,?,?)',
      [user_id, total.toFixed(2), 'confirmed']
    );
    const order_id = orderResult.insertId;

    // ---- 4. Insert order items ----
    for (const item of items) {
      await conn.query(
        'INSERT INTO Order_Items (order_id, product_id, quantity, price) VALUES (?,?,?,?)',
        [order_id, item.product_id, item.quantity, item.price]
      );
    }

    // ---- 5. Deduct stock ----
    // NOTE: In MySQL SET clauses, assignments execute left-to-right.
    // After `stock = stock - quantity`, the `stock` column already holds
    // the NEW value. So we check `IF(stock <= 0, ...)` — NOT `stock - quantity`
    // again, which would double-subtract and wrongly mark items as out-of-stock.
    for (const item of items) {
      await conn.query(
        `UPDATE Products
         SET stock    = stock - ?,
             in_stock = IF((stock - ?) <= 0, 0, 1),
             low_stock = IF((stock - ?) > 0 AND (stock - ?) <= 3, 1, 0)
         WHERE product_id = ?`,
        [item.quantity, item.quantity, item.quantity, item.quantity, item.product_id]
      );
    }

    // ---- 6. Record payment ----
    await conn.query(
      'INSERT INTO Payments (order_id, amount, payment_method, status) VALUES (?,?,?,?)',
      [order_id, total.toFixed(2), payment_method, 'success']
    );

    // ---- 7. Clear cart ----
    await conn.query('DELETE FROM Cart_Items WHERE cart_id = ?', [cart_id]);

    // ---- COMMIT ----
    await conn.commit();

    res.status(201).json({
      message: 'Order placed successfully',
      order_id,
      total: total.toFixed(2)
    });
  } catch (err) {
    // ---- ROLLBACK on any error ----
    await conn.rollback();
    res.status(500).json({ error: 'Checkout failed: ' + err.message });
  } finally {
    conn.release();
  }
}

// ── GET order history for logged-in user ──────────────────────
async function getUserOrders(req, res) {
  try {
    // JOIN Orders with Order_Items and Products
    const [orders] = await db.query(
      `SELECT o.order_id, o.total_amount, o.status, o.created_at,
              p.status AS payment_status, p.payment_method
       FROM Orders o
       LEFT JOIN Payments p ON o.order_id = p.order_id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [req.user.user_id]
    );

    // For each order, fetch its items
    for (const order of orders) {
      const [items] = await db.query(
        `SELECT oi.quantity, oi.price, pr.name, pr.category
         FROM Order_Items oi
         JOIN Products pr ON oi.product_id = pr.product_id
         WHERE oi.order_id = ?`,
        [order.order_id]
      );
      order.items = items;
    }

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── GET all orders (admin) ────────────────────────────────────
async function getAllOrders(req, res) {
  try {
    const [orders] = await db.query(
      `SELECT o.order_id, o.total_amount, o.status, o.created_at,
              u.name AS customer_name, u.email,
              p.payment_method, p.status AS payment_status
       FROM Orders o
       JOIN Users u ON o.user_id = u.user_id
       LEFT JOIN Payments p ON o.order_id = p.order_id
       ORDER BY o.created_at DESC`
    );
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── GET total revenue + aggregate stats (admin) ───────────────
async function getRevenue(req, res) {
  try {
    // Aggregate query: total revenue, count, avg order
    const [summary] = await db.query(
      `SELECT
         COUNT(*)                    AS total_orders,
         SUM(total_amount)           AS total_revenue,
         AVG(total_amount)           AS avg_order_value,
         MAX(total_amount)           AS max_order,
         MIN(total_amount)           AS min_order
       FROM Orders
       WHERE status != 'cancelled'`
    );

    // Revenue grouped by category (JOIN with Order_Items and Products)
    const [byCategory] = await db.query(
      `SELECT pr.category,
              SUM(oi.quantity * oi.price) AS revenue,
              SUM(oi.quantity)            AS units_sold
       FROM Order_Items oi
       JOIN Products pr ON oi.product_id = pr.product_id
       JOIN Orders o    ON oi.order_id   = o.order_id
       WHERE o.status != 'cancelled'
       GROUP BY pr.category
       ORDER BY revenue DESC`
    );

    // Top 5 best-selling products
    const [topProducts] = await db.query(
      `SELECT pr.name, pr.category,
              SUM(oi.quantity) AS units_sold,
              SUM(oi.quantity * oi.price) AS revenue
       FROM Order_Items oi
       JOIN Products pr ON oi.product_id = pr.product_id
       GROUP BY pr.product_id
       ORDER BY units_sold DESC
       LIMIT 5`
    );

    res.json({ summary: summary[0], byCategory, topProducts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { checkout, getUserOrders, getAllOrders, getRevenue };
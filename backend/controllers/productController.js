// controllers/productController.js
// CHANGED: Added image_url support throughout all functions

const db = require('../config/db');

// ── GET all products (with optional search) ───────────────────
async function getAll(req, res) {
  try {
    const { search, category } = req.query;
    let sql = 'SELECT * FROM Products WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    sql += ' ORDER BY created_at DESC';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── GET single product ────────────────────────────────────────
async function getOne(req, res) {
  try {
    const [rows] = await db.query(
      'SELECT * FROM Products WHERE product_id = ?', [req.params.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: 'Product not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── POST create product (admin) ───────────────────────────────
// CHANGED: Now accepts image_url in request body
async function create(req, res) {
  try {
    const { name, category, description, price, stock, image_url } = req.body;
    if (!name || !category || !price)
      return res.status(400).json({ error: 'name, category and price are required' });

    const [result] = await db.query(
      `INSERT INTO Products (name, category, description, price, stock, in_stock, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, category, description || '', price, stock || 0,
       stock > 0 ? 1 : 0,
       image_url || null]   // CHANGED: store image_url or null
    );
    res.status(201).json({ message: 'Product created', product_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── PUT update product (admin) ────────────────────────────────
async function update(req, res) {
  try {
    const { name, category, description, price, stock, image_url } = req.body;
    const stockQty = parseInt(stock) || 0;
    // Auto-compute in_stock from stock — overrides any manual value sent from client
    const computedInStock = stockQty > 0 ? 1 : 0;
    await db.query(
      `UPDATE Products
       SET name=?, category=?, description=?, price=?, stock=?, in_stock=?, image_url=?
       WHERE product_id=?`,
      [name, category, description, price, stockQty, computedInStock,
       image_url || null,
       req.params.id]
    );
    res.json({ message: 'Product updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── DELETE product (admin) ────────────────────────────────────
async function remove(req, res) {
  try {
    await db.query('DELETE FROM Products WHERE product_id = ?', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── GET categories list ───────────────────────────────────────
async function getCategories(req, res) {
  try {
    const [rows] = await db.query(
      'SELECT DISTINCT category FROM Products ORDER BY category'
    );
    res.json(rows.map(r => r.category));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAll, getOne, create, update, remove, getCategories };
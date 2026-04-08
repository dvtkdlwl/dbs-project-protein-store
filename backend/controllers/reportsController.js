// controllers/reportsController.js
// Exposes the stored procedure + views via REST endpoints.
// All routes here are admin-only (enforced in reportsRoutes.js).

const db = require('../config/db');

// ── GET /api/reports/category-revenue ────────────────────────
// Calls sp_category_revenue_report() — the stored procedure that
// uses a cursor to iterate categories and build a revenue table.
async function getCategoryReport(req, res) {
  try {
    // mysql2 returns [resultSets, fields] for CALL statements.
    // The first element of resultSets is the SELECT from inside
    // the procedure (our tmp_revenue_report rows).
    const [resultSets] = await db.query('CALL sp_category_revenue_report()');
    const report = resultSets[0]; // first result set = report rows

    res.json({
      source: 'Stored Procedure: sp_category_revenue_report() [uses CURSOR]',
      report
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── GET /api/reports/stock-status ────────────────────────────
// Queries the vw_product_stock_status VIEW.
// Returns all products with a computed stock_status label.
async function getStockStatus(req, res) {
  try {
    const [rows] = await db.query(
      'SELECT * FROM vw_product_stock_status ORDER BY stock ASC'
    );
    res.json({
      source: 'View: vw_product_stock_status',
      products: rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── GET /api/reports/order-summary ───────────────────────────
// Queries the vw_order_summary VIEW.
// Returns all orders with customer + payment info already joined.
async function getOrderSummary(req, res) {
  try {
    const [rows] = await db.query(
      'SELECT * FROM vw_order_summary ORDER BY created_at DESC'
    );
    res.json({
      source: 'View: vw_order_summary',
      orders: rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getCategoryReport, getStockStatus, getOrderSummary };

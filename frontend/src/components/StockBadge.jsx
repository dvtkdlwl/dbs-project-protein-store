// src/components/StockBadge.jsx
// Displays stock status badge on product cards and detail pages.
// Uses the existing CSS variables and .badge classes from index.css.
// The low_stock column is set automatically by trg_low_stock_flag trigger.

import React from 'react';

export default function StockBadge({ product, overlay = false }) {
  const { stock, in_stock } = product;

  // Base style — for overlay on product image vs inline text
  const overlayStyle = overlay ? {
    position: 'absolute',
    top: '10px',
    right: '10px',
    backdropFilter: 'blur(4px)',
    zIndex: 2
  } : {};

  // Out of stock — only when stock is truly 0 or in_stock flag is explicitly 0
  if (stock === 0 || in_stock === 0) {
    return (
      <span
        className="badge badge-red"
        style={{ ...overlayStyle, fontWeight: 700 }}
      >
        Out of Stock
      </span>
    );
  }

  // Low stock — only show count when stock is critically low (<=3)
  if (stock <= 3) {
    return (
      <span
        className="badge badge-yellow low-stock-pulse"
        style={{ ...overlayStyle, fontWeight: 700 }}
      >
        ⚠️ Only {stock} left — Order soon!
      </span>
    );
  }

  // Normal in-stock — no count shown
  return (
    <span
      className="badge badge-green"
      style={{ ...overlayStyle, fontWeight: 600 }}
    >
      In Stock
    </span>
  );
}

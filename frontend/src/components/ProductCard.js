// src/components/ProductCard.js

import React from 'react';
import { useNavigate } from 'react-router-dom';

const FALLBACK = 'https://placehold.co/400x300/1a1a1a/e8ff00?text=No+Image';

export default function ProductCard({ product, onAddToCart }) {
  const navigate = useNavigate();
  const { stock, in_stock } = product;

  // Only show a badge in two cases:
  //   1. Out of stock (red) — only when stock is truly 0 or in_stock is explicitly 0
  //   2. Low stock <= 3 (yellow, pulsing) — never show the count for normal stock
  // No badge shown for normal in-stock products.
  function StockBadge() {
    if (stock === 0 || in_stock === 0) {
      return <span className="img-badge badge-red">Out of Stock</span>;
    }
    if (stock <= 3) {
      return (
        <span className="img-badge badge-yellow low-stock-pulse">
          ⚠️ Only {stock} left!
        </span>
      );
    }
    return null; // no badge for normal stock
  }

  return (
    <div
      className="product-card"
      onClick={() => navigate(`/products/${product.product_id}`)}
    >
      <div className="product-img-wrap">
        <img
          src={product.image_url || FALLBACK}
          alt={product.name}
          className="product-img"
          onError={e => { e.target.src = FALLBACK; }}
        />
        <StockBadge />
      </div>

      <div className="product-info">
        <div className="product-category">{product.category}</div>
        <div className="product-name">{product.name}</div>
        <div className="product-footer">
          <div className="product-price">
            ₹{Number(product.price).toLocaleString('en-IN')}
          </div>
          {onAddToCart && stock > 0 && in_stock !== 0 && (
            <button
              className="btn btn-primary btn-sm add-cart-btn"
              onClick={e => { e.stopPropagation(); onAddToCart(product.product_id); }}
            >
              + Cart
            </button>
          )}
          {(stock === 0 || in_stock === 0) && (
            <button className="btn btn-ghost btn-sm" disabled>
              Sold Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
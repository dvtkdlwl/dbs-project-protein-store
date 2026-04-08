// src/pages/ProductDetailPage.js
// CHANGED: Replaced emoji display with real product image

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import { useAuth } from '../context/AuthContext';

const FALLBACK = 'https://placehold.co/500x400/1a1a1a/e8ff00?text=No+Image';

export default function ProductDetailPage({ onCartUpdate }) {
  const { id }        = useParams();
  const navigate      = useNavigate();
  const { user }      = useAuth();
  const [product, setProduct] = useState(null);
  const [qty, setQty]         = useState(1);
  const [msg, setMsg]         = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get(`/products/${id}`)
      .then(r => setProduct(r.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  async function handleAddToCart() {
    if (!user) { navigate('/login'); return; }
    try {
      await API.post('/cart/add', { product_id: product.product_id, quantity: qty });
      setMsg('Added to cart! 🛒');
      onCartUpdate && onCartUpdate();
      setTimeout(() => setMsg(''), 2500);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to add');
    }
  }

  if (loading) return <div className="loading-wrap"><div className="spinner" /></div>;
  if (!product) return null;

  return (
    <div className="page-wrap">
      <div className="container">
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: 24 }}
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        {msg && <div className="alert alert-success">{msg}</div>}

        <div className="detail-grid">

          {/* CHANGED: Real image instead of emoji box */}
          <div className="detail-img-wrap">
            <img
              src={product.image_url || FALLBACK}
              alt={product.name}
              className="detail-img"
              onError={e => { e.target.src = FALLBACK; }}
            />
          </div>

          {/* Product info */}
          <div className="detail-info">
            <div className="product-category" style={{ fontSize: 13, marginBottom: 6 }}>
              {product.category}
            </div>
            <h1 className="detail-title">{product.name}</h1>

            <div className="detail-price">
              ₹{Number(product.price).toLocaleString('en-IN')}
            </div>

            <div style={{ marginBottom: 16 }}>
              {(product.stock === 0 || product.in_stock === 0)
                ? <span className="badge badge-red">✗ Out of Stock</span>
                : product.stock <= 3
                  ? <span className="badge badge-yellow low-stock-pulse">⚠️ Only {product.stock} left — Order soon!</span>
                  : <span className="badge badge-green">✓ In Stock</span>
              }
            </div>

            <p className="detail-desc">{product.description}</p>

            {product.stock > 0 && product.in_stock !== 0 && user?.role !== 'admin' && (
              <div className="detail-actions">
                <div className="qty-ctrl">
                  <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                  <span className="qty-num">{qty}</span>
                  <button className="qty-btn" onClick={() => setQty(q => Math.min(product.stock, q + 1))}>+</button>
                </div>
                <button className="btn btn-primary" onClick={handleAddToCart} style={{ flex: 1 }}>
                  Add to Cart 🛒
                </button>
              </div>
            )}

            {!user && (
              <button
                className="btn btn-primary"
                onClick={() => navigate('/login')}
                style={{ marginTop: 8, width: '100%' }}
              >
                Login to Buy
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
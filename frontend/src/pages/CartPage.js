// src/pages/CartPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

const EMOJI = { 'Whey Protein':'🥛','Whey Isolate':'⚡','Creatine':'💥','Omega-3':'🐟','Amino Acids':'🔬','Mass Gainer':'⚖️' };

export default function CartPage({ onCartUpdate }) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  async function loadCart() {
    try {
      const { data } = await API.get('/cart');
      setItems(data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCart(); }, []);

  async function updateQty(cart_item_id, quantity) {
    if (quantity < 1) return;
    await API.put(`/cart/item/${cart_item_id}`, { quantity });
    loadCart();
    onCartUpdate && onCartUpdate();
  }

  async function removeItem(cart_item_id) {
    await API.delete(`/cart/item/${cart_item_id}`);
    loadCart();
    onCartUpdate && onCartUpdate();
  }

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  if (loading) return <div className="loading-wrap"><div className="spinner" /></div>;

  return (
    <div className="page-wrap">
      <div className="container">
        <div className="page-title">YOUR CART</div>

        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🛒</div>
            <h3>Your cart is empty</h3>
            <p>Add some products to get started</p>
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/')}>
              Browse Products
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
            {/* Items list */}
            <div className="card">
              {items.map(item => (
                <div key={item.cart_item_id} className="cart-item">
                  <div className="cart-emoji">{EMOJI[item.category] || '🏋️'}</div>
                  <div className="cart-info">
                    <div className="cart-name">{item.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>{item.category}</div>
                    <div className="cart-price" style={{ marginTop: 4 }}>
                      ₹{Number(item.price).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <div className="qty-ctrl">
                      <button className="qty-btn" onClick={() => updateQty(item.cart_item_id, item.quantity - 1)}>−</button>
                      <span style={{ fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{item.quantity}</span>
                      <button className="qty-btn" onClick={() => updateQty(item.cart_item_id, item.quantity + 1)}>+</button>
                    </div>
                    <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, color: 'var(--accent)' }}>
                      ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={() => removeItem(item.cart_item_id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="card">
              <div className="section-title">ORDER SUMMARY</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                <span style={{ color: 'var(--muted)' }}>Items ({items.length})</span>
                <span>₹{total.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                <span style={{ color: 'var(--muted)' }}>Shipping</span>
                <span style={{ color: 'var(--success)' }}>FREE</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-head)', fontSize: 28 }}>
                  <span>TOTAL</span>
                  <span style={{ color: 'var(--accent)' }}>₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 20, padding: '14px' }}
                onClick={() => navigate('/checkout')}
              >
                Proceed to Checkout →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

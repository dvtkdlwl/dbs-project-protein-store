// src/pages/OrdersPage.js
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import API from '../api';

export default function OrdersPage() {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const newOrder = location.state?.newOrder;

  useEffect(() => {
    API.get('/orders/my')
      .then(r => setOrders(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function statusBadge(s) {
    const map = { confirmed: 'badge-yellow', shipped: 'badge-green', delivered: 'badge-green', cancelled: 'badge-red', pending: 'badge-red' };
    return <span className={`badge ${map[s] || 'badge-yellow'}`}>{s.toUpperCase()}</span>;
  }

  if (loading) return <div className="loading-wrap"><div className="spinner" /></div>;

  return (
    <div className="page-wrap">
      <div className="container">
        <div className="page-title">MY ORDERS</div>

        {newOrder && (
          <div className="alert alert-success">
            🎉 Order #{newOrder} placed successfully! Thank you for your purchase.
          </div>
        )}

        {orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <h3>No orders yet</h3>
            <p>Your order history will appear here</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {orders.map(order => (
              <div key={order.order_id} className="card">
                {/* Order header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, letterSpacing: 1 }}>
                      ORDER #{order.order_id}
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>
                      {new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {statusBadge(order.status)}
                    <div style={{ fontFamily: 'var(--font-head)', fontSize: 28, color: 'var(--accent)', marginTop: 4 }}>
                      ₹{Number(order.total_amount).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  {order.items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, borderBottom: i < order.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <span>{item.name} <span style={{ color: 'var(--muted)' }}>×{item.quantity}</span></span>
                      <span>₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>

                {/* Payment info */}
                <div style={{ marginTop: 12, display: 'flex', gap: 12, fontSize: 13, color: 'var(--muted)' }}>
                  <span>💳 {order.payment_method || 'card'}</span>
                  <span style={{ color: 'var(--success)' }}>✓ {order.payment_status || 'success'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

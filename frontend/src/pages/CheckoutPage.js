// src/pages/CheckoutPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

export default function CheckoutPage({ onCartUpdate }) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error,   setError]   = useState('');
  const [card, setCard] = useState({
    number: '', name: '', expiry: '', cvv: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    API.get('/cart')
      .then(r => setItems(r.data.items))
      .catch(() => navigate('/cart'))
      .finally(() => setLoading(false));
  }, [navigate]);

  function handleCard(e) {
    setCard(c => ({ ...c, [e.target.name]: e.target.value }));
  }

  async function handlePlaceOrder(e) {
    e.preventDefault();
    // Basic card validation (mock)
    if (!card.number || !card.name || !card.expiry || !card.cvv) {
      setError('Please fill in all payment details'); return;
    }
    if (card.number.replace(/\s/g, '').length !== 16) {
      setError('Invalid card number'); return;
    }
    setError('');
    setPlacing(true);
    try {
      const { data } = await API.post('/orders/checkout', { payment_method: 'card' });
      onCartUpdate && onCartUpdate();
      navigate('/orders', { state: { newOrder: data.order_id } });
    } catch (err) {
      setError(err.response?.data?.error || 'Order failed. Try again.');
    } finally {
      setPlacing(false);
    }
  }

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  if (loading) return <div className="loading-wrap"><div className="spinner" /></div>;

  return (
    <div className="page-wrap">
      <div className="container">
        <div className="page-title">CHECKOUT</div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handlePlaceOrder}>
          <div className="checkout-grid">
            {/* Payment form */}
            <div>
              <div className="section-title">PAYMENT DETAILS</div>
              <div className="card">
                <div style={{
                  background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                  border: '1px solid var(--border)',
                  borderRadius: 12, padding: '24px 28px',
                  marginBottom: 24, position: 'relative', overflow: 'hidden'
                }}>
                  <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: '#e8ff0015' }} />
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 24, letterSpacing: 2 }}>CREDIT / DEBIT CARD</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 20, letterSpacing: 4, marginBottom: 20 }}>
                    {(card.number || '•••• •••• •••• ••••').slice(0, 19)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>CARD HOLDER</div>
                      <div>{card.name || 'YOUR NAME'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>EXPIRES</div>
                      <div>{card.expiry || 'MM/YY'}</div>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Card Number</label>
                  <input
                    name="number" placeholder="1234 5678 9012 3456"
                    value={card.number} onChange={handleCard}
                    maxLength={19}
                    onInput={e => {
                      // Auto-format with spaces
                      let v = e.target.value.replace(/\D/g, '').slice(0, 16);
                      e.target.value = v.replace(/(.{4})/g, '$1 ').trim();
                    }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cardholder Name</label>
                  <input name="name" placeholder="John Doe" value={card.name} onChange={handleCard} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Expiry</label>
                    <input name="expiry" placeholder="MM/YY" maxLength={5} value={card.expiry} onChange={handleCard} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CVV</label>
                    <input name="cvv" placeholder="•••" type="password" maxLength={3} value={card.cvv} onChange={handleCard} />
                  </div>
                </div>


              </div>
            </div>

            {/* Order summary */}
            <div>
              <div className="section-title">ORDER ITEMS</div>
              <div className="card" style={{ marginBottom: 16 }}>
                {items.map(item => (
                  <div key={item.cart_item_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ color: 'var(--muted)', fontSize: 12 }}>Qty: {item.quantity}</div>
                    </div>
                    <div style={{ color: 'var(--accent)', fontFamily: 'var(--font-head)', fontSize: 18 }}>
                      ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, fontFamily: 'var(--font-head)', fontSize: 26 }}>
                  <span>TOTAL</span>
                  <span style={{ color: 'var(--accent)' }}>₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 16, fontSize: 16 }} disabled={placing}>
                {placing ? 'Placing Order…' : '✓ Place Order'}
              </button>
              <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: 10 }} onClick={() => navigate('/cart')}>
                ← Back to Cart
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
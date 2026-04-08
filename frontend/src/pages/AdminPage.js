// src/pages/AdminPage.js
import React, { useState, useEffect } from 'react';
import API from '../api';

const CATEGORIES = ['Whey Protein','Whey Isolate','Creatine','Omega-3','Amino Acids','Mass Gainer','Pre-Workout','Plant Protein','Vitamins'];

const EMPTY_FORM = { name: '', category: '', description: '', price: '', stock: '', in_stock: 1, image_url: '' };

export default function AdminPage() {
  const [tab,          setTab]          = useState('products');
  const [products,     setProducts]     = useState([]);
  const [orders,       setOrders]       = useState([]);
  const [revenue,      setRevenue]      = useState(null);
  const [stockReport,  setStockReport]  = useState([]);   // vw_product_stock_status view
  const [catRevenue,   setCatRevenue]   = useState([]);   // stored procedure + cursor result
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [editId,       setEditId]       = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [msg,          setMsg]          = useState('');
  const [error,        setError]        = useState('');

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    setLoading(true);
    try { const { data } = await API.get('/products'); setProducts(data); }
    catch(e) { console.error(e); } finally { setLoading(false); }
  }

  async function loadOrders() {
    setLoading(true);
    try { const { data } = await API.get('/orders/all'); setOrders(data); }
    catch(e) { console.error(e); } finally { setLoading(false); }
  }

  async function loadRevenue() {
    setLoading(true);
    try { const { data } = await API.get('/orders/revenue'); setRevenue(data); }
    catch(e) { console.error(e); } finally { setLoading(false); }
  }

  // Calls vw_product_stock_status VIEW via /api/reports/stock-status
  async function loadStockReport() {
    setLoading(true);
    setError('');
    try {
      const { data } = await API.get('/reports/stock-status');
      setStockReport(data.products);
    } catch(e) {
      setError('Stock report failed: ' + (e.response?.data?.error || e.message) + '. Make sure you ran schema.sql to create the vw_product_stock_status view.');
    } finally { setLoading(false); }
  }

  // Calls sp_category_revenue_report() STORED PROCEDURE (uses CURSOR internally)
  // via /api/reports/category-revenue
  async function loadCatRevenue() {
    setLoading(true);
    setError('');
    try {
      const { data } = await API.get('/reports/category-revenue');
      setCatRevenue(data.report);
    } catch(e) {
      setError('Category report failed: ' + (e.response?.data?.error || e.message) + '. Make sure you ran schema.sql to create the sp_category_revenue_report stored procedure.');
    } finally { setLoading(false); }
  }

  function switchTab(t) {
    setTab(t);
    setMsg(''); setError('');
    if (t === 'orders')      loadOrders();
    if (t === 'revenue')     loadRevenue();
    if (t === 'stock')       loadStockReport();
    if (t === 'catrevenue')  loadCatRevenue();
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? (checked ? 1 : 0) : value }));
  }

  function startEdit(p) {
    setEditId(p.product_id);
    setForm({
      name: p.name, category: p.category, description: p.description,
      price: p.price, stock: p.stock, in_stock: p.in_stock, image_url: p.image_url || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() { setEditId(null); setForm(EMPTY_FORM); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setMsg('');
    // Auto-compute in_stock from stock quantity — don't rely on checkbox alone
    const stockQty = parseInt(form.stock) || 0;
    const payload = { ...form, stock: stockQty, in_stock: stockQty > 0 ? 1 : 0 };
    try {
      if (editId) {
        await API.put(`/products/${editId}`, payload);
        setMsg('Product updated ✓');
      } else {
        await API.post('/products', payload);
        setMsg('Product added ✓');
      }
      setEditId(null); setForm(EMPTY_FORM);
      loadProducts();
    } catch (err) {
      setError(err.response?.data?.error || 'Error saving product');
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await API.delete(`/products/${id}`);
      setMsg('Product deleted'); loadProducts();
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  }

  async function toggleStock(p) {
    const newInStock = p.in_stock ? 0 : 1;
    try {
      await API.put(`/products/${p.product_id}`, { ...p, in_stock: newInStock });
      loadProducts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to toggle stock status');
    }
  }

  function statusBadge(s) {
    const map = { confirmed: 'badge-yellow', shipped: 'badge-green', delivered: 'badge-green', cancelled: 'badge-red', pending: 'badge-yellow' };
    return <span className={`badge ${map[s] || 'badge-yellow'}`}>{s}</span>;
  }

  // Stock status label for the stock report table
  function stockStatusBadge(status) {
    if (status === 'Out of Stock') return <span className="badge badge-red">{status}</span>;
    if (status === 'Low Stock')    return <span className="badge badge-red low-stock-pulse">{status}</span>;
    return <span className="badge badge-green">{status}</span>;
  }

  const TABS = [
    { id: 'products',   label: '📦 Products' },
    { id: 'orders',     label: '🧾 Orders' },
    { id: 'revenue',    label: '📊 Revenue' },
    { id: 'stock',      label: '🔴 Stock Status' },      // queries vw_product_stock_status VIEW
    { id: 'catrevenue', label: '🗄️ Category Report' },  // calls stored procedure with cursor
  ];

  return (
    <div className="page-wrap">
      <div className="container">
        <div className="page-title">FITFUEL ADMIN</div>

        {/* Tabs */}
        <div className="tabs">
          {TABS.map(t => (
            <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => switchTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── PRODUCTS TAB ── */}
        {tab === 'products' && (
          <>
            <div className="card" style={{ marginBottom: 28 }}>
              <div className="section-title" style={{ marginBottom: 20 }}>
                {editId ? `EDITING PRODUCT #${editId}` : 'ADD NEW PRODUCT'}
              </div>
              {msg   && <div className="alert alert-success">{msg}</div>}
              {error && <div className="alert alert-error">{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Product Name *</label>
                    <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Gold Standard Whey" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select name="category" value={form.category} onChange={handleChange} required>
                      <option value="">Select category</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea name="description" value={form.description} onChange={handleChange} rows={2} placeholder="Short product description…" />
                </div>
                <div className="form-group">
                  <label className="form-label">Image URL</label>
                  <input name="image_url" value={form.image_url} onChange={handleChange} placeholder="https://..." />
                  {form.image_url && (
                    <img
                      src={form.image_url} alt="preview"
                      style={{ marginTop: 10, height: 80, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--border)' }}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  )}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Price (₹) *</label>
                    <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange} placeholder="e.g. 2499" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stock Quantity *</label>
                    <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} placeholder="e.g. 50" required />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="submit" className="btn btn-primary">{editId ? 'Update Product' : 'Add Product'}</button>
                  {editId && <button type="button" className="btn btn-ghost" onClick={cancelEdit}>Cancel</button>}
                </div>
              </form>
            </div>

            <div className="card">
              <div className="section-title" style={{ marginBottom: 16 }}>ALL PRODUCTS ({products.length})</div>
              {loading ? <div className="spinner" /> : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>#</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.product_id}>
                          <td style={{ color: 'var(--muted)', fontSize: 13 }}>{p.product_id}</td>
                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                          <td><span className="badge badge-yellow">{p.category}</span></td>
                          <td style={{ fontFamily: 'var(--font-head)', fontSize: 18, color: 'var(--accent)' }}>
                            ₹{Number(p.price).toLocaleString('en-IN')}
                          </td>
                          <td style={{ color: p.stock <= 3 ? 'var(--danger)' : 'var(--text)', fontWeight: p.stock <= 3 ? 700 : 400 }}>
                            {p.stock} {p.stock <= 3 && p.stock > 0 ? '⚠️' : ''}
                          </td>
                          <td>
                            <button
                              className={`badge ${p.in_stock ? 'badge-green' : 'badge-red'}`}
                              style={{ border: 'none', cursor: 'pointer', fontSize: 12 }}
                              onClick={() => toggleStock(p)} title="Click to toggle"
                            >
                              {p.in_stock ? 'In Stock' : 'Out of Stock'}
                            </button>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => startEdit(p)}>Edit</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.product_id, p.name)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── ORDERS TAB ── */}
        {tab === 'orders' && (
          <div className="card">
            <div className="section-title" style={{ marginBottom: 16 }}>ALL CUSTOMER ORDERS</div>
            {loading ? <div className="spinner" /> : orders.length === 0 ? (
              <div className="empty-state"><h3>No orders yet</h3></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Order #</th><th>Customer</th><th>Email</th><th>Amount</th><th>Payment</th><th>Pay Status</th><th>Order Status</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.order_id}>
                        <td style={{ fontWeight: 700 }}>#{o.order_id}</td>
                        <td>{o.customer_name}</td>
                        <td style={{ color: 'var(--muted)', fontSize: 13 }}>{o.email}</td>
                        <td style={{ fontFamily: 'var(--font-head)', fontSize: 18, color: 'var(--accent)' }}>
                          ₹{Number(o.total_amount).toLocaleString('en-IN')}
                        </td>
                        <td>{o.payment_method}</td>
                        <td>
                          <span className={`badge ${o.payment_status === 'success' ? 'badge-green' : o.payment_status === 'failed' ? 'badge-red' : 'badge-yellow'}`}>
                            {o.payment_status || 'pending'}
                          </span>
                        </td>
                        <td>{statusBadge(o.status)}</td>
                        <td style={{ color: 'var(--muted)', fontSize: 13 }}>
                          {new Date(o.created_at).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── REVENUE TAB ── */}
        {tab === 'revenue' && (
          <>
            {loading ? <div className="spinner" /> : !revenue ? null : (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-label">Total Revenue</div>
                    <div className="stat-value">₹{Number(revenue.summary.total_revenue || 0).toLocaleString('en-IN')}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Total Orders</div>
                    <div className="stat-value">{revenue.summary.total_orders}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Avg Order Value</div>
                    <div className="stat-value">₹{Number(revenue.summary.avg_order_value || 0).toFixed(0)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Highest Order</div>
                    <div className="stat-value">₹{Number(revenue.summary.max_order || 0).toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div className="card">
                    <div className="section-title" style={{ marginBottom: 16 }}>BY CATEGORY</div>
                    <table>
                      <thead><tr><th>Category</th><th>Units Sold</th><th>Revenue</th></tr></thead>
                      <tbody>
                        {revenue.byCategory.map(c => (
                          <tr key={c.category}>
                            <td><span className="badge badge-yellow">{c.category}</span></td>
                            <td>{c.units_sold}</td>
                            <td style={{ color: 'var(--accent)', fontFamily: 'var(--font-head)', fontSize: 18 }}>
                              ₹{Number(c.revenue).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="card">
                    <div className="section-title" style={{ marginBottom: 16 }}>TOP 5 PRODUCTS</div>
                    <table>
                      <thead><tr><th>Product</th><th>Units</th><th>Revenue</th></tr></thead>
                      <tbody>
                        {revenue.topProducts.map((p, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</td>
                            <td>{p.units_sold}</td>
                            <td style={{ color: 'var(--accent)', fontFamily: 'var(--font-head)', fontSize: 18 }}>
                              ₹{Number(p.revenue).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ── STOCK STATUS TAB (queries vw_product_stock_status VIEW) ── */}
        {tab === 'stock' && (
          <div className="card">
            <div className="section-title" style={{ marginBottom: 4 }}>STOCK STATUS REPORT</div>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
              Source: <code style={{ color: 'var(--accent)' }}>VIEW vw_product_stock_status</code> — computed stock labels via SQL CASE expression
            </p>
            {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
            {loading ? <div className="spinner" /> : stockReport.length === 0 && !error ? (
              <div className="empty-state"><h3>No products found. Make sure you ran schema.sql to create the view.</h3></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>#</th><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {stockReport.map(p => (
                      <tr key={p.product_id}>
                        <td style={{ color: 'var(--muted)' }}>{p.product_id}</td>
                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                        <td><span className="badge badge-yellow">{p.category}</span></td>
                        <td style={{ fontFamily: 'var(--font-head)', fontSize: 18, color: 'var(--accent)' }}>
                          ₹{Number(p.price).toLocaleString('en-IN')}
                        </td>
                        <td style={{ color: p.stock <= 3 ? 'var(--danger)' : 'var(--text)', fontWeight: p.stock <= 3 ? 700 : 400 }}>
                          {p.stock}
                        </td>
                        <td>{stockStatusBadge(p.stock_status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── CATEGORY REVENUE TAB (calls stored procedure with cursor) ── */}
        {tab === 'catrevenue' && (
          <div className="card">
            <div className="section-title" style={{ marginBottom: 4 }}>CATEGORY REVENUE REPORT</div>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
              Source: <code style={{ color: 'var(--accent)' }}>CALL sp_category_revenue_report()</code> — stored procedure using a CURSOR to iterate categories
            </p>
            {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
            {loading ? <div className="spinner" /> : catRevenue.length === 0 && !error ? (
              <div className="empty-state"><h3>No sales data yet. Place some orders first!</h3></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Category</th><th>Total Revenue</th><th>Units Sold</th><th>Avg Price / Unit</th></tr>
                  </thead>
                  <tbody>
                    {catRevenue.map((r, i) => (
                      <tr key={i}>
                        <td><span className="badge badge-yellow">{r.category}</span></td>
                        <td style={{ fontFamily: 'var(--font-head)', fontSize: 22, color: 'var(--accent)' }}>
                          ₹{Number(r.total_revenue).toLocaleString('en-IN')}
                        </td>
                        <td>{r.units_sold}</td>
                        <td style={{ color: 'var(--muted)' }}>
                          ₹{Number(r.avg_price_per_unit).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
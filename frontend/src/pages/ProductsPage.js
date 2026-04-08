// src/pages/ProductsPage.js
import React, { useState, useEffect } from 'react';
import API from '../api';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';

export default function ProductsPage({ onCartUpdate }) {
  const [products,   setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [search,     setSearch]     = useState('');
  const [category,   setCategory]   = useState('');
  const [loading,    setLoading]    = useState(true);
  const [msg,        setMsg]        = useState('');
  const { user } = useAuth();

  // Load categories once
  useEffect(() => {
    API.get('/products/categories').then(r => setCategories(r.data)).catch(() => {});
  }, []);

  // Re-fetch products whenever search or category filter changes
  useEffect(() => {
    setLoading(true);
    const params = {};
    if (search)   params.search   = search;
    if (category) params.category = category;
    API.get('/products', { params })
      .then(r => setProducts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, category]);

  async function handleAddToCart(product_id) {
    if (!user) { alert('Please login to add items to cart'); return; }
    try {
      await API.post('/cart/add', { product_id, quantity: 1 });
      setMsg('Added to cart! 🛒');
      onCartUpdate && onCartUpdate();
      setTimeout(() => setMsg(''), 2000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add');
    }
  }

  return (
    <div className="page-wrap">
      <div className="container">
       {/* CHANGED: Updated heading to match new store name */}
<div className="page-title">FITFUEL PRODUCTS</div>
<div className="page-subtitle">Premium protein supplements & nutrition — FitFuel Protein </div> 

        {msg && <div className="alert alert-success">{msg}</div>}

        {/* ── Filters ── */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
          <input
            placeholder="🔍 Search products…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200 }}
          />
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: 200 }}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(search || category) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setCategory(''); }}>
              Clear
            </button>
          )}
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div className="loading-wrap"><div className="spinner" /></div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3>No products found</h3>
            <p>Try a different search or category</p>
          </div>
        ) : (
          <div className="product-grid">
            {products.map(p => (
              <ProductCard
                key={p.product_id}
                product={p}
                onAddToCart={user && !user.role === 'admin' ? handleAddToCart : (user?.role !== 'admin' ? handleAddToCart : null)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

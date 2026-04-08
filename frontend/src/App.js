// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import API from './api';

import Navbar          from './components/Navbar';
import AuthPage        from './pages/AuthPage';
import ProductsPage    from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage        from './pages/CartPage';
import CheckoutPage    from './pages/CheckoutPage';
import OrdersPage      from './pages/OrdersPage';
import AdminPage       from './pages/AdminPage';

// ── Route guards ──────────────────────────────────────────────
function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}
function AdminRoute({ children }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (!isAdmin) return <Navigate to="/" />;
  return children;
}

// ── Inner app (has access to auth context) ────────────────────
function AppInner() {
  const { user } = useAuth();
  const [cartCount, setCartCount] = useState(0);

  // Refresh cart count whenever user changes
  async function refreshCartCount() {
    if (!user || user.role === 'admin') { setCartCount(0); return; }
    try {
      const { data } = await API.get('/cart');
      setCartCount(data.items.reduce((s, i) => s + i.quantity, 0));
    } catch { setCartCount(0); }
  }

  useEffect(() => { refreshCartCount(); }, [user]); // eslint-disable-line

  return (
    <>
      <Navbar cartCount={cartCount} />
      <Routes>
        {/* Public */}
        <Route path="/"          element={<ProductsPage  onCartUpdate={refreshCartCount} />} />
        <Route path="/products/:id" element={<ProductDetailPage onCartUpdate={refreshCartCount} />} />
        <Route path="/login"     element={<AuthPage mode="login" />} />
        <Route path="/register"  element={<AuthPage mode="register" />} />

        {/* User-only */}
        <Route path="/cart"     element={<PrivateRoute><CartPage     onCartUpdate={refreshCartCount} /></PrivateRoute>} />
        <Route path="/checkout" element={<PrivateRoute><CheckoutPage onCartUpdate={refreshCartCount} /></PrivateRoute>} />
        <Route path="/orders"   element={<PrivateRoute><OrdersPage /></PrivateRoute>} />

        {/* Admin-only */}
        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </AuthProvider>
  );
}

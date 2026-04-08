// src/components/Navbar.js
// CHANGED: Store name updated to "FitFuel Protein Store"

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ cartCount = 0 }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    window.location.href = '/login';
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        {/* CHANGED: Updated store name and logo text */}
        <Link to="/" className="nav-logo">
          <span className="nav-logo-icon"></span>
          FitFuel
          <span className="nav-logo-sub"> Protein </span>
        </Link>

        <div className="nav-links">
          <Link to="/" className="nav-link">Products</Link>

          {user ? (
            <>
              {!isAdmin && (
                <Link to="/cart" className="nav-link cart-link">
                  🛒 Cart
                  {cartCount > 0 && (
                    <span className="cart-badge">{cartCount}</span>
                  )}
                </Link>
              )}
              {!isAdmin && (
                <Link to="/orders" className="nav-link">Orders</Link>
              )}
              {isAdmin && (
                <Link to="/admin" className="nav-link">⚙ Admin</Link>
              )}
              <span className="nav-user">Hi, {user.name.split(' ')[0]}</span>
              <button onClick={handleLogout} className="btn btn-ghost btn-sm">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login"    className="nav-link">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
// src/pages/AuthPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import { useAuth } from '../context/AuthContext';

export default function AuthPage({ mode = 'login' }) {
  const [isLogin, setIsLogin] = useState(mode === 'login');
  const [form, setForm]       = useState({ name: '', email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const { data } = await API.post('/auth/login', {
          email: form.email, password: form.password
        });
        login(data.token, data.user);
        navigate(data.user.role === 'admin' ? '/admin' : '/');
      } else {
        await API.post('/auth/register', form);
        setIsLogin(true);
        setError('');
        alert('Registered! Please log in.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, color: 'var(--muted)', letterSpacing: 3, marginBottom: 4 }}>
   FITFUEL PROTEIN 
</div>
<div className="auth-title">{isLogin ? 'WELCOME BACK' : 'JOIN US'}</div>
        <div className="auth-sub">
          {isLogin ? 'Log in to your account' : 'Create a new account'}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                name="name" placeholder="John Doe"
                value={form.name} onChange={handleChange} required
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              name="email" type="email" placeholder="you@example.com"
              value={form.email} onChange={handleChange} required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              name="password" type="password" placeholder="••••••••"
              value={form.password} onChange={handleChange} required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
            {loading ? 'Please wait…' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>

        <div className="auth-switch">
          {isLogin ? (
            <>Don't have an account? <span onClick={() => setIsLogin(false)}>Register</span></>
          ) : (
            <>Already registered? <span onClick={() => setIsLogin(true)}>Login</span></>
          )}
        </div>


      </div>
    </div>
  );
}
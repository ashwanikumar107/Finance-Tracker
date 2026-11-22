import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet, Lock, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './Auth.css';

export default function Login() {
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('priya@pennywise.com');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      addToast('Welcome back! Logged in successfully.', 'success');
      navigate('/overview');
    } catch (err) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Demo account quick filler
  const fillDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card pw-card">
        {/* Brand Header */}
        <div className="auth-brand">
          <div className="auth-brand-logo">
            <Wallet size={24} color="#FFFFFF" />
          </div>
          <h1 className="auth-title">Pennywise</h1>
          <p className="auth-subtitle">Sign in to your personal finance dashboard</p>
        </div>

        {error && <div className="auth-error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="auth-input-wrap">
              <Mail size={16} className="auth-input-icon" />
              <input
                type="email"
                className="form-input auth-input"
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input
                type="password"
                className="form-input auth-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-submit-btn"
            disabled={loading}
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Demo Accounts Quick-Select Buttons */}
        <div className="demo-accounts-box">
          <span className="demo-box-label">QUICK DEMO ROLES (Password123!)</span>
          <div className="demo-buttons-row">
            <button
              type="button"
              className="demo-pill-btn"
              onClick={() => fillDemo('priya@pennywise.com')}
            >
              Standard User
            </button>
            <button
              type="button"
              className="demo-pill-btn"
              onClick={() => fillDemo('admin@pennywise.com')}
            >
              Admin
            </button>
            <button
              type="button"
              className="demo-pill-btn"
              onClick={() => fillDemo('readonly@pennywise.com')}
            >
              Read-Only
            </button>
          </div>
        </div>

        <div className="auth-footer">
          <span>Don't have an account?</span>
          <Link to="/register" className="auth-link">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}

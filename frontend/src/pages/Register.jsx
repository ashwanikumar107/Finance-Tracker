import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet, Lock, Mail, User, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './Auth.css';

export default function Register() {
  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password, role);
      addToast('Account created successfully! Welcome to Pennywise.', 'success');
      navigate('/overview');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card pw-card">
        <div className="auth-brand">
          <div className="auth-brand-logo">
            <Wallet size={24} color="#FFFFFF" />
          </div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Start organizing your personal finances with Pennywise</p>
        </div>

        {error && <div className="auth-error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div className="auth-input-wrap">
              <User size={16} className="auth-input-icon" />
              <input
                type="text"
                className="form-input auth-input"
                placeholder="e.g., Arjun Rao"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

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
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Account Role</label>
            <div className="auth-input-wrap">
              <Shield size={16} className="auth-input-icon" />
              <select
                className="form-select auth-input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={loading}
              >
                <option value="user">User (Standard account)</option>
                <option value="read-only">Read-Only (View transactions and analytics only)</option>
                <option value="admin">Admin (Full administrative privileges)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-submit-btn"
            disabled={loading}
          >
            <span>{loading ? 'Creating Account...' : 'Get Started'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="auth-footer">
          <span>Already have an account?</span>
          <Link to="/login" className="auth-link">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

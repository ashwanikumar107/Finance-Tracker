import React, { useState } from 'react';
import { User, Shield, Moon, Sun, DollarSign, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/formatters';

export default function Settings() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();

  const [currency, setCurrency] = useState('INR (₹)');
  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [emailSummaries, setEmailSummaries] = useState(false);

  const handleSavePreferences = (e) => {
    e.preventDefault();
    addToast('Preferences saved successfully', 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Profile & Application Settings
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Manage your account profile, role authorizations, and personal finance preferences.
        </p>
      </div>

      {/* Account Profile Card */}
      <div className="pw-card">
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Account Details
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Full Name:</span>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{user?.name}</div>
          </div>

          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Email Address:</span>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{user?.email}</div>
          </div>

          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Assigned Role:</span>
            <div style={{ marginTop: '4px' }}>
              <span className={`role-pill role-${user?.role}`} style={{ fontSize: '12px', padding: '3px 8px' }}>
                {user?.role}
              </span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Account Created:</span>
            <div style={{ fontWeight: 500, color: 'var(--text-secondary)', marginTop: '2px' }}>
              {formatDate(user?.created_at)}
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Form */}
      <div className="pw-card">
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Application Preferences
        </h3>

        <form onSubmit={handleSavePreferences}>
          <div className="form-group">
            <label className="form-label">Theme Mode</label>
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
              <button
                type="button"
                className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => theme !== 'light' && toggleTheme()}
              >
                <Sun size={15} />
                <span>Light Warm (#F7F8F6)</span>
              </button>
              <button
                type="button"
                className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => theme !== 'dark' && toggleTheme()}
              >
                <Moon size={15} />
                <span>Dark Slate</span>
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">Default Currency</label>
            <select
              className="form-select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{ maxWidth: '300px' }}
            >
              <option value="INR (₹)">INR - Indian Rupee (₹)</option>
              <option value="USD ($)">USD - US Dollar ($)</option>
              <option value="EUR (€)">EUR - Euro (€)</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13.5px' }}>
              <input
                type="checkbox"
                checked={budgetAlerts}
                onChange={(e) => setBudgetAlerts(e.target.checked)}
              />
              <span>Display threshold warnings when category spending crosses 80%</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13.5px' }}>
              <input
                type="checkbox"
                checked={emailSummaries}
                onChange={(e) => setEmailSummaries(e.target.checked)}
              />
              <span>Receive weekly financial digest via registered email</span>
            </label>
          </div>

          <div style={{ marginTop: '24px' }}>
            <button type="submit" className="btn btn-primary">
              Save Preferences
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Sun,
  Moon,
  LogOut,
  User,
  Shield,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { formatDate } from '../utils/formatters';
import './Header.css';

export default function Header({ title }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const todayStr = formatDate(new Date().toISOString());

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="pw-header">
      <div className="header-left">
        <h1 className="header-page-title">{title}</h1>
        <span className="header-date">{todayStr}</span>
      </div>

      <div className="header-right">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="btn-icon header-action-btn"
          title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label="Toggle Theme"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications Icon (Subtle financial status alert) */}
        <div className="notification-bell-wrap" title="No unread alerts">
          <button className="btn-icon header-action-btn" aria-label="Notifications">
            <Bell size={18} />
            <span className="notification-badge-dot"></span>
          </button>
        </div>

        {/* Profile Dropdown */}
        <div className="profile-dropdown-container" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="profile-dropdown-trigger"
            aria-expanded={dropdownOpen}
          >
            <div className="profile-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="profile-text-wrap">
              <span className="profile-name">{user?.name}</span>
              <span className="profile-role-tag">{user?.role}</span>
            </div>
            <ChevronDown size={14} className="dropdown-caret" />
          </button>

          {dropdownOpen && (
            <div className="profile-dropdown-menu">
              <div className="dropdown-user-details">
                <p className="dropdown-name">{user?.name}</p>
                <p className="dropdown-email">{user?.email}</p>
                <span className={`dropdown-role-badge role-${user?.role}`}>
                  Role: {user?.role}
                </span>
              </div>
              <div className="dropdown-divider"></div>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/settings');
                }}
                className="dropdown-item"
              >
                <User size={15} />
                <span>Profile & Settings</span>
              </button>

              {user?.role === 'admin' && (
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/admin/users');
                  }}
                  className="dropdown-item"
                >
                  <Shield size={15} />
                  <span>Admin Management</span>
                </button>
              )}

              <div className="dropdown-divider"></div>

              <button onClick={handleLogout} className="dropdown-item dropdown-logout">
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Tag,
  Target,
  Users,
  Settings,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

export default function Sidebar() {
  const { user, isAdmin, isReadOnly } = useAuth();

  return (
    <aside className="pw-sidebar">
      {/* Brand Logo & Name */}
      <div className="sidebar-brand">
        <div className="brand-logo-icon">
          <Wallet size={20} color="#FFFFFF" />
        </div>
        <div className="brand-title-wrap">
          <span className="brand-title">Pennywise</span>
          <span className="brand-subtitle">Finance Manager</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        <div className="nav-section-title">MAIN MENU</div>
        <NavLink
          to="/overview"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} />
          <span>Overview</span>
        </NavLink>

        <NavLink
          to="/transactions"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Receipt size={18} />
          <span>Transactions</span>
        </NavLink>

        <NavLink
          to="/analytics"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <PieChart size={18} />
          <span>Analytics</span>
        </NavLink>

        <NavLink
          to="/categories"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Tag size={18} />
          <span>Categories</span>
        </NavLink>

        <NavLink
          to="/budgets"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Target size={18} />
          <span>Monthly Budgets</span>
        </NavLink>

        {/* Admin Navigation */}
        {isAdmin && (
          <>
            <div className="nav-section-title" style={{ marginTop: '20px' }}>ADMINISTRATION</div>
            <NavLink
              to="/admin/users"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Users size={18} />
              <span>User Management</span>
            </NavLink>
            <NavLink
              to="/admin/logs"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <ShieldCheck size={18} />
              <span>Activity Logs</span>
            </NavLink>
          </>
        )}

        <div className="nav-section-title" style={{ marginTop: '20px' }}>PREFERENCES</div>
        <NavLink
          to="/settings"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Settings size={18} />
          <span>Settings</span>
        </NavLink>
      </nav>

      {/* User Mini Profile Card */}
      <div className="sidebar-user-footer">
        <div className="user-avatar-circle">
          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div className="user-info-text">
          <div className="user-info-name" title={user?.name}>{user?.name}</div>
          <div className="user-info-role">
            <span className={`role-pill role-${user?.role}`}>
              {user?.role}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

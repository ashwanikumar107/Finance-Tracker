import React, { useState, useEffect } from 'react';
import { Users, Shield, Trash2, Edit3, Check, X, AlertCircle } from 'lucide-react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import ConfirmationModal from '../components/ConfirmationModal';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function AdminUsers() {
  const { user: currentAdmin } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [roleChangeUser, setRoleChangeUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('user');
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/users');
      if (res.success && res.data) {
        setUsers(res.data.users || []);
      }
    } catch (err) {
      addToast(err.message || 'Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleUpdate = async () => {
    if (!roleChangeUser) return;
    try {
      await apiFetch(`/users/${roleChangeUser.id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: selectedRole }),
      });
      addToast(`Role for ${roleChangeUser.name} changed to '${selectedRole}'`, 'success');
      setRoleChangeUser(null);
      fetchUsers();
    } catch (err) {
      addToast(err.message || 'Failed to update user role', 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    try {
      await apiFetch(`/users/${deleteConfirmUser.id}`, { method: 'DELETE' });
      addToast(`User ${deleteConfirmUser.name} has been removed`, 'success');
      setDeleteConfirmUser(null);
      fetchUsers();
    } catch (err) {
      addToast(err.message || 'Failed to delete user', 'error');
    }
  };

  if (loading) {
    return <LoadingSkeleton rows={6} type="table" />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
          User Administration & RBAC
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Review registered accounts, grant system privileges, and manage role assignments.
        </p>
      </div>

      <div className="pw-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="transactions-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Transactions</th>
                <th>Total Income</th>
                <th>Total Expenses</th>
                <th>Created</th>
                <th style={{ textAlign: 'center' }}>Manage</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.email}</div>
                  </td>
                  <td>
                    <span className={`role-pill role-${u.role}`} style={{ fontSize: '11px', padding: '3px 8px' }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px', fontWeight: 600 }}>{u.total_transactions}</td>
                  <td style={{ color: '#16A34A', fontWeight: 600 }}>{formatCurrency(u.total_income)}</td>
                  <td style={{ color: '#DC2626', fontWeight: 600 }}>{formatCurrency(u.total_expenses)}</td>
                  <td style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    {formatDate(u.created_at)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        onClick={() => {
                          setRoleChangeUser(u);
                          setSelectedRole(u.role);
                        }}
                        title="Change User Role"
                      >
                        <Shield size={13} />
                        <span>Role</span>
                      </button>

                      {u.id !== currentAdmin?.id && (
                        <button
                          className="btn-icon"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => setDeleteConfirmUser(u)}
                          title="Delete User"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Change Modal */}
      {roleChangeUser && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-container" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Change User Role</h3>
              <button className="btn-icon" onClick={() => setRoleChangeUser(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: '16px', fontSize: '13.5px' }}>
              Assigning new permissions for <strong>{roleChangeUser.name}</strong> ({roleChangeUser.email}).
            </div>

            <div className="form-group">
              <label className="form-label">Select Authorization Level</label>
              <select
                className="form-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="user">User (Manage own transactions & budgets)</option>
                <option value="read-only">Read-Only (View data only; no edits/exports)</option>
                <option value="admin">Admin (Full administrative & user control)</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setRoleChangeUser(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleRoleUpdate}>
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      <ConfirmationModal
        isOpen={!!deleteConfirmUser}
        title="Delete User Account"
        message={`Are you sure you want to delete ${deleteConfirmUser?.name} (${deleteConfirmUser?.email})? All their transactions and budget settings will be permanently removed.`}
        confirmText="Permanently Delete"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={handleDeleteUser}
        onCancel={() => setDeleteConfirmUser(null)}
      />
    </div>
  );
}

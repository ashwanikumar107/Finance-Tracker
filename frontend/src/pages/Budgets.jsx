import React, { useState, useEffect } from 'react';
import { Target, Plus, AlertTriangle, CheckCircle, Trash2, Edit2, X } from 'lucide-react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatMonthYear } from '../utils/formatters';
import ConfirmationModal from '../components/ConfirmationModal';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function Budgets() {
  const { isReadOnly } = useAuth();
  const { addToast } = useToast();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [deleteConfirmBudget, setDeleteConfirmBudget] = useState(null);

  // Form
  const [categoryId, setCategoryId] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/budgets?month=${selectedMonth}&year=${selectedYear}`);
      if (res.success && res.data) {
        setBudgets(res.data.budgets || []);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load budgets', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [selectedMonth, selectedYear]);

  // Load expense categories
  useEffect(() => {
    apiFetch('/categories?type=expense')
      .then((res) => {
        if (res.success && res.data) {
          setCategories(res.data.categories || []);
        }
      })
      .catch((e) => console.error(e));
  }, []);

  const openModal = (budget = null) => {
    if (budget) {
      setEditingBudget(budget);
      setCategoryId(budget.categoryId);
      setMonthlyLimit(budget.monthlyLimit);
    } else {
      setEditingBudget(null);
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setMonthlyLimit('');
    }
    setIsModalOpen(true);
  };

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    if (!monthlyLimit || parseFloat(monthlyLimit) <= 0) {
      addToast('Please provide a valid budget amount', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingBudget) {
        await apiFetch(`/budgets/${editingBudget.id}`, {
          method: 'PUT',
          body: JSON.stringify({ monthly_limit: monthlyLimit }),
        });
        addToast('Budget updated successfully', 'success');
      } else {
        await apiFetch('/budgets', {
          method: 'POST',
          body: JSON.stringify({
            category_id: categoryId,
            monthly_limit: monthlyLimit,
            month: selectedMonth,
            year: selectedYear,
          }),
        });
        addToast('Budget allocated successfully', 'success');
      }
      setIsModalOpen(false);
      fetchBudgets();
    } catch (err) {
      addToast(err.message || 'Failed to save budget', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBudget = async () => {
    if (!deleteConfirmBudget) return;
    try {
      await apiFetch(`/budgets/${deleteConfirmBudget.id}`, { method: 'DELETE' });
      addToast('Budget limit removed', 'success');
      setDeleteConfirmBudget(null);
      fetchBudgets();
    } catch (err) {
      addToast(err.message || 'Failed to delete budget', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Monthly Category Budgets
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Track expense allocations against real-time outflows for {formatMonthYear(selectedMonth, selectedYear)}.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            className="form-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            style={{ width: '130px' }}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2026, i, 1).toLocaleDateString('en-IN', { month: 'long' })}
              </option>
            ))}
          </select>

          <select
            className="form-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            style={{ width: '100px' }}
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>

          {!isReadOnly && (
            <button className="btn btn-primary" onClick={() => openModal()}>
              <Plus size={16} />
              <span>Set Budget</span>
            </button>
          )}
        </div>
      </div>

      {/* Budgets Grid */}
      {loading ? (
        <LoadingSkeleton rows={4} type="card" />
      ) : budgets.length === 0 ? (
        <div className="pw-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Target size={36} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
            No Budgets Defined for {formatMonthYear(selectedMonth, selectedYear)}
          </h3>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Set category spending limits to proactively manage your savings rate and get threshold alerts.
          </p>
          {!isReadOnly && (
            <button className="btn btn-primary" onClick={() => openModal()}>
              Set First Budget
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {budgets.map((b) => (
            <div key={b.id} className="pw-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: b.categoryColor }}></div>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{b.categoryName}</span>
                </div>

                {!isReadOnly && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn-icon" onClick={() => openModal(b)} title="Edit Limit">
                      <Edit2 size={14} />
                    </button>
                    <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => setDeleteConfirmBudget(b)} title="Delete Budget">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Status Alert Banner */}
              {b.status === 'exceeded' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--danger-soft)',
                  color: 'var(--danger)',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '12px',
                }}>
                  <AlertTriangle size={14} />
                  <span>Budget Exceeded by {formatCurrency(b.actualSpent - b.monthlyLimit)}!</span>
                </div>
              )}

              {b.status === 'warning' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--warning-soft)',
                  color: 'var(--warning)',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '12px',
                }}>
                  <AlertTriangle size={14} />
                  <span>Warning: {b.percentageConsumed}% of budget consumed</span>
                </div>
              )}

              {/* Progress bar */}
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-subtle)', borderRadius: '4px', overflow: 'hidden', marginBottom: '14px' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, b.percentageConsumed)}%`,
                    backgroundColor: b.status === 'exceeded' ? 'var(--danger)' : b.status === 'warning' ? 'var(--warning)' : 'var(--accent-primary)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              {/* Metrics Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>Spent:</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(b.actualSpent)}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>Budget Limit:</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(b.monthlyLimit)}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>Remaining:</span>
                  <div style={{ fontWeight: 600, color: b.remainingBudget < 0 ? 'var(--danger)' : '#16A34A' }}>
                    {formatCurrency(b.remainingBudget)}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>Utilized:</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.percentageConsumed}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Set / Edit Budget Modal */}
      {isModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-container" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingBudget ? `Edit ${editingBudget.categoryName} Budget` : 'Set Category Budget'}
              </h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBudget}>
              {!editingBudget && (
                <div className="form-group">
                  <label className="form-label">Expense Category *</label>
                  <select
                    className="form-select"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    disabled={submitting}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Monthly Limit (₹) *</label>
                <input
                  type="number"
                  step="100"
                  min="1"
                  className="form-input"
                  placeholder="e.g. 5000"
                  value={monthlyLimit}
                  onChange={(e) => setMonthlyLimit(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Set Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteConfirmBudget}
        title="Remove Budget Allocation"
        message={`Are you sure you want to remove the monthly spending limit for "${deleteConfirmBudget?.categoryName}"?`}
        confirmText="Remove"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={handleDeleteBudget}
        onCancel={() => setDeleteConfirmBudget(null)}
      />
    </div>
  );
}

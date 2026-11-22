import React, { useState, useEffect } from 'react';
import { Plus, Tag, Trash2, Edit2, Check, X } from 'lucide-react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmationModal from '../components/ConfirmationModal';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function Categories() {
  const { isReadOnly } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteConfirmCat, setDeleteConfirmCat] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState('expense');
  const [color, setColor] = useState('#23845B');
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/categories');
      if (res.success && res.data) {
        setCategories(res.data.categories || []);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setType('expense');
    setColor('#23845B');
    setIsModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setName(cat.name);
    setType(cat.type);
    setColor(cat.color || '#23845B');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Category name is required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingCategory) {
        await apiFetch(`/categories/${editingCategory.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: name.trim(), color }),
        });
        addToast('Category updated successfully', 'success');
      } else {
        await apiFetch('/categories', {
          method: 'POST',
          body: JSON.stringify({ name: name.trim(), type, color }),
        });
        addToast('Category created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      addToast(err.message || 'Failed to save category', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmCat) return;
    try {
      await apiFetch(`/categories/${deleteConfirmCat.id}`, { method: 'DELETE' });
      addToast('Category removed successfully', 'success');
      setDeleteConfirmCat(null);
      fetchCategories();
    } catch (err) {
      addToast(err.message || 'Failed to delete category', 'error');
    }
  };

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  const presetColors = [
    '#23845B', '#EF4444', '#F97316', '#8B5CF6',
    '#EC4899', '#EAB308', '#06B6D4', '#3B82F6',
    '#6366F1', '#10B981', '#14B8A6', '#6B7280'
  ];

  if (loading) {
    return <LoadingSkeleton rows={6} type="card" />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Category Classification
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Organize transactions and budgets by customized financial categories.
          </p>
        </div>

        {!isReadOnly && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} />
            <span>Create Category</span>
          </button>
        )}
      </div>

      {/* Grid of Expense Categories and Income Categories */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Expense Categories */}
        <div className="pw-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Expense Categories ({expenseCategories.length})
            </h3>
            <span className="badge badge-expense">Outflows</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {expenseCategories.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '4px', backgroundColor: c.color }}></div>
                  <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>{c.name}</span>
                </div>

                {!isReadOnly && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn-icon" onClick={() => openEditModal(c)} title="Edit Category">
                      <Edit2 size={14} />
                    </button>
                    <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => setDeleteConfirmCat(c)} title="Delete Category">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Income Categories */}
        <div className="pw-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Income Categories ({incomeCategories.length})
            </h3>
            <span className="badge badge-income">Inflows</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {incomeCategories.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '4px', backgroundColor: c.color }}></div>
                  <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>{c.name}</span>
                </div>

                {!isReadOnly && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn-icon" onClick={() => openEditModal(c)} title="Edit Category">
                      <Edit2 size={14} />
                    </button>
                    <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => setDeleteConfirmCat(c)} title="Delete Category">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-container" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingCategory ? 'Edit Category' : 'Create Custom Category'}
              </h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Category Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Subscriptions, Pet Care"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                />
              </div>

              {!editingCategory && (
                <div className="form-group">
                  <label className="form-label">Type *</label>
                  <select
                    className="form-select"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    disabled={submitting}
                  >
                    <option value="expense">Expense (Outflow)</option>
                    <option value="income">Income (Inflow)</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Display Color</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {presetColors.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setColor(hex)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: hex,
                        border: color === hex ? '3px solid #1A201C' : '2px solid transparent',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
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
                  {submitting ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteConfirmCat}
        title="Delete Category"
        message={`Are you sure you want to delete category "${deleteConfirmCat?.name}"? You will not be able to delete it if existing transactions are mapped to it.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmCat(null)}
      />
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { apiFetch } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  transactionToEdit = null,
}) {
  const { addToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    type: 'expense',
    category_id: '',
    transaction_date: new Date().toISOString().split('T')[0],
    payment_method: 'UPI',
    description: '',
  });

  const [errors, setErrors] = useState({});

  // Fetch categories when modal opens
  useEffect(() => {
    if (isOpen) {
      apiFetch('/categories')
        .then((res) => {
          if (res.success && res.data?.categories) {
            setCategories(res.data.categories);
          }
        })
        .catch((e) => console.error('Failed to load categories', e));
    }
  }, [isOpen]);

  // Populate form if editing
  useEffect(() => {
    if (transactionToEdit) {
      setFormData({
        title: transactionToEdit.title || '',
        amount: transactionToEdit.amount || '',
        type: transactionToEdit.type || 'expense',
        category_id: transactionToEdit.category_id || '',
        transaction_date: transactionToEdit.transaction_date ? transactionToEdit.transaction_date.split('T')[0] : '',
        payment_method: transactionToEdit.payment_method || 'UPI',
        description: transactionToEdit.description || '',
      });
      setIsDirty(false);
    } else {
      setFormData({
        title: '',
        amount: '',
        type: 'expense',
        category_id: '',
        transaction_date: new Date().toISOString().split('T')[0],
        payment_method: 'UPI',
        description: '',
      });
      setIsDirty(false);
    }
    setErrors({});
  }, [transactionToEdit, isOpen]);

  // Filter categories by chosen transaction type
  const availableCategories = categories.filter((c) => c.type === formData.type);

  // Set default category when type toggles
  useEffect(() => {
    if (availableCategories.length > 0 && !formData.category_id) {
      setFormData((prev) => ({ ...prev, category_id: availableCategories[0].id }));
    }
  }, [formData.type, availableCategories]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setIsDirty(true);
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  }, [errors]);

  const handleClose = () => {
    if (isDirty) {
      const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to close this form?');
      if (!confirmLeave) return;
    }
    onClose();
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Valid amount is required';
    if (!formData.category_id) newErrors.category_id = 'Please select a category';
    if (!formData.transaction_date) newErrors.transaction_date = 'Date is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return; // Prevent double submit
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (transactionToEdit) {
        // Update
        await apiFetch(`/transactions/${transactionToEdit.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        addToast('Transaction updated successfully', 'success');
      } else {
        // Create
        await apiFetch('/transactions', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        addToast('Transaction added successfully', 'success');
      }
      setIsDirty(false);
      onSuccess();
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to save transaction', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="modal-title">
            {transactionToEdit ? 'Edit Transaction' : 'Record New Transaction'}
          </h2>
          <button
            type="button"
            className="btn-icon"
            onClick={handleClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Type Selector (Income vs Expense) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            <button
              type="button"
              className={`btn ${formData.type === 'expense' ? 'btn-danger' : 'btn-secondary'}`}
              style={{
                backgroundColor: formData.type === 'expense' ? 'var(--danger)' : undefined,
                color: formData.type === 'expense' ? '#FFF' : undefined,
              }}
              onClick={() => {
                setFormData((p) => ({ ...p, type: 'expense', category_id: '' }));
                setIsDirty(true);
              }}
            >
              Expense
            </button>
            <button
              type="button"
              className={`btn ${formData.type === 'income' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                backgroundColor: formData.type === 'income' ? 'var(--accent-primary)' : undefined,
                color: formData.type === 'income' ? '#FFF' : undefined,
              }}
              onClick={() => {
                setFormData((p) => ({ ...p, type: 'income', category_id: '' }));
                setIsDirty(true);
              }}
            >
              Income
            </button>
          </div>

          {/* Title */}
          <div className="form-group">
            <label className="form-label">Transaction Title *</label>
            <input
              type="text"
              name="title"
              className="form-input"
              placeholder="e.g., Grocery Shopping, Monthly Salary"
              value={formData.title}
              onChange={handleChange}
              disabled={submitting}
            />
            {errors.title && <span className="form-error">{errors.title}</span>}
          </div>

          {/* Amount & Date in Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                name="amount"
                className="form-input"
                placeholder="0.00"
                value={formData.amount}
                onChange={handleChange}
                disabled={submitting}
              />
              {errors.amount && <span className="form-error">{errors.amount}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Date *</label>
              <input
                type="date"
                name="transaction_date"
                className="form-input"
                value={formData.transaction_date}
                onChange={handleChange}
                disabled={submitting}
              />
              {errors.transaction_date && <span className="form-error">{errors.transaction_date}</span>}
            </div>
          </div>

          {/* Category & Payment Method */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                name="category_id"
                className="form-select"
                value={formData.category_id}
                onChange={handleChange}
                disabled={submitting}
              >
                <option value="">Select Category</option>
                {availableCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.category_id && <span className="form-error">{errors.category_id}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select
                name="payment_method"
                className="form-select"
                value={formData.payment_method}
                onChange={handleChange}
                disabled={submitting}
              >
                <option value="UPI">UPI</option>
                <option value="Card">Credit/Debit Card</option>
                <option value="Net Banking">Net Banking</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description (Optional)</label>
            <textarea
              name="description"
              rows={2}
              className="form-textarea"
              placeholder="Add optional notes or receipt details..."
              value={formData.description}
              onChange={handleChange}
              disabled={submitting}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : transactionToEdit ? 'Update Transaction' : 'Record Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

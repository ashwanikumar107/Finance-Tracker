import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { List } from 'react-window';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate, exportToCSV } from '../utils/formatters';
import TransactionModal from '../components/TransactionModal';
import ConfirmationModal from '../components/ConfirmationModal';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import './Transactions.css';

export default function Transactions() {
  const { user, isReadOnly, isAdmin } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 1,
  });

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('transaction_date');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'virtual'

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deleteConfirmTxn, setDeleteConfirmTxn] = useState(null);
  const [viewingDetailTxn, setViewingDetailTxn] = useState(null);

  // Fetch categories for filter dropdown
  useEffect(() => {
    apiFetch('/categories')
      .then((res) => {
        if (res.success && res.data?.categories) {
          setCategories(res.data.categories);
        }
      })
      .catch((e) => console.error('Failed to load categories', e));
  }, []);

  // Fetch transactions with applied filters
  const fetchTransactions = useCallback(async (pageToLoad = pagination.page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageToLoad,
        limit: pagination.limit,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (selectedType) params.append('type', selectedType);
      if (selectedCategory) params.append('category_id', selectedCategory);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const res = await apiFetch(`/transactions?${params.toString()}`);
      if (res.success && res.data) {
        setTransactions(res.data.transactions || []);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      addToast(err.message || 'Failed to fetch transactions', 'error');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, sortBy, sortOrder, searchTerm, selectedType, selectedCategory, startDate, endDate, addToast]);

  useEffect(() => {
    fetchTransactions(1);
  }, [searchTerm, selectedType, selectedCategory, startDate, endDate, sortBy, sortOrder]);

  // Handle Delete
  const handleDelete = async () => {
    if (!deleteConfirmTxn) return;
    try {
      await apiFetch(`/transactions/${deleteConfirmTxn.id}`, { method: 'DELETE' });
      addToast('Transaction deleted successfully', 'success');
      setDeleteConfirmTxn(null);
      fetchTransactions(pagination.page);
    } catch (err) {
      addToast(err.message || 'Could not delete transaction', 'error');
    }
  };

  // CSV Export for authorized users
  const handleExportCSV = () => {
    if (isReadOnly) {
      addToast('Export is restricted on read-only accounts.', 'error');
      return;
    }
    if (transactions.length === 0) {
      addToast('No transaction data available to export.', 'info');
      return;
    }

    const exportData = transactions.map((t) => ({
      ID: t.id,
      Title: t.title,
      Type: t.type,
      Category: t.category_name,
      Amount: t.amount,
      Date: t.transaction_date,
      PaymentMethod: t.payment_method,
      Description: t.description || '',
    }));

    exportToCSV(exportData, `Pennywise_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
    addToast('Transactions exported to CSV successfully', 'success');
  };

  return (
    <div className="transactions-page">
      {/* Control Header: Search, Filters, Add Button, CSV Export */}
      <div className="txns-toolbar pw-card">
        <div className="toolbar-row-top">
          {/* Search Input */}
          <div className="search-input-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search transactions by title or description..."
              className="toolbar-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Action buttons */}
          <div className="toolbar-actions">
            {!isReadOnly && (
              <button
                className="btn btn-secondary"
                onClick={handleExportCSV}
                title="Export current view to CSV"
              >
                <Download size={15} />
                <span>Export CSV</span>
              </button>
            )}

            {!isReadOnly ? (
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditingTransaction(null);
                  setIsModalOpen(true);
                }}
              >
                <Plus size={16} />
                <span>Add Transaction</span>
              </button>
            ) : (
              <span className="badge badge-neutral" style={{ padding: '8px 12px' }}>
                Read-Only Access
              </span>
            )}
          </div>
        </div>

        {/* Filter Bar Row */}
        <div className="toolbar-filters-row">
          {/* Type Filter */}
          <div className="filter-item">
            <label className="filter-label">Type</label>
            <select
              className="form-select filter-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="filter-item">
            <label className="filter-label">Category</label>
            <select
              className="form-select filter-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Start */}
          <div className="filter-item">
            <label className="filter-label">From</label>
            <input
              type="date"
              className="form-input filter-date-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* Date Range End */}
          <div className="filter-item">
            <label className="filter-label">To</label>
            <input
              type="date"
              className="form-input filter-date-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Sort By */}
          <div className="filter-item">
            <label className="filter-label">Sort</label>
            <select
              className="form-select filter-select"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [f, o] = e.target.value.split('-');
                setSortBy(f);
                setSortOrder(o);
              }}
            >
              <option value="transaction_date-DESC">Date (Newest First)</option>
              <option value="transaction_date-ASC">Date (Oldest First)</option>
              <option value="amount-DESC">Amount (High to Low)</option>
              <option value="amount-ASC">Amount (Low to High)</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {(searchTerm || selectedType || selectedCategory || startDate || endDate) && (
            <button
              className="btn btn-secondary"
              style={{ alignSelf: 'flex-end', height: '38px', fontSize: '13px' }}
              onClick={() => {
                setSearchTerm('');
                setSelectedType('');
                setSelectedCategory('');
                setStartDate('');
                setEndDate('');
              }}
            >
              Reset
            </button>
          )}

          {/* View Mode Toggle (Virtual Scrolling vs Standard Table) */}
          <div style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '12.5px', height: '38px' }}
              onClick={() => setViewMode(viewMode === 'table' ? 'virtual' : 'table')}
              title="Toggle Virtual Window Scrolling"
            >
              <SlidersHorizontal size={14} />
              <span>{viewMode === 'table' ? 'Virtual Scroll View' : 'Table View'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ marginTop: '20px' }}>
          <LoadingSkeleton rows={8} type="table" />
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          title="No transactions match your criteria"
          description="Try adjusting your filters, date range, or search keywords."
          actionLabel={!isReadOnly ? 'Add New Transaction' : undefined}
          onAction={() => {
            setEditingTransaction(null);
            setIsModalOpen(true);
          }}
        />
      ) : viewMode === 'virtual' ? (
        /* Virtual Scrolling List using react-window */
        <div className="pw-card virtual-list-card">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
            VIRTUALIZED LIST (Showing {transactions.length} items loaded for smooth high-volume performance)
          </div>
          <List
            rowCount={transactions.length}
            rowHeight={64}
            width="100%"
            height={480}
            rowComponent={({ index, style }) => {
              const t = transactions[index];
              return (
                <div key={t.id} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{t.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDate(t.transaction_date)} • {t.category_name}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: t.type === 'income' ? '#16A34A' : '#DC2626' }}>
                      {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                    </span>
                    <button
                      className="btn-icon"
                      onClick={() => setViewingDetailTxn(t)}
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </div>
              );
            }}
          />
        </div>
      ) : (
        /* Standard Responsive Table View */
        <div className="pw-card table-card">
          <div className="table-responsive">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Payment Method</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'center', width: '110px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className="txn-name-primary">{t.title}</div>
                      {t.description && (
                        <div className="txn-desc-secondary" title={t.description}>
                          {t.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        className="cat-badge"
                        style={{
                          backgroundColor: `${t.category_color}15`,
                          color: t.category_color,
                        }}
                      >
                        {t.category_name}
                      </span>
                    </td>
                    <td className="txn-date-cell">{formatDate(t.transaction_date)}</td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {t.payment_method || 'UPI'}
                    </td>
                    <td>
                      <span className={`badge badge-${t.type}`}>{t.type}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                      <span style={{ color: t.type === 'income' ? '#16A34A' : '#DC2626' }}>
                        {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons-group">
                        <button
                          className="btn-icon"
                          onClick={() => setViewingDetailTxn(t)}
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>
                        {!isReadOnly && (
                          <>
                            <button
                              className="btn-icon"
                              onClick={() => {
                                setEditingTransaction(t);
                                setIsModalOpen(true);
                              }}
                              title="Edit Transaction"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              className="btn-icon"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => setDeleteConfirmTxn(t)}
                              title="Delete Transaction"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="pagination-bar">
            <div className="pagination-info">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
              {pagination.totalCount} records
            </div>

            <div className="pagination-buttons">
              <button
                className="btn btn-secondary pagination-btn"
                disabled={!pagination.hasPrevPage}
                onClick={() => fetchTransactions(pagination.page - 1)}
              >
                <ChevronLeft size={16} />
                <span>Previous</span>
              </button>

              <span className="page-number-indicator">
                Page {pagination.page} of {pagination.totalPages || 1}
              </span>

              <button
                className="btn btn-secondary pagination-btn"
                disabled={!pagination.hasNextPage}
                onClick={() => fetchTransactions(pagination.page + 1)}
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Add / Edit Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        onSuccess={() => fetchTransactions(pagination.page)}
        transactionToEdit={editingTransaction}
      />

      {/* Transaction Details Modal */}
      {viewingDetailTxn && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-container" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Transaction Details</h3>
              <button className="btn-icon" onClick={() => setViewingDetailTxn(null)}>
                &times;
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Title:</span>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{viewingDetailTxn.title}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Amount:</span>
                  <p style={{ fontWeight: 700, fontSize: '16px', color: viewingDetailTxn.type === 'income' ? '#16A34A' : '#DC2626' }}>
                    {formatCurrency(viewingDetailTxn.amount)}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Type:</span>
                  <p><span className={`badge badge-${viewingDetailTxn.type}`}>{viewingDetailTxn.type}</span></p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Category:</span>
                  <p style={{ fontWeight: 500 }}>{viewingDetailTxn.category_name}</p>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Date:</span>
                  <p style={{ fontWeight: 500 }}>{formatDate(viewingDetailTxn.transaction_date)}</p>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Payment Method:</span>
                <p style={{ fontWeight: 500 }}>{viewingDetailTxn.payment_method || 'UPI'}</p>
              </div>
              {viewingDetailTxn.description && (
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Description / Notes:</span>
                  <p style={{ color: 'var(--text-secondary)', background: 'var(--bg-subtle)', padding: '10px', borderRadius: '6px' }}>
                    {viewingDetailTxn.description}
                  </p>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setViewingDetailTxn(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationModal
        isOpen={!!deleteConfirmTxn}
        title="Delete Transaction"
        message={`Are you sure you want to delete "${deleteConfirmTxn?.title}" (₹${deleteConfirmTxn?.amount})? This will permanently remove the record and update financial balances.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmTxn(null)}
      />
    </div>
  );
}

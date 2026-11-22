import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Percent,
  Plus,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import LoadingSkeleton from '../components/LoadingSkeleton';
import TransactionModal from '../components/TransactionModal';
import './Overview.css';

export default function Overview() {
  const { isReadOnly } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [insights, setInsights] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Date filters
  const [dateFilter, setDateFilter] = useState('all'); // all, 30days, thisMonth

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      let start_date = '';
      let end_date = '';

      if (dateFilter === 'thisMonth') {
        const now = new Date();
        start_date = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        end_date = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      } else if (dateFilter === '30days') {
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        start_date = thirtyDaysAgo.toISOString().split('T')[0];
        end_date = now.toISOString().split('T')[0];
      }

      const queryParam = start_date && end_date ? `?start_date=${start_date}&end_date=${end_date}` : '';

      const [overviewRes, monthlyRes, categoryRes, txnsRes, insightsRes] = await Promise.all([
        apiFetch(`/analytics/overview${queryParam}`),
        apiFetch('/analytics/monthly?months=6'),
        apiFetch(`/analytics/categories?type=expense${start_date ? `&start_date=${start_date}&end_date=${end_date}` : ''}`),
        apiFetch('/transactions?limit=5&sort_by=transaction_date&sort_order=DESC'),
        apiFetch('/analytics/insights'),
      ]);

      if (overviewRes.success) setOverviewData(overviewRes.data);
      if (monthlyRes.success) setMonthlyData(monthlyRes.data || []);
      if (categoryRes.success) setCategoryData(categoryRes.data || []);
      if (txnsRes.success) setRecentTransactions(txnsRes.data?.transactions || []);
      if (insightsRes.success) setInsights(insightsRes.data || []);
    } catch (err) {
      console.error('Error fetching overview dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Chart 1: Bar Chart (Monthly Income vs Expense)
  const barChartData = useMemo(() => {
    return {
      labels: monthlyData.map((d) => d.monthLabel),
      datasets: [
        {
          label: 'Income (₹)',
          data: monthlyData.map((d) => d.income),
          backgroundColor: '#23845B',
          borderRadius: 4,
        },
        {
          label: 'Expenses (₹)',
          data: monthlyData.map((d) => d.expense),
          backgroundColor: '#E57373',
          borderRadius: 4,
        },
      ],
    };
  }, [monthlyData]);

  // Chart 2: Category Breakdown Doughnut
  const doughnutData = useMemo(() => {
    return {
      labels: categoryData.map((c) => c.name),
      datasets: [
        {
          data: categoryData.map((c) => c.amount),
          backgroundColor: categoryData.map((c) => c.color || '#23845B'),
          borderWidth: 2,
          borderColor: '#FFFFFF',
        },
      ],
    };
  }, [categoryData]);

  // Chart 3: Six-Month Spending Trend Line Chart
  const trendLineData = useMemo(() => {
    return {
      labels: monthlyData.map((d) => d.monthLabel),
      datasets: [
        {
          label: 'Monthly Spending (₹)',
          data: monthlyData.map((d) => d.expense),
          borderColor: '#23845B',
          backgroundColor: 'rgba(35, 132, 91, 0.08)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#23845B',
          pointBorderWidth: 2,
        },
      ],
    };
  }, [monthlyData]);

  const summary = overviewData?.summary;
  const mom = overviewData?.momComparison;
  const health = overviewData?.financialHealth;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <LoadingSkeleton rows={4} type="card" />
        <LoadingSkeleton rows={5} type="table" />
      </div>
    );
  }

  return (
    <div className="overview-page">
      {/* Top action bar: Date Filter & Record Transaction */}
      <div className="overview-action-bar">
        <div className="filter-pill-group">
          <Calendar size={15} color="var(--text-muted)" />
          <button
            className={`filter-pill ${dateFilter === 'all' ? 'active' : ''}`}
            onClick={() => setDateFilter('all')}
          >
            All Time
          </button>
          <button
            className={`filter-pill ${dateFilter === 'thisMonth' ? 'active' : ''}`}
            onClick={() => setDateFilter('thisMonth')}
          >
            This Month
          </button>
          <button
            className={`filter-pill ${dateFilter === '30days' ? 'active' : ''}`}
            onClick={() => setDateFilter('30days')}
          >
            Past 30 Days
          </button>
        </div>

        {!isReadOnly ? (
          <button
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={16} />
            <span>Record Transaction</span>
          </button>
        ) : (
          <div className="read-only-banner">
            Read-only mode (data mutations disabled)
          </div>
        )}
      </div>

      {/* 4 Financial Summary Cards */}
      <div className="summary-cards-grid">
        {/* Total Balance */}
        <div className="pw-card summary-card">
          <div className="card-top-meta">
            <span className="card-title-label">Total Balance</span>
            <div className="card-icon-wrap" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}>
              <Wallet size={18} />
            </div>
          </div>
          <div className="card-primary-figure">
            {formatCurrency(summary?.totalBalance || 0)}
          </div>
          <div className="card-comparison">
            {mom?.balanceChangePct !== 0 && (
              <span className={`comp-badge ${mom?.balanceChangePct >= 0 ? 'pos' : 'neg'}`}>
                {mom?.balanceChangePct >= 0 ? `+${mom.balanceChangePct}%` : `${mom.balanceChangePct}%`}
              </span>
            )}
            <span className="comp-text">vs previous month</span>
          </div>
        </div>

        {/* Total Income */}
        <div className="pw-card summary-card">
          <div className="card-top-meta">
            <span className="card-title-label">Total Income</span>
            <div className="card-icon-wrap" style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="card-primary-figure" style={{ color: '#16A34A' }}>
            {formatCurrency(summary?.totalIncome || 0)}
          </div>
          <div className="card-comparison">
            {mom?.incomeChangePct !== 0 && (
              <span className={`comp-badge ${mom?.incomeChangePct >= 0 ? 'pos' : 'neg'}`}>
                {mom?.incomeChangePct >= 0 ? `+${mom.incomeChangePct}%` : `${mom.incomeChangePct}%`}
              </span>
            )}
            <span className="comp-text">vs previous month</span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="pw-card summary-card">
          <div className="card-top-meta">
            <span className="card-title-label">Total Expenses</span>
            <div className="card-icon-wrap" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="card-primary-figure" style={{ color: '#DC2626' }}>
            {formatCurrency(summary?.totalExpenses || 0)}
          </div>
          <div className="card-comparison">
            {mom?.expenseChangePct !== 0 && (
              <span className={`comp-badge ${mom?.expenseChangePct <= 0 ? 'pos' : 'neg'}`}>
                {mom?.expenseChangePct >= 0 ? `+${mom.expenseChangePct}%` : `${mom.expenseChangePct}%`}
              </span>
            )}
            <span className="comp-text">vs previous month</span>
          </div>
        </div>

        {/* Savings Rate */}
        <div className="pw-card summary-card">
          <div className="card-top-meta">
            <span className="card-title-label">Savings Rate</span>
            <div className="card-icon-wrap" style={{ backgroundColor: '#DBEAFE', color: '#2563EB' }}>
              <Percent size={18} />
            </div>
          </div>
          <div className="card-primary-figure">
            {summary?.savingsRate || 0}%
          </div>
          <div className="card-comparison">
            <span className="comp-text">of earnings retained</span>
          </div>
        </div>
      </div>

      {/* Financial Health Indicator & Smart Spending Insights */}
      <div className="health-insights-grid">
        {/* Financial Health Indicator */}
        <div className="pw-card health-indicator-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Financial Health Score
            </h3>
            <span
              className="health-status-badge"
              style={{
                backgroundColor: `${health?.color}18`,
                color: health?.color,
                borderColor: `${health?.color}40`,
              }}
            >
              {health?.status}
            </span>
          </div>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
            {health?.explanation}
          </p>
          <div className="health-progress-bar-bg">
            <div
              className="health-progress-bar-fill"
              style={{
                width: `${health?.scorePercentage || 0}%`,
                backgroundColor: health?.color,
              }}
            ></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>&lt;15% Critical</span>
            <span>15-30% Moderate</span>
            <span>&gt;30% Healthy</span>
          </div>
        </div>

        {/* Smart Spending Insights Box */}
        <div className="pw-card insights-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Sparkles size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Smart Spending Insights
            </h3>
          </div>
          <div className="insights-list">
            {insights.map((insight) => (
              <div key={insight.id} className={`insight-row insight-${insight.type}`}>
                <div className="insight-bullet"></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {insight.title}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    {insight.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts Grid */}
      <div className="dashboard-charts-grid">
        {/* Income vs Expenses Bar Chart */}
        <div className="pw-card chart-card">
          <h3 className="chart-title">Income vs Expenses (Last 6 Months)</h3>
          <div className="chart-canvas-wrapper">
            <Bar
              data={barChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top', labels: { boxWidth: 12, font: { family: 'inherit' } } },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (val) => `₹${val.toLocaleString('en-IN')}`,
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Category Distribution Doughnut */}
        <div className="pw-card chart-card">
          <h3 className="chart-title">Expense Distribution by Category</h3>
          <div className="chart-canvas-wrapper doughnut-wrapper">
            {categoryData.length > 0 ? (
              <Doughnut
                data={doughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'right', labels: { boxWidth: 10, font: { size: 11, family: 'inherit' } } },
                  },
                  cutout: '65%',
                }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                No expenses logged in this range.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Six Month Spending Trend Line Chart */}
      <div className="pw-card chart-card" style={{ marginBottom: '28px' }}>
        <h3 className="chart-title">Six-Month Spending Trend</h3>
        <div className="chart-canvas-wrapper" style={{ height: '240px' }}>
          <Line
            data={trendLineData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    callback: (val) => `₹${val.toLocaleString('en-IN')}`,
                  },
                },
              },
            }}
          />
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="pw-card recent-txns-card">
        <div className="recent-txns-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Recent Transactions
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Latest activity logged across accounts</span>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/transactions')}
            style={{ fontSize: '13px' }}
          >
            <span>View All</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No transactions found. Click 'Record Transaction' to create one.
          </div>
        ) : (
          <div className="recent-txns-table-wrap">
            <table className="recent-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className="txn-title-text">{t.title}</div>
                      {t.payment_method && <div className="txn-meta-sub">{t.payment_method}</div>}
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
                    <td>
                      <span className={`badge badge-${t.type}`}>
                        {t.type}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      <span style={{ color: t.type === 'income' ? '#16A34A' : '#DC2626' }}>
                        {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchDashboardData}
      />
    </div>
  );
}

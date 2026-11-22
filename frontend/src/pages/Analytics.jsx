import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut, Line, Bar } from 'react-chartjs-2';
import { apiFetch } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import LoadingSkeleton from '../components/LoadingSkeleton';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [categoryType, setCategoryType] = useState('expense'); // 'expense' or 'income'

  const [yearlyData, setYearlyData] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      try {
        const [yearlyRes, catRes, monthRes] = await Promise.all([
          apiFetch(`/analytics/trends?year=${selectedYear}`),
          apiFetch(`/analytics/categories?type=${categoryType}`),
          apiFetch('/analytics/monthly?months=12'),
        ]);

        if (yearlyRes.success) setYearlyData(yearlyRes.data);
        if (catRes.success) setCategoryData(catRes.data || []);
        if (monthRes.success) setMonthlyData(monthRes.data || []);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, [selectedYear, categoryType]);

  // 1. Doughnut Chart: Expense / Income Category Distribution
  const doughnutChart = useMemo(() => {
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

  // 2. Line Chart: Monthly Income and Expense Trends
  const trendLineChart = useMemo(() => {
    return {
      labels: monthlyData.map((m) => m.monthLabel),
      datasets: [
        {
          label: 'Income Trend',
          data: monthlyData.map((m) => m.income),
          borderColor: '#23845B',
          backgroundColor: 'rgba(35, 132, 91, 0.05)',
          fill: true,
          tension: 0.35,
        },
        {
          label: 'Expense Trend',
          data: monthlyData.map((m) => m.expense),
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
          fill: true,
          tension: 0.35,
        },
      ],
    };
  }, [monthlyData]);

  // 3. Bar Chart: Income versus Expenses comparison
  const comparisonBarChart = useMemo(() => {
    return {
      labels: monthlyData.map((m) => m.monthLabel),
      datasets: [
        {
          label: 'Total Inflow',
          data: monthlyData.map((m) => m.income),
          backgroundColor: '#23845B',
          borderRadius: 4,
        },
        {
          label: 'Total Outflow',
          data: monthlyData.map((m) => m.expense),
          backgroundColor: '#E57373',
          borderRadius: 4,
        },
      ],
    };
  }, [monthlyData]);

  // Highest spending category
  const highestCategory = categoryData.length > 0 ? categoryData[0] : null;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <LoadingSkeleton rows={4} type="card" />
        <LoadingSkeleton rows={6} type="table" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Filter and Highlights */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Financial Performance & Trends
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            In-depth analysis of expenditures, recurring categories, and annual cash flow.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <select
            className="form-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            style={{ width: '130px' }}
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>
      </div>

      {/* Analytical KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        <div className="pw-card">
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>ANNUAL INFLOW</span>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#16A34A', marginTop: '6px' }}>
            {formatCurrency(yearlyData?.totalIncome || 0)}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Across {selectedYear}</span>
        </div>

        <div className="pw-card">
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>ANNUAL OUTFLOW</span>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#DC2626', marginTop: '6px' }}>
            {formatCurrency(yearlyData?.totalExpenses || 0)}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Across {selectedYear}</span>
        </div>

        <div className="pw-card">
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>AVG MONTHLY SPEND</span>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '6px' }}>
            {formatCurrency(yearlyData?.avgMonthlyExpense || 0)}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Per active month</span>
        </div>

        <div className="pw-card">
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>TOP EXPENSE DRIVER</span>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '6px' }}>
            {highestCategory ? highestCategory.name : 'N/A'}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {highestCategory ? `${highestCategory.percentage}% of total expenses` : 'No expenses recorded'}
          </span>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
        {/* Line Chart: Monthly Income and Expense Trends */}
        <div className="pw-card">
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
            Monthly Income and Expense Trajectory
          </h3>
          <div style={{ height: '280px' }}>
            <Line
              data={trendLineChart}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { callback: (v) => `₹${v.toLocaleString('en-IN')}` },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Doughnut Chart: Category Distribution */}
        <div className="pw-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Category Distribution
            </h3>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className={`filter-pill ${categoryType === 'expense' ? 'active' : ''}`}
                onClick={() => setCategoryType('expense')}
                style={{ fontSize: '12px', padding: '3px 8px' }}
              >
                Expense
              </button>
              <button
                className={`filter-pill ${categoryType === 'income' ? 'active' : ''}`}
                onClick={() => setCategoryType('income')}
                style={{ fontSize: '12px', padding: '3px 8px' }}
              >
                Income
              </button>
            </div>
          </div>
          <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {categoryData.length > 0 ? (
              <Doughnut
                data={doughnutChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '60%',
                  plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11, family: 'inherit' } } },
                  },
                }}
              />
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>No category data available.</span>
            )}
          </div>
        </div>
      </div>

      {/* Bar Chart: Side by side monthly bar comparison */}
      <div className="pw-card">
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
          Monthly Cash Inflow vs Outflow Comparison
        </h3>
        <div style={{ height: '300px' }}>
          <Bar
            data={comparisonBarChart}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: { callback: (v) => `₹${v.toLocaleString('en-IN')}` },
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}

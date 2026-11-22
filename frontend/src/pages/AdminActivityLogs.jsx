import React, { useState, useEffect } from 'react';
import { ShieldCheck, History, Filter } from 'lucide-react';
import { apiFetch } from '../services/api';
import { formatDate } from '../utils/formatters';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function AdminActivityLogs() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        const res = await apiFetch('/admin/activity-logs');
        if (res.success && res.data) {
          setLogs(res.data.logs || []);
        }
      } catch (err) {
        console.error('Failed to load activity logs:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, []);

  if (loading) {
    return <LoadingSkeleton rows={8} type="table" />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
          System Audit & Activity Logs
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Immutable administrative activity records for governance, security audits, and compliance.
        </p>
      </div>

      <div className="pw-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Administrator</th>
                <th>Action</th>
                <th>Target Type</th>
                <th>Details</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: '12.5px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {formatDate(log.created_at)}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{log.admin_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{log.admin_email}</div>
                  </td>
                  <td>
                    <span className="badge badge-neutral" style={{ fontWeight: 700, letterSpacing: '0.4px' }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px', textTransform: 'capitalize' }}>
                    {log.target_type}
                  </td>
                  <td style={{ fontSize: '12.5px', color: 'var(--text-secondary)', maxWidth: '320px' }}>
                    <code>{typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}</code>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {log.ip_address || '127.0.0.1'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

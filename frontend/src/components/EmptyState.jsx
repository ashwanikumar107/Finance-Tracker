import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({
  title = 'No records found',
  description = 'Get started by creating your first record to begin tracking.',
  actionLabel,
  onAction,
  icon: Icon = Inbox,
}) {
  return (
    <div style={{
      padding: '48px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      backgroundColor: 'var(--bg-surface)',
      border: '1px dashed var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      margin: '16px 0',
    }}>
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        backgroundColor: 'var(--bg-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px',
        color: 'var(--text-muted)'
      }}>
        <Icon size={26} />
      </div>

      <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
        {title}
      </h3>

      <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', maxWidth: '400px', marginBottom: actionLabel ? '20px' : '0', lineHeight: 1.5 }}>
        {description}
      </p>

      {actionLabel && onAction && (
        <button type="button" className="btn btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

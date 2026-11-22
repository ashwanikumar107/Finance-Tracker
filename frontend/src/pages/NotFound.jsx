import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      backgroundColor: 'var(--bg-primary)',
      textAlign: 'center',
    }}>
      <div className="pw-card" style={{ maxWidth: '440px', padding: '40px 32px' }}>
        <div style={{
          fontSize: '64px',
          fontWeight: 800,
          color: 'var(--accent-primary)',
          letterSpacing: '-2px',
          lineHeight: 1,
          marginBottom: '12px'
        }}>
          404
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Page Not Found
        </h2>

        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
          The requested financial resource or endpoint does not exist or has been relocated.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <Link to="/overview" className="btn btn-primary">
            <Home size={15} />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

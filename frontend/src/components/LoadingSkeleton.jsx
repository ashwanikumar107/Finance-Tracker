import React from 'react';
import './LoadingSkeleton.css';

export default function LoadingSkeleton({ rows = 4, type = 'card' }) {
  if (type === 'table') {
    return (
      <div className="skeleton-table">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton-row">
            <div className="skeleton-cell w-30"></div>
            <div className="skeleton-cell w-20"></div>
            <div className="skeleton-cell w-15"></div>
            <div className="skeleton-cell w-20"></div>
            <div className="skeleton-cell w-15"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="skeleton-grid">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-line w-40"></div>
          <div className="skeleton-line w-70 h-lg"></div>
          <div className="skeleton-line w-50"></div>
        </div>
      ))}
    </div>
  );
}

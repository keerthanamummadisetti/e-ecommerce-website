import React from 'react';

export default function Footer() {
  return (
    <footer style={{ marginTop: 'auto', borderTop: '1px solid var(--border-glass)', padding: '40px 0 24px', background: 'rgba(9, 10, 16, 0.5)' }}>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="#" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Security Policy</a>
          <a href="#" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Terms of Service</a>
          <a href="#" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>API Documentation</a>
          <a href="#" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Support Office</a>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
          &copy; {new Date().getFullYear()} ShopNow Platform. All Rights Reserved. Prepared for trainee evaluation capstone project.
        </p>
      </div>
    </footer>
  );
}

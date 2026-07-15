import React from 'react';

export default function Footer() {
  return (
    <footer style={{ 
      marginTop: 'auto', 
      borderTop: '1px solid var(--border-glass)', 
      padding: '60px 0 32px', 
      background: 'rgba(9, 10, 16, 0.85)',
      backdropFilter: 'blur(10px)'
    }}>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        {/* Footer Top Links */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '32px', 
          textAlign: 'left' 
        }}>
          {/* Col 1: About */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--secondary)' }}>ShopNow</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              A high-performance, resilient, event-driven e-commerce platform built for testing distributed cloud architectures and automated CI/CD microservices.
            </p>
          </div>

          {/* Col 2: Services */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h5 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resources</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a href="#" style={{ fontSize: '13px', color: 'var(--text-secondary)', transition: 'var(--transition-smooth)' }} onMouseEnter={(e) => e.target.style.color = 'var(--primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}>API Documentation</a>
              <a href="#" style={{ fontSize: '13px', color: 'var(--text-secondary)', transition: 'var(--transition-smooth)' }} onMouseEnter={(e) => e.target.style.color = 'var(--primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}>System Status</a>
              <a href="#" style={{ fontSize: '13px', color: 'var(--text-secondary)', transition: 'var(--transition-smooth)' }} onMouseEnter={(e) => e.target.style.color = 'var(--primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}>Developer SDKs</a>
            </div>
          </div>

          {/* Col 3: Legal & Policies */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h5 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Legal & Trust</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a href="#" style={{ fontSize: '13px', color: 'var(--text-secondary)', transition: 'var(--transition-smooth)' }} onMouseEnter={(e) => e.target.style.color = 'var(--primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}>Security Policy</a>
              <a href="#" style={{ fontSize: '13px', color: 'var(--text-secondary)', transition: 'var(--transition-smooth)' }} onMouseEnter={(e) => e.target.style.color = 'var(--primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}>Terms of Service</a>
              <a href="#" style={{ fontSize: '13px', color: 'var(--text-secondary)', transition: 'var(--transition-smooth)' }} onMouseEnter={(e) => e.target.style.color = 'var(--primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}>Privacy Policy</a>
            </div>
          </div>

          {/* Col 4: Corporate */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h5 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Corporate</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a href="#" style={{ fontSize: '13px', color: 'var(--text-secondary)', transition: 'var(--transition-smooth)' }} onMouseEnter={(e) => e.target.style.color = 'var(--primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}>Support Office</a>
              <a href="#" style={{ fontSize: '13px', color: 'var(--text-secondary)', transition: 'var(--transition-smooth)' }} onMouseEnter={(e) => e.target.style.color = 'var(--primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}>About Platform</a>
              <a href="#" style={{ fontSize: '13px', color: 'var(--text-secondary)', transition: 'var(--transition-smooth)' }} onMouseEnter={(e) => e.target.style.color = 'var(--primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}>AWS Cloud Staging</a>
            </div>
          </div>
        </div>

        {/* Footer Bottom copyright and metadata */}
        <div style={{ 
          borderTop: '1px solid var(--border-glass)', 
          paddingTop: '24px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '16px',
          fontSize: '12px',
          color: 'var(--text-muted)'
        }}>
          <p>&copy; {new Date().getFullYear()} ShopNow Platform. All Rights Reserved. Prepared for trainee evaluation capstone project.</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>AWS EC2</span> • <span>Docker</span> • <span>Nginx ALB</span> • <span>Kafka Saga</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

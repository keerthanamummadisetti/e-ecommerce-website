import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ShoppingBag, Search, User, Bell, LogOut, LayoutDashboard, Activity } from 'lucide-react';

export default function Header() {
  const { user, cart, notifications, logoutUser, fetchProducts, systemLogs } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts(searchQuery);
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const totalCartCount = cart.items ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
  const unreadNotifCount = notifications ? notifications.filter(n => !n.read).length : 0;

  return (
    <header className="glass-header">
      <div className="container header-container">
        
        {/* Logo */}
        <Link to="/" className="header-logo-link">
          <span className="header-logo-text">
            ShopNow
          </span>
          <span className="badge badge-primary" style={{ fontSize: '10px', padding: '2px 6px' }}>v1.0</span>
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="header-search-form">
          <input
            type="text"
            placeholder="Search products, brands, categories..."
            className="glass-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '44px', height: '40px' }}
          />
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
        </form>

        {/* Navigation Actions */}
        <nav className="header-nav-actions">
          {/* System logs toggle */}
          <button 
            onClick={() => setShowLogs(!showLogs)} 
            className="btn btn-secondary" 
            style={{ padding: '8px 12px', height: '40px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="View Live Microservice Logs"
          >
            <Activity size={16} />
            <span style={{ display: 'none', md: 'inline' }}>Logs</span>
            {systemLogs.length > 0 && (
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--secondary)' }}></span>
            )}
          </button>

          {/* Cart */}
          <Link to="/cart" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', transition: 'var(--transition-smooth)' }}>
            <ShoppingBag size={20} />
            {totalCartCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: 'var(--primary)',
                color: 'white',
                fontSize: '11px',
                fontWeight: 700,
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {totalCartCount}
              </span>
            )}
          </Link>

          {/* Notifications */}
          {user && (
            <Link to="/orders" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)' }}>
              <Bell size={20} />
              {unreadNotifCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  background: 'var(--danger)',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%'
                }} />
              )}
            </Link>
          )}

          {/* User Account / Profile */}
          {user ? (
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="btn btn-secondary" 
                style={{ height: '40px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'capitalize' }}
              >
                <User size={16} />
                <span>{user.firstName || 'User'}</span>
              </button>

              {showProfileMenu && (
                <div className="glass-card" style={{
                  position: 'absolute',
                  right: 0,
                  top: '48px',
                  width: '220px',
                  padding: '12px',
                  zIndex: 200,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-glass)', marginBottom: '4px' }}>
                    <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{user.firstName} {user.lastName}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user.email}</p>
                  </div>

                  {user.role === 'ADMIN' && (
                    <Link 
                      to="/admin" 
                      onClick={() => setShowProfileMenu(false)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '6px', transition: 'var(--transition-smooth)' }}
                      className="btn-secondary"
                    >
                      <LayoutDashboard size={16} />
                      <span style={{ fontSize: '14px' }}>Admin Dashboard</span>
                    </Link>
                  )}

                  <button 
                    onClick={() => {
                      logoutUser();
                      setShowProfileMenu(false);
                      navigate('/');
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '6px', color: 'var(--danger)', textAlign: 'left', cursor: 'pointer', width: '100%' }}
                    className="btn-secondary"
                  >
                    <LogOut size={16} />
                    <span style={{ fontSize: '14px' }}>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary" style={{ height: '40px', padding: '0 20px', fontSize: '14px' }}>
              Sign In
            </Link>
          )}
        </nav>
      </div>

      {/* System Logs Overlay panel */}
      {showLogs && (
        <div style={{
          position: 'fixed',
          right: '24px',
          bottom: '24px',
          width: '450px',
          maxHeight: '400px',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column'
        }} className="glass-card fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={18} style={{ color: 'var(--secondary)' }} /> ShopNow Microservice Logs</h4>
            <button onClick={() => setShowLogs(false)} style={{ cursor: 'pointer', fontSize: '14px', color: 'var(--text-muted)' }}>Close</button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
            {systemLogs.length === 0 ? (
              <p style={{ fontStyle: 'italic', fontSize: '13px', textAlign: 'center', margin: '20px 0' }}>No activities logged yet. Interactions will appear here.</p>
            ) : (
              systemLogs.map((log, i) => (
                <div key={i} style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', fontSize: '12px', borderLeft: '3px solid var(--primary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--secondary)' }}>{log.service}</span>
                    <span>{log.timestamp}</span>
                  </div>
                  <div style={{ fontFamily: 'monospace', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{log.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </header>
  );
}

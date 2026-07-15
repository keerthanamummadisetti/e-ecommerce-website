import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { HelpCircle, Package, MapPin, CheckCircle, ArrowRight } from 'lucide-react';

export default function Orders() {
  const { user, token, addLog } = useApp();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);
    addLog(`Fetching order history for user ${user.userId}...`, 'MS-03 Order Management');

    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/orders/user/${user.userId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
        addLog(`Loaded ${data.length} orders.`, 'MS-03 Order Management');
      } else {
        throw new Error();
      }
    } catch (err) {
      addLog(`Failed to fetch orders from server, loading local storage orders history fallback.`, 'MS-03 Order Management');
      
      // Fallback: Check if there's any active simulated orders
      const savedOrders = localStorage.getItem(`orders_${user.userId}`);
      if (savedOrders) {
        setOrders(JSON.parse(savedOrders));
      } else {
        // Mock order history
        const mockOrder = {
          id: 'ord_simulation123',
          userId: user.userId,
          status: 'CONFIRMED',
          totalAmount: 1249.98,
          shippingAddress: '456 Gateway Ave, Staging District',
          created_at: new Date(Date.now() - 86400000).toLocaleString(),
          items: [
            { productId: 'prod-001', name: 'SuperPhone Pro 2026', price: 999.99, quantity: 1 },
            { productId: 'prod-002', name: 'Quantum Sound Max Headphones', price: 249.99, quantity: 1 }
          ]
        };
        setOrders([mockOrder]);
        localStorage.setItem(`orders_${user.userId}`, JSON.stringify([mockOrder]));
      }
    } finally {
      setLoading(false);
    }
  };

  // Periodically refresh tracking details
  useEffect(() => {
    const timer = setInterval(() => {
      if (user) {
        const savedOrders = localStorage.getItem(`orders_${user.userId}`);
        if (savedOrders) {
          setOrders(JSON.parse(savedOrders));
        }
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [user]);

  if (!user) {
    return (
      <div className="container" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <h2>Login Required</h2>
        <p style={{ margin: '16px 0 24px' }}>Please log in to view and track your purchase history.</p>
        <Link to="/login" className="btn btn-primary">Sign In</Link>
      </div>
    );
  }

  const getStatusStep = (status) => {
    switch (status) {
      case 'PENDING': return 1;
      case 'CONFIRMED': return 2;
      case 'SHIPPED': return 3;
      case 'DELIVERED': return 4;
      default: return 1;
    }
  };

  return (
    <div className="container" style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '32px', textAlign: 'left' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0 }}>Your Orders & Tracking</h1>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-card shimmer" style={{ height: '200px' }} />
        </div>
      ) : orders.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <HelpCircle size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3>No orders placed yet</h3>
          <p style={{ marginTop: '8px' }}>Your purchase history will appear here once you place orders.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="fade-in">
          {orders.map((order) => {
            const currentStep = getStatusStep(order.status);
            return (
              <div key={order.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Header card info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ORDER NUMBER</span>
                    <h4 style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--secondary)' }}>{order.id}</h4>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>PLACED ON</span>
                    <h4 style={{ fontSize: '14px', fontWeight: 600 }}>{order.created_at || new Date().toLocaleDateString()}</h4>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>TOTAL VALUE</span>
                    <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>₹{order.totalAmount.toLocaleString('en-IN')}</h4>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>SHIPPING ADDRESS</span>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {order.shippingAddress}</h4>
                  </div>
                </div>

                {/* Status Stepper Tracker */}
                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', margin: '20px 0', padding: '0 20px', flexWrap: 'wrap', gap: '16px' }}>
                  {/* Background progress line */}
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '40px',
                    right: '40px',
                    height: '4px',
                    background: 'rgba(255,255,255,0.05)',
                    zIndex: 0,
                    display: 'none',
                    md: 'block'
                  }} />
                  {/* Active progress line */}
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '40px',
                    width: `${((currentStep - 1) / 3) * 100}%`,
                    height: '4px',
                    background: 'var(--primary)',
                    zIndex: 0,
                    transition: 'var(--transition-smooth)',
                    display: 'none',
                    md: 'block'
                  }} />

                  {/* Steps */}
                  {[
                    { label: 'Placed', desc: 'Order Pending', statusKey: 'PENDING' },
                    { label: 'Confirmed', desc: 'Stock Reserved', statusKey: 'CONFIRMED' },
                    { label: 'Shipped', desc: 'In Transit', statusKey: 'SHIPPED' },
                    { label: 'Delivered', desc: 'Arrived Home', statusKey: 'DELIVERED' }
                  ].map((s, idx) => {
                    const stepNum = idx + 1;
                    const isActive = stepNum <= currentStep;
                    const isCurrent = stepNum === currentStep;

                    return (
                      <div key={idx} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        zIndex: 1,
                        flex: '1 1 120px'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: isActive ? 'var(--primary)' : 'rgba(30, 32, 54, 0.8)',
                          border: isCurrent ? '2px solid var(--secondary)' : '1px solid var(--border-glass)',
                          boxShadow: isCurrent ? '0 0 15px var(--primary-glow)' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isActive ? 'white' : 'var(--text-muted)',
                          fontWeight: 700,
                          transition: 'var(--transition-smooth)'
                        }}>
                          {isActive ? <CheckCircle size={18} /> : stepNum}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ fontWeight: 600, fontSize: '13px', color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}>{s.label}</p>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Items Purchased in this order */}
                <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '16px' }}>
                  <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Items Details</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {order.items?.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
                        <span style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <Package size={16} style={{ color: 'var(--secondary)' }} />
                          <span style={{ fontWeight: 600 }}>{item.name}</span>
                          <span style={{ color: 'var(--text-muted)' }}>x{item.quantity}</span>
                        </span>
                        <span style={{ fontWeight: 700 }}>₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

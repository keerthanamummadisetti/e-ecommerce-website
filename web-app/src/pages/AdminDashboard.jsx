import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, PlusCircle, RefreshCw, BarChart2, Edit3, Trash2, ArrowUpRight, TrendingUp, AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
  const { user, token, products, addLog, setProducts } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('analytics'); // analytics, products, inventory, orders
  
  // Product Form states
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('electronics');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodBrand, setProdBrand] = useState('');
  const [prodColor, setProdColor] = useState('');
  const [submittingProduct, setSubmittingProduct] = useState(false);

  // Orders Admin List state
  const [adminOrders, setAdminOrders] = useState([]);
  
  // Mock Analytics state
  const [analyticsData, setAnalyticsData] = useState({
    totalSales: 24590.80,
    totalOrders: 148,
    conversionRate: 68.5,
    lowStockCount: 2
  });

  useEffect(() => {
    // Redirect non-admins
    if (!user || user.role !== 'ADMIN') {
      navigate('/');
      return;
    }
    loadOrders();
    loadAnalytics();
  }, [user]);

  const loadOrders = () => {
    // Gather all orders across users in simulated storage
    const allOrders = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('orders_')) {
        const userOrders = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(userOrders)) {
          allOrders.push(...userOrders);
        }
      }
    }
    
    // Default mock orders if none exist
    if (allOrders.length === 0) {
      const defaultMock = {
        id: 'ord_simulation123',
        userId: user?.userId || 'usr_1',
        status: 'CONFIRMED',
        totalAmount: 1249.98,
        shippingAddress: '456 Gateway Ave, Staging District',
        created_at: new Date(Date.now() - 86400000).toLocaleString(),
        items: [
          { productId: 'prod-001', name: 'SuperPhone Pro 2026', price: 999.99, quantity: 1 },
          { productId: 'prod-002', name: 'Quantum Sound Max Headphones', price: 249.99, quantity: 1 }
        ]
      };
      setAdminOrders([defaultMock]);
      if (user) {
        localStorage.setItem(`orders_${user.userId}`, JSON.stringify([defaultMock]));
      }
    } else {
      setAdminOrders(allOrders);
    }
  };

  const loadAnalytics = async () => {
    try {
      addLog('Fetching business metrics funnel analysis...', 'MS-10 Analytics Service');
      const res = await fetch('/analytics/funnel');
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData({
          totalSales: data.totalRevenue || 24590.80,
          totalOrders: data.orderCreated || 148,
          conversionRate: data.checkoutToOrderRate || 68.5,
          lowStockCount: products.filter(p => p.stock <= 5).length
        });
      }
    } catch (err) {
      addLog('Analytics service offline, using mock reporting metrics.', 'MS-10 Analytics Service');
    }
  };

  const handleUpdateOrderStatus = (orderId, newStatus) => {
    addLog(`Updating order ${orderId} status to ${newStatus}`, 'MS-03 Order Management');
    
    // Update state
    const updatedOrders = adminOrders.map(order => {
      if (order.id === orderId) {
        const updated = { ...order, status: newStatus };
        // Sync back to specific user orders list in localStorage
        const userKey = `orders_${order.userId}`;
        const userOrders = JSON.parse(localStorage.getItem(userKey)) || [];
        const updatedUserOrders = userOrders.map(o => o.id === orderId ? updated : o);
        localStorage.setItem(userKey, JSON.stringify(updatedUserOrders));
        
        // Emit events simulation
        if (newStatus === 'SHIPPED') {
          addLog(`Emitted [order.shipped] event to Notification Service.`, 'MS-03 Order Management');
        } else if (newStatus === 'DELIVERED') {
          addLog(`Emitted order delivery completed. Ingested ClickHouse event.`, 'MS-10 Analytics Service');
        }
        
        return updated;
      }
      return order;
    });

    setAdminOrders(updatedOrders);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setSubmittingProduct(true);
    addLog(`Adding product "${prodName}" to catalogue...`, 'MS-02 Product Catalog');

    const newProduct = {
      productId: `prod-${Math.random().toString(36).substring(2, 7)}`,
      name: prodName,
      category: prodCategory,
      price: parseFloat(prodPrice),
      stock: parseInt(prodStock),
      description: prodDescription,
      attributes: {
        brand: prodBrand || 'Generic',
        color: prodColor || 'Default'
      },
      variants: [
        {
          sku: `${prodBrand.substring(0, 3).toUpperCase()}-${prodColor.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`,
          size: 'Standard',
          stock: parseInt(prodStock)
        }
      ],
      image: `https://picsum.photos/seed/${prodName}/600/400`,
      isFeatured: true
    };

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      const res = await fetch('/products', {
        method: 'POST',
        headers,
        body: JSON.stringify(newProduct)
      });
      if (res.ok) {
        addLog(`Product "${prodName}" catalog creation confirmed by database.`, 'MS-02 Product Catalog');
        addLog(`Kafka event product.created dispatched. Elasticsearch search index updated.`, 'MS-08 Search Service');
        setProducts(prev => [newProduct, ...prev]);
        resetForm();
        setActiveTab('products');
      } else {
        throw new Error();
      }
    } catch (err) {
      addLog(`Failed to post new product to catalog endpoint. Mocking insertion locally.`, 'MS-02 Product Catalog');
      setProducts(prev => [newProduct, ...prev]);
      resetForm();
      setActiveTab('products');
    } finally {
      setSubmittingProduct(false);
    }
  };

  const resetForm = () => {
    setProdName('');
    setProdPrice('');
    setProdStock('');
    setProdDescription('');
    setProdBrand('');
    setProdColor('');
  };

  const handleRestock = async (productId, currentStock) => {
    const newQty = currentStock + 50;
    addLog(`Restocking product ${productId} stock from ${currentStock} to ${newQty}`, 'MS-05 Inventory Service');
    
    // Optimistic Update
    const updatedProducts = products.map(p => {
      if (p.productId === productId || p.id === productId) {
        return { ...p, stock: newQty };
      }
      return p;
    });
    setProducts(updatedProducts);

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      // REST API call to bulk inventory setup
      await fetch(`/inventory/bulk-update`, {
        method: 'POST',
        headers,
        body: JSON.stringify([{ productId, quantity: newQty, warehouseId: 'WH-MUMBAI-01', threshold: 5 }])
      });
      addLog(`Redis lock acquired, stock updated on database.`, 'MS-05 Inventory Service');
    } catch (err) {
      addLog(`Inventory server sync offline. Kept local stock simulation.`, 'MS-05 Inventory Service');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    addLog(`Deleting product ${productId} from store catalog...`, 'MS-02 Product Catalog');
    
    setProducts(prev => prev.filter(p => p.productId !== productId && p.id !== productId));
    
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      await fetch(`/products/${productId}`, {
        method: 'DELETE',
        headers
      });
      addLog(`Product deletion confirmed. Dispatched catalog.updated event.`, 'MS-02 Product Catalog');
    } catch (err) {
      addLog(`Catalogue backend delete failed. Performed local purge.`, 'MS-02 Product Catalog');
    }
  };

  const lowStockProducts = products.filter(p => p.stock <= 5);

  return (
    <div className="container" style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '32px', textAlign: 'left' }}>
      
      {/* Dashboard Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <LayoutDashboard style={{ color: 'var(--primary)' }} /> ShopNow Admin Portal
          </h1>
          <p style={{ marginTop: '4px' }}>Welcome Admin. Monitor systems, product catalog, and orders queue.</p>
        </div>
        <button onClick={() => { loadOrders(); loadAnalytics(); }} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={16} /> Sync Services
        </button>
      </div>

      {/* Tabs Selectors */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
        {[
          { id: 'analytics', label: 'Analytics Insights', icon: BarChart2 },
          { id: 'products', label: 'Product Catalogue', icon: ShoppingBag },
          { id: 'inventory', label: 'Inventory & Stocks', icon: AlertTriangle },
          { id: 'orders', label: 'Customer Orders', icon: Edit3 }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)'
              }}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents: Analytics */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="fade-in">
          {/* Card stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>TOTAL REVENUE</span>
                <TrendingUp size={18} style={{ color: 'var(--success)' }} />
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: 800 }}>${analyticsData.totalSales.toFixed(2)}</h2>
              <span style={{ fontSize: '11px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                <ArrowUpRight size={12} /> +12.4% vs last week
              </span>
            </div>
            
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>COMPLETED ORDERS</span>
              <h2 style={{ fontSize: '28px', fontWeight: 800 }}>{analyticsData.totalOrders}</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Processed via Kafka cluster</span>
            </div>

            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>FUNNEL CONVERSION</span>
              <h2 style={{ fontSize: '28px', fontWeight: 800 }}>{analyticsData.conversionRate}%</h2>
              <span style={{ fontSize: '11px', color: 'var(--secondary)' }}>Cart checkout-to-order completion</span>
            </div>

            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: lowStockProducts.length > 0 ? '3px solid var(--danger)' : '1px solid var(--border-glass)' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>CRITICAL LOW STOCKS</span>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: lowStockProducts.length > 0 ? 'var(--danger)' : 'var(--success)' }}>
                {lowStockProducts.length}
              </h2>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Products stock levels &le; 5</span>
            </div>
          </div>

          {/* Interactive Flow Diagram Chart */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Real-Time Purchase Funnel Rate (MS-10 Analytics)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '20px 0' }}>
              {/* Stepper Funnel */}
              {[
                { name: '1. Browse Products Catalogue', count: 1200, percentage: 100, color: 'var(--secondary)' },
                { name: '2. Add to Shopping Cart', count: 500, percentage: 41.6, color: 'var(--primary)' },
                { name: '3. Cart Checkout Initiated', count: 200, percentage: 16.6, color: 'var(--warning)' },
                { name: '4. Orders Confirmation', count: 148, percentage: 12.3, color: 'var(--success)' }
              ].map((funnel, index) => (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                    <span>{funnel.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{funnel.count} sessions ({funnel.percentage}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${funnel.percentage}%`, height: '100%', background: funnel.color, borderRadius: '4px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab Contents: Catalogue Products Management */}
      {activeTab === 'products' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2.5fr', gap: '32px', alignItems: 'start' }} className="fade-in">
          {/* Left Form: Add product */}
          <div className="glass-card">
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><PlusCircle size={20} /> Add New Catalog Product</h3>
            <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Product Title</label>
                <input type="text" required placeholder="e.g. SmartWatch series 8" className="glass-input" value={prodName} onChange={(e) => setProdName(e.target.value)} />
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Category</label>
                  <select className="glass-input" value={prodCategory} onChange={(e) => setProdCategory(e.target.value)} style={{ background: 'var(--bg-dark)' }}>
                    <option value="electronics">Electronics</option>
                    <option value="apparel">Apparel</option>
                    <option value="accessories">Accessories</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Price ($ USD)</label>
                  <input type="number" step="0.01" required placeholder="19.99" className="glass-input" value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Brand Name</label>
                  <input type="text" placeholder="e.g. Apex" className="glass-input" value={prodBrand} onChange={(e) => setProdBrand(e.target.value)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Color</label>
                  <input type="text" placeholder="e.g. Crimson Red" className="glass-input" value={prodColor} onChange={(e) => setProdColor(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Warehouse Stock Quantity</label>
                <input type="number" required placeholder="100" className="glass-input" value={prodStock} onChange={(e) => setProdStock(e.target.value)} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Description</label>
                <textarea rows={3} required placeholder="Product specifications details..." className="glass-input" value={prodDescription} onChange={(e) => setProdDescription(e.target.value)} />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }} disabled={submittingProduct}>
                {submittingProduct ? 'Creating Product...' : 'Add to Catalog'}
              </button>
            </form>
          </div>

          {/* Right Product Grid and listing */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Active Catalog Listings</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
              {products.map((prod) => (
                <div key={prod.productId || prod.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <img src={prod.image || `https://picsum.photos/seed/${prod.name}/100/100`} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }} />
                    <div style={{ textAlign: 'left' }}>
                      <h5 style={{ fontSize: '14px', fontWeight: 600 }}>{prod.name}</h5>
                      <span style={{ fontSize: '11px', color: 'var(--secondary)' }}>ID: <code style={{ fontSize: '10px' }}>{prod.productId || prod.id}</code></span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700 }}>${prod.price.toFixed(2)}</span>
                    <span style={{ fontSize: '13px', color: prod.stock <= 5 ? 'var(--danger)' : 'var(--text-muted)' }}>Stock: {prod.stock}</span>
                    <button 
                      onClick={() => handleDeleteProduct(prod.productId || prod.id)}
                      style={{ color: 'var(--danger)', padding: '6px', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab Contents: Inventory Alerts & Controls */}
      {activeTab === 'inventory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="fade-in">
          {lowStockProducts.length > 0 && (
            <div style={{ padding: '16px', background: 'rgba(239, 71, 111, 0.08)', border: '1px solid var(--danger)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--danger)' }}>
              <AlertTriangle size={24} />
              <div>
                <h4 style={{ fontWeight: 700, color: 'var(--danger)' }}>Low Stock Warning</h4>
                <p style={{ fontSize: '13px', color: 'var(--danger)' }}>{lowStockProducts.length} items have fallen below the stock threshold limit of 5. Restocking is required to prevent overselling.</p>
              </div>
            </div>
          )}

          <div className="glass-card">
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Inventory Stock List (MS-05 Warehouse locks)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {products.map((prod) => (
                <div key={prod.productId || prod.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '10px' }}>
                  <div style={{ textAlign: 'left' }}>
                    <h5 style={{ fontSize: '14px', fontWeight: 600 }}>{prod.name}</h5>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Category: {prod.category} | Warehouse: WH-MUMBAI-01</span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ 
                        fontSize: '14px', 
                        fontWeight: 700,
                        color: prod.stock === 0 ? 'var(--danger)' : prod.stock <= 5 ? 'var(--warning)' : 'var(--success)'
                      }}>
                        {prod.stock === 0 ? 'SOLD OUT' : `${prod.stock} Units Available`}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Threshold limit: 5</span>
                    </div>

                    <button 
                      onClick={() => handleRestock(prod.productId || prod.id, prod.stock)} 
                      className="btn btn-secondary" 
                      style={{ padding: '8px 12px', fontSize: '12px' }}
                    >
                      Restock +50
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab Contents: Customer Order Dispatcher */}
      {activeTab === 'orders' && (
        <div className="glass-card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Active Order Queue Dispatcher</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {adminOrders.length === 0 ? (
              <p style={{ fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>No orders currently in the system queue.</p>
            ) : (
              adminOrders.map((order) => (
                <div key={order.id} style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ORDER ID</span>
                      <h5 style={{ fontFamily: 'monospace', color: 'var(--secondary)' }}>{order.id}</h5>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>USER</span>
                      <p style={{ fontSize: '13px', fontWeight: 600 }}>{order.userId}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TOTAL VALUE</span>
                      <p style={{ fontSize: '14px', fontWeight: 700 }}>${order.totalAmount.toFixed(2)}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CURRENT STATE</span>
                      <div>
                        <span className={`badge ${
                          order.status === 'PENDING' ? 'badge-primary' :
                          order.status === 'CONFIRMED' ? 'badge-info' :
                          order.status === 'SHIPPED' ? 'badge-warning' : 'badge-success'
                        }`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for changing status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '10px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <strong>Items:</strong> {order.items?.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleUpdateOrderStatus(order.id, 'CONFIRMED')}
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        disabled={order.status !== 'PENDING'}
                      >
                        Confirm order
                      </button>
                      <button 
                        onClick={() => handleUpdateOrderStatus(order.id, 'SHIPPED')}
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        disabled={order.status !== 'CONFIRMED'}
                      >
                        Ship dispatch
                      </button>
                      <button 
                        onClick={() => handleUpdateOrderStatus(order.id, 'DELIVERED')}
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        disabled={order.status !== 'SHIPPED'}
                      >
                        Arrived home
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
}

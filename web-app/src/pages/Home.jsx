import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ShoppingCart, Star, Zap, Shield, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const { products, loadingProducts, addToCart, fetchProducts } = useApp();
  const [activeCategory, setActiveCategory] = useState('');
  const navigate = useNavigate();

  const categories = [
    { id: '', name: 'All Categories' },
    { id: 'electronics', name: 'Electronics' },
    { id: 'apparel', name: 'Apparel' },
    { id: 'accessories', name: 'Accessories' }
  ];

  const handleCategoryClick = (catId) => {
    setActiveCategory(catId);
    fetchProducts('', catId);
  };

  return (
    <div className="container" style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Hero Banner */}
      <div className="glass-card fade-in" style={{
        background: 'linear-gradient(135deg, rgba(157, 78, 221, 0.15) 0%, rgba(0, 180, 216, 0.1) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '48px',
        textAlign: 'left',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Floating gradient blur background particles */}
        <div style={{ position: 'absolute', right: '-50px', top: '-50px', width: '250px', height: '250px', borderRadius: '50%', background: 'var(--primary)', filter: 'blur(100px)', opacity: 0.3, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: '50%', bottom: '-100px', width: '200px', height: '200px', borderRadius: '50%', background: 'var(--secondary)', filter: 'blur(80px)', opacity: 0.2, pointerEvents: 'none' }} />

        <div style={{ maxWidth: '600px', zIndex: 1, position: 'relative' }}>
          <span className="badge badge-primary" style={{ marginBottom: '12px' }}>Introducing ShopNow</span>
          <h1 style={{ fontSize: '48px', fontWeight: 800, marginBottom: '16px', lineHeight: 1.15, fontFamily: 'var(--font-display)' }}>
            Next-Gen E-Commerce Experience
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Built on a 10-Microservice event-driven architecture using Kafka, Redis caches, Elasticsearch, and MongoDB. Secure, high-speed, and resilient.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => handleCategoryClick('electronics')} className="btn btn-primary">Shop Electronics</button>
            <a href="#featured" className="btn btn-secondary">Featured Products</a>
          </div>
        </div>
      </div>

      {/* Feature Badges Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(6, 214, 160, 0.1)', color: 'var(--success)' }}>
            <Zap size={24} />
          </div>
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Sub-50ms Latency</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Redis cache queries and stocks</p>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(157, 78, 221, 0.1)', color: 'var(--primary)' }}>
            <Shield size={24} />
          </div>
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Secure Saga Flows</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Distributed transaction safety</p>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(0, 180, 216, 0.1)', color: 'var(--secondary)' }}>
            <Star size={24} />
          </div>
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Elasticsearch Autocomplete</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>High-performance search logs</p>
          </div>
        </div>
      </div>

      {/* Categories Tabs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 id="featured" style={{ fontSize: '24px', fontFamily: 'var(--font-display)' }}>Featured Products</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className="btn"
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  borderRadius: '100px',
                  background: activeCategory === cat.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.03)',
                  border: activeCategory === cat.id ? 'none' : '1px solid var(--border-glass)'
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {loadingProducts ? (
          <div className="grid-products">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="glass-card shimmer" style={{ height: '380px', borderRadius: '16px' }} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <HelpCircle size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
            <h3>No products found</h3>
            <p style={{ marginTop: '8px' }}>Try changing your category filters or search queries.</p>
          </div>
        ) : (
          <div className="grid-products fade-in">
            {products.map((product) => (
              <div 
                key={product.productId || product.id} 
                className="glass-card" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '16px',
                  position: 'relative',
                  cursor: 'pointer'
                }}
                onClick={() => navigate(`/product/${product.productId || product.id}`)}
              >
                {/* Product Image */}
                <div style={{ 
                  width: '100%', 
                  height: '180px', 
                  borderRadius: '12px', 
                  overflow: 'hidden',
                  background: 'rgba(255, 255, 255, 0.02)',
                  position: 'relative'
                }}>
                  <img 
                    src={product.image || `https://picsum.photos/seed/${product.name}/400/300`} 
                    alt={product.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'var(--transition-smooth)' }} 
                    onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                  />
                  {product.isFeatured && (
                    <span className="badge badge-primary" style={{ position: 'absolute', top: '12px', left: '12px' }}>Featured</span>
                  )}
                  {product.stock <= 5 && product.stock > 0 && (
                    <span className="badge badge-warning" style={{ position: 'absolute', top: '12px', right: '12px' }}>Low Stock ({product.stock})</span>
                  )}
                  {product.stock === 0 && (
                    <span className="badge badge-danger" style={{ position: 'absolute', top: '12px', right: '12px' }}>Sold Out</span>
                  )}
                </div>

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexGrow: 1, textAlign: 'left' }}>
                  <span style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{product.category}</span>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, height: '48px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {product.name}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', height: '40px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {product.description}
                  </p>
                </div>

                {/* Footer price & purchase button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                  <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    ${product.price ? product.price.toFixed(2) : '0.00'}
                  </span>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation(); // Avoid navigating to details
                      if (product.stock > 0) addToCart(product, 1);
                    }} 
                    className="btn btn-primary" 
                    style={{ padding: '8px 12px', borderRadius: '8px' }}
                    disabled={product.stock === 0}
                  >
                    <ShoppingCart size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

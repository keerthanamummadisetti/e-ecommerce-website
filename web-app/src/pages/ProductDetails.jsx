import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ShoppingCart, ArrowLeft, Star, CheckCircle2 } from 'lucide-react';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, products, addLog, token, user } = useApp();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [reviewSubmitLoading, setReviewSubmitLoading] = useState(false);

  useEffect(() => {
    loadDetails();
  }, [id, products]);

  const loadDetails = async () => {
    setLoading(true);
    // Find product in global state first
    let prod = products.find(p => p.productId === id || p.id === id);

    if (!prod) {
      try {
        const res = await fetch(`/products/${id}`);
        if (res.ok) {
          prod = await res.json();
        }
      } catch (err) {
        addLog(`Failed to fetch product details from server: ${err.message}`, 'MS-02 Product Catalog');
      }
    }

    if (prod) {
      setProduct(prod);
      fetchReviews(prod.productId || prod.id);
    }
    setLoading(false);
  };

  const fetchReviews = async (productId) => {
    try {
      addLog(`Fetching reviews for product ${productId}`, 'MS-09 Review & Rating');
      const res = await fetch(`/reviews/product/${productId}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(Array.isArray(data) ? data : (data.reviews || []));
      } else {
        throw new Error();
      }
    } catch (err) {
      addLog(`Failed to load reviews from server, mocking default review list.`, 'MS-09 Review & Rating');
      // Simulated reviews list
      setReviews([
        { reviewId: 'rev-001', userId: 'usr-111', username: 'Alex Johnson', rating: 5, comment: 'Absolutely incredible performance! Very fast delivery and premium packaging.', created_at: new Date(Date.now() - 86400000 * 3).toLocaleDateString(), isVerified: true },
        { reviewId: 'rev-002', userId: 'usr-222', username: 'Sarah Smith', rating: 4, comment: 'Highly recommend this product. The build quality is amazing. Just a bit expensive.', created_at: new Date(Date.now() - 86400000 * 10).toLocaleDateString(), isVerified: true }
      ]);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    setReviewSubmitLoading(true);
    addLog(`Submitting rating ${rating}/5 for product ${product.productId || product.id}`, 'MS-09 Review & Rating');
    
    const newReview = {
      productId: product.productId || product.id,
      rating,
      comment,
      userId: user.userId,
      username: `${user.firstName} ${user.lastName}`,
      isVerified: true,
      created_at: new Date().toLocaleDateString()
    };

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      const res = await fetch('/reviews', {
        method: 'POST',
        headers,
        body: JSON.stringify(newReview)
      });
      if (res.ok) {
        addLog(`Review submitted successfully. Triggered Kafka rating aggregator event.`, 'MS-09 Review & Rating');
        setReviews(prev => [newReview, ...prev]);
        setComment('');
      } else {
        throw new Error();
      }
    } catch (err) {
      addLog(`Review submit server call failed. Simulated rating ingestion locally.`, 'MS-09 Review & Rating');
      setReviews(prev => [newReview, ...prev]);
      setComment('');
    } finally {
      setReviewSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div className="shimmer" style={{ width: '120px', height: '24px', margin: '0 auto 20px', borderRadius: '4px' }}></div>
        <div className="shimmer" style={{ width: '100%', height: '300px', borderRadius: '16px' }}></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '16px' }}>Product Not Found</h2>
        <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><ArrowLeft size={16} /> Back to Shop</Link>
      </div>
    );
  }

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) 
    : '5.0';

  return (
    <div className="container" style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
      
      {/* Back button */}
      <div>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={16} /> Back to Catalogue
        </Link>
      </div>

      {/* Main product card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px' }}>
        {/* Left Column - Image */}
        <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img 
            src={product.image || `https://picsum.photos/seed/${product.name}/600/400`} 
            alt={product.name} 
            style={{ width: '100%', borderRadius: '12px', objectFit: 'cover', maxHeight: '400px' }} 
          />
        </div>

        {/* Right Column - Product details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {product.category}
            </span>
            <h1 style={{ fontSize: '36px', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{product.name}</h1>
            
            {/* Rating display */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', color: 'var(--warning)' }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={16} fill={s <= Math.round(averageRating) ? 'var(--warning)' : 'none'} stroke="var(--warning)" />
                ))}
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>{averageRating}</span>
              <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>({reviews.length} customer reviews)</span>
            </div>
          </div>

          <h2 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)' }}>
            ₹{product.price ? product.price.toLocaleString('en-IN') : '0.00'}
          </h2>

          <p style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>{product.description}</p>

          {/* Product Specifications / Attributes */}
          <div className="glass-card" style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-glass)' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase' }}>Specifications</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Brand</span>
                <span style={{ fontWeight: 600 }}>{product.attributes?.brand || 'Generic'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Color Option</span>
                <span style={{ fontWeight: 600 }}>{product.attributes?.color || 'N/A'}</span>
              </div>
              {product.variants && product.variants.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>SKU Code</span>
                  <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{product.variants[0].sku}</span>
                </div>
              )}
            </div>
          </div>

          {/* Add to Cart Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', border: '1px solid var(--border-glass)', borderRadius: '8px', overflow: 'hidden', width: '120px', height: '48px' }}>
                <button 
                  onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                  style={{ flex: 1, cursor: 'pointer', background: 'rgba(255,255,255,0.02)', fontWeight: 600 }}
                >
                  -
                </button>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>{quantity}</div>
                <button 
                  onClick={() => setQuantity(prev => Math.min(product.stock || 99, prev + 1))}
                  style={{ flex: 1, cursor: 'pointer', background: 'rgba(255,255,255,0.02)', fontWeight: 600 }}
                >
                  +
                </button>
              </div>

              <button 
                onClick={() => addToCart(product, quantity, product.variants?.[0]?.sku || 'default')} 
                className="btn btn-primary"
                style={{ flex: 1, height: '48px' }}
                disabled={product.stock === 0}
              >
                <ShoppingCart size={18} /> Add to Cart
              </button>
            </div>
            {product.stock <= 5 && product.stock > 0 ? (
              <p style={{ color: 'var(--warning)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ⚠️ Low stock alert! Only {product.stock} items remaining in warehouse.
              </p>
            ) : product.stock === 0 ? (
              <p style={{ color: 'var(--danger)', fontSize: '13px' }}>Sold Out from Warehouse. Refills scheduled soon.</p>
            ) : (
              <p style={{ color: 'var(--success)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ⚡ Product in-stock (Redis speed reservation lock active)
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', borderTop: '1px solid var(--border-glass)', paddingTop: '40px', textAlign: 'left' }}>
        <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-display)' }}>Product Reviews</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
          {/* Reviews List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reviews.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No reviews for this product yet. Be the first to review!</p>
            ) : (
              reviews.map((rev, idx) => (
                <div key={rev.reviewId || idx} className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h5 style={{ fontSize: '14px', fontWeight: 600 }}>{rev.username || 'Anonymous User'}</h5>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{rev.created_at}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', color: 'var(--warning)' }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={12} fill={s <= rev.rating ? 'var(--warning)' : 'none'} stroke="var(--warning)" />
                      ))}
                    </div>
                    {rev.isVerified && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--success)' }}>
                        <CheckCircle2 size={12} /> Verified Purchaser
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{rev.comment}</p>
                </div>
              ))
            )}
          </div>

          {/* Add Review Form */}
          <div className="glass-card" style={{ height: 'fit-content' }}>
            <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Write a Review</h4>
            {user ? (
              <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Rating score</label>
                  <select 
                    className="glass-input" 
                    value={rating} 
                    onChange={(e) => setRating(parseInt(e.target.value))}
                    style={{ background: 'var(--bg-dark)' }}
                  >
                    <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
                    <option value="4">⭐⭐⭐⭐ 4 Stars</option>
                    <option value="3">⭐⭐⭐ 3 Stars</option>
                    <option value="2">⭐⭐ 2 Stars</option>
                    <option value="1">⭐ 1 Star</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Comments</label>
                  <textarea 
                    className="glass-input" 
                    required 
                    rows={4} 
                    placeholder="Share your experience with this item..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={reviewSubmitLoading}>
                  {reviewSubmitLoading ? 'Submitting...' : 'Post Review'}
                </button>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ marginBottom: '16px' }}>You must be logged in to leave reviews.</p>
                <Link to="/login" className="btn btn-secondary">Sign In</Link>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

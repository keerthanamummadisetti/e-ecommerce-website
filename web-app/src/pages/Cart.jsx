import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

export default function Cart() {
  const { cart, updateCartQty, removeCartItem, addLog } = useApp();
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const navigate = useNavigate();

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    if (couponCode.toUpperCase() === 'SAVE10') {
      const amt = cart.totalPrice * 0.1;
      setDiscount(amt);
      setCouponApplied(true);
      addLog(`Applied coupon code SAVE10. Computed 10% discount: $${amt.toFixed(2)}`, 'MS-06 Shopping Cart');
    } else {
      addLog(`Invalid coupon code attempted: ${couponCode}`, 'MS-06 Shopping Cart');
      alert('Invalid coupon code. Try SAVE10');
    }
  };

  const totalCartCount = cart.items ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
  const shippingFee = cart.totalPrice > 100 || cart.totalPrice === 0 ? 0 : 15.00;
  const tax = cart.totalPrice * 0.08;
  const finalTotal = cart.totalPrice - discount + shippingFee + tax;

  const handleCheckoutClick = () => {
    navigate('/checkout', { state: { discount, couponCode: couponApplied ? couponCode : '' } });
  };

  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="container" style={{ padding: '80px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <div style={{ padding: '24px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.02)', color: 'var(--text-muted)' }}>
          <ShoppingBag size={48} />
        </div>
        <h2>Your Shopping Cart is Empty</h2>
        <p style={{ maxWidth: '400px', margin: '0 auto' }}>Looks like you haven't added any products to your cart yet. Head back to the store to start shopping!</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '10px' }}>Continue Shopping</Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '32px', textAlign: 'left' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0 }}>Shopping Cart ({totalCartCount} items)</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr', gap: '32px', alignItems: 'start' }}>
        {/* Left - Items list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {cart.items.map((item) => (
            <div key={item.itemId || item.productId} className="glass-card" style={{ display: 'flex', gap: '20px', padding: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Product Thumbnail */}
              <div style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}>
                <img src={item.image || `https://picsum.photos/seed/${item.name}/150/150`} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>

              {/* Title and details */}
              <div style={{ flexGrow: 1, minWidth: '150px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 600 }}>{item.name}</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>SKU: <code style={{ fontSize: '11px' }}>{item.variantSku || 'default'}</code></p>
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>${item.price.toFixed(2)}</p>
              </div>

              {/* Counter quantity */}
              <div style={{ display: 'flex', border: '1px solid var(--border-glass)', borderRadius: '6px', overflow: 'hidden', width: '90px', height: '36px' }}>
                <button 
                  onClick={() => updateCartQty(item.itemId || item.productId, item.quantity - 1)}
                  style={{ flex: 1, cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}
                >
                  -
                </button>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600 }}>{item.quantity}</div>
                <button 
                  onClick={() => updateCartQty(item.itemId || item.productId, item.quantity + 1)}
                  style={{ flex: 1, cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}
                >
                  +
                </button>
              </div>

              {/* Subtotal */}
              <div style={{ fontWeight: 700, fontSize: '16px', width: '80px', textAlign: 'right' }}>
                ${(item.price * item.quantity).toFixed(2)}
              </div>

              {/* Remove button */}
              <button 
                onClick={() => removeCartItem(item.itemId || item.productId)}
                style={{ padding: '8px', cursor: 'pointer', color: 'var(--danger)' }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        {/* Right - Order summary and coupons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Coupon Form */}
          <div className="glass-card">
            <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Apply Coupon</h4>
            <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="SAVE10" 
                className="glass-input" 
                value={couponCode} 
                onChange={(e) => setCouponCode(e.target.value)} 
                disabled={couponApplied}
                style={{ height: '38px', textTransform: 'uppercase' }}
              />
              <button type="submit" className="btn btn-secondary" style={{ padding: '0 16px', height: '38px' }} disabled={couponApplied}>
                {couponApplied ? 'Applied' : 'Apply'}
              </button>
            </form>
            {couponApplied && (
              <p style={{ color: 'var(--success)', fontSize: '12px', marginTop: '8px' }}>✓ Coupon SAVE10 (10% discount) applied successfully.</p>
            )}
          </div>

          {/* Checkout Card */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '18px', fontWeight: 700, borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>Order Summary</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Items Subtotal</span>
                <span>${cart.totalPrice.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                  <span>Promo Coupon Discount</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Estimated Shipping</span>
                <span>{shippingFee === 0 ? 'FREE' : `$${shippingFee.toFixed(2)}`}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Estimated Sales Tax (8%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-glass)', paddingTop: '12px', fontSize: '18px', fontWeight: 700 }}>
                <span>Grand Total</span>
                <span style={{ color: 'var(--secondary)' }}>${finalTotal.toFixed(2)}</span>
              </div>
            </div>

            <button onClick={handleCheckoutClick} className="btn btn-primary" style={{ width: '100%', height: '48px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
              Checkout Process <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

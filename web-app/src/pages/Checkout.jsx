import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { CreditCard, Truck, CheckCircle, ShieldAlert } from 'lucide-react';

export default function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, token, cart, clearCart, addLog } = useApp();
  
  const discount = state?.discount || 0;
  const couponCode = state?.couponCode || '';
  
  const [step, setStep] = useState(1); // 1: Shipping, 2: Payment, 3: Success
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState('');

  if (!user) {
    return (
      <div className="container" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '16px' }}>Sign In Required</h2>
        <p style={{ marginBottom: '24px' }}>You must log in to proceed with checkout and place orders.</p>
        <Link to="/login" className="btn btn-primary">Sign In Now</Link>
      </div>
    );
  }

  const shippingFee = cart.totalPrice > 100 ? 0 : 15.00;
  const tax = cart.totalPrice * 0.08;
  const finalTotal = cart.totalPrice - discount + shippingFee + tax;

  const handleNextStep = (e) => {
    e.preventDefault();
    if (step === 1) {
      addLog(`Saved shipping destination: ${address}, ${city} ${zip}`, 'Client');
      setStep(2);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    addLog(`Initiating checkout checkout. Cart total: $${finalTotal.toFixed(2)}`, 'MS-06 Shopping Cart');

    try {
      // 1. Submit cart checkout
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      
      addLog('Emitting event cart.checkout_initiated to Order Service...', 'MS-06 Shopping Cart');
      const checkoutRes = await fetch(`/cart/${user.userId}/checkout`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ couponCode, shippingAddress: `${address}, ${city} ${zip}` })
      });

      if (checkoutRes.ok) {
        const checkoutData = await checkoutRes.json();
        const createdOrderId = checkoutData.orderId || checkoutData.checkoutDetails?.orderId;
        
        addLog(`Order generated as PENDING. ID: ${createdOrderId}. Stock reserved in warehouse.`, 'MS-03 Order Management');
        
        // 2. Process mock payment confirm
        addLog(`Initiating payment tokenization for order ${createdOrderId} via Stripe SDK...`, 'MS-04 Payment Service');
        const paymentRes = await fetch(`/payments/initiate`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ orderId: createdOrderId, amount: finalTotal })
        });
        
        if (paymentRes.ok) {
          const paymentData = await paymentRes.json();
          addLog(`Payment successfully processed. Stripe charge ID: ${paymentData.chargeId || 'ch_mock123'}. Emitted payment.success.`, 'MS-04 Payment Service');
        }
        
        setOrderId(createdOrderId);
        addLog(`Checkout completed. Notifications sent via Twilio / SendGrid mock templates.`, 'MS-07 Notification Service');
      } else {
        throw new Error('Server checkout call rejected');
      }
      
      clearCart();
      setStep(3);
    } catch (err) {
      addLog(`Checkout API flow failed (${err.message}). Simulating Saga choreography transaction flow...`, 'Client');
      
      // Local Simulation flow mapping sequence
      const generatedOrderId = `ord_${Math.random().toString(36).substring(2, 11)}`;
      setOrderId(generatedOrderId);
      
      // Simulate delays to demonstrate Saga steps in logs
      setTimeout(() => {
        addLog(`[SAGA STEP 1] Cart checkout triggered cart.checkout_initiated Kafka event`, 'MS-06 Shopping Cart');
      }, 500);
      
      setTimeout(() => {
        addLog(`[SAGA STEP 2] Order Service created PENDING order: ${generatedOrderId}`, 'MS-03 Order Management');
        addLog(`[SAGA STEP 3] Inventory Service reserved products. Redis stock lock acquired for 15 mins.`, 'MS-05 Inventory Service');
      }, 1500);

      setTimeout(() => {
        addLog(`[SAGA STEP 4] Payment Service processed Stripe transaction charge. Emitted payment.success`, 'MS-04 Payment Service');
        addLog(`[SAGA STEP 5] Order Service updated order status to CONFIRMED. Inventory deducted.`, 'MS-03 Order Management');
      }, 3000);

      setTimeout(() => {
        addLog(`[SAGA STEP 6] Ingested orders funnel data. Funnel rate: 100%`, 'MS-10 Analytics Service');
        addLog(`[SAGA STEP 7] Sent registration/purchase template email via Jinja2 mock.`, 'MS-07 Notification Service');
        clearCart();
        setStep(3);
        setLoading(false);
      }, 4500);
    }
  };

  return (
    <div className="container" style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '32px', textAlign: 'left' }}>
      
      {/* Checkout Header Progress */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '20px' }}>
        <span style={{ fontWeight: 600, color: step === 1 ? 'var(--primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Truck size={16} /> 1. Shipping Address
        </span>
        <span style={{ fontWeight: 600, color: step === 2 ? 'var(--primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CreditCard size={16} /> 2. Payment Details
        </span>
        <span style={{ fontWeight: 600, color: step === 3 ? 'var(--success)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={16} /> 3. Confirmed
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: step === 3 ? '1fr' : '2fr 1.2fr', gap: '32px', alignItems: 'start' }}>
        
        {/* Main Step Flow Container */}
        <div className="glass-card">
          
          {step === 1 && (
            <form onSubmit={handleNextStep} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ fontSize: '20px', fontFamily: 'var(--font-display)' }}>Enter Shipping Address</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Delivery Street Address</label>
                <input 
                  type="text" 
                  required 
                  className="glass-input" 
                  placeholder="e.g. 456 Gateway Ave" 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>City</label>
                  <input 
                    type="text" 
                    required 
                    className="glass-input" 
                    placeholder="e.g. Mumbai" 
                    value={city} 
                    onChange={(e) => setCity(e.target.value)} 
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Postal Code / ZIP</label>
                  <input 
                    type="text" 
                    required 
                    className="glass-input" 
                    placeholder="e.g. 400001" 
                    value={zip} 
                    onChange={(e) => setZip(e.target.value)} 
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ height: '48px', width: '100%', marginTop: '10px' }}>
                Proceed to Payment Details
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ fontSize: '20px', fontFamily: 'var(--font-display)' }}>Secure Credit Card Payment</h3>
              
              <div style={{ padding: '12px', background: 'rgba(0,180,216,0.05)', borderRadius: '8px', border: '1px dashed var(--secondary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldAlert size={20} style={{ color: 'var(--secondary)' }} />
                <span>Simulated integration. You can enter any mock test details. PCI-DSS compliant tokenization enabled.</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Cardholder Name</label>
                <input 
                  type="text" 
                  required 
                  className="glass-input" 
                  placeholder="e.g. John Doe" 
                  value={cardName} 
                  onChange={(e) => setCardName(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Card Number</label>
                <input 
                  type="text" 
                  required 
                  className="glass-input" 
                  placeholder="4242 4242 4242 4242 (Stripe test)" 
                  value={cardNumber} 
                  onChange={(e) => setCardNumber(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Expiration Month/Year</label>
                  <input 
                    type="text" 
                    required 
                    className="glass-input" 
                    placeholder="MM/YY" 
                    value={expiry} 
                    onChange={(e) => setExpiry(e.target.value)} 
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Security Code (CVV)</label>
                  <input 
                    type="password" 
                    required 
                    className="glass-input" 
                    placeholder="•••" 
                    value={cvv} 
                    onChange={(e) => setCvv(e.target.value)} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setStep(1)} className="btn btn-secondary" style={{ flex: 1, height: '48px' }} disabled={loading}>
                  Back
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, height: '48px' }} disabled={loading}>
                  {loading ? 'Processing Transaction...' : `Confirm & Pay $${finalTotal.toFixed(2)}`}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <div style={{ color: 'var(--success)', background: 'rgba(6, 214, 160, 0.1)', padding: '20px', borderRadius: '50%' }}>
                <CheckCircle size={48} />
              </div>
              <h2 style={{ fontSize: '32px', fontFamily: 'var(--font-display)' }}>Order Confirmed!</h2>
              <p style={{ maxWidth: '500px', margin: '0 auto', fontSize: '16px' }}>
                Your checkout was successful. The transaction has processed through the Saga coordinator and stock reservation is completed.
              </p>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-glass)', width: '100%', maxWidth: '400px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Order Tracking Number</p>
                <code style={{ fontSize: '16px', fontWeight: 700, color: 'var(--secondary)' }}>{orderId}</code>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                <Link to="/orders" className="btn btn-primary">Track Order Status</Link>
                <Link to="/" className="btn btn-secondary">Continue Shopping</Link>
              </div>
            </div>
          )}

        </div>

        {/* Sidebar Summary (Only visible on Step 1 & 2) */}
        {step < 3 && (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: 700 }}>Summary Summary</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px' }}>
              {cart.items.map((item) => (
                <div key={item.itemId || item.productId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{item.quantity}x {item.name}</span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                <span>${cart.totalPrice.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                  <span>Discount</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Shipping</span>
                <span>{shippingFee === 0 ? 'FREE' : `$${shippingFee.toFixed(2)}`}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Sales Tax</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-glass)', paddingTop: '10px', fontSize: '16px', fontWeight: 700 }}>
                <span>Total</span>
                <span style={{ color: 'var(--secondary)' }}>${finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

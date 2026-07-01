import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Register() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser, addLog } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    addLog(`Registering new user profile for ${email}...`, 'MS-01 User Service');

    try {
      const res = await fetch('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ firstName, lastName, email, password, phone, role })
      });

      if (res.status === 201 || res.status === 200) {
        const data = await res.json();
        loginUser(
          { userId: data.userId, email: data.email, firstName: firstName, lastName: lastName, role: role },
          data.accessToken
        );
        addLog(`Registration succeeded for ID: ${data.userId}`, 'MS-01 User Service');
        navigate('/');
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Registration failed');
      }
    } catch (err) {
      addLog(`User Service registration endpoint failed (${err.message}). Simulating registration.`, 'MS-01 User Service');
      // Mock signup success
      const mockUser = {
        userId: `usr_${Math.random().toString(36).substring(2, 11)}`,
        email,
        firstName,
        lastName,
        role
      };
      loginUser(mockUser, `mock_jwt_token_${Date.now()}`);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 150px)', padding: '40px 24px' }}>
      <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>Create Account</h2>
          <p>Join ShopNow to buy and track orders</p>
        </div>

        {error && (
          <div style={{ padding: '12px', background: 'rgba(239, 71, 111, 0.1)', border: '1px solid var(--danger)', borderRadius: '8px', color: 'var(--danger)', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>First Name</label>
              <input
                type="text"
                required
                className="glass-input"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Last Name</label>
              <input
                type="text"
                required
                className="glass-input"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Email Address</label>
            <input
              type="email"
              required
              className="glass-input"
              placeholder="john.doe@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Phone Number</label>
            <input
              type="tel"
              className="glass-input"
              placeholder="+1234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Password</label>
            <input
              type="password"
              required
              className="glass-input"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Role Configuration</label>
            <select className="glass-input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="CUSTOMER">Customer Profile</option>
              <option value="ADMIN">System Administrator</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }} disabled={loading}>
            {loading ? 'Registering...' : 'Create Account'}
          </button>
        </form>

        <div style={{ fontSize: '14px', textAlign: 'center', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}

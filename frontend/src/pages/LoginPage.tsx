import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Invalid username or password');
      }

      const data = await response.json();

      // Decode JWT to get role and username
      // In a real app, the backend should return user info along with token
      // For this implementation, we'll assume the backend returns it or we decode it
      // Since the backend current returns only access_token, we'll fetch user info or 
      // use a simplified version where the backend sends it.

      // Let's assume the backend was updated to return {access_token, username, role}
      // Or we can make a quick call to a /me endpoint.
      // For now, I will use the data from the token if possible or a mock role for the UI

      const token = data.access_token;

      // Base64 decode the JWT payload to get role and username
       const payloadBase64 = token.split('.')[1];
       const decodedPayload = JSON.parse(window.atob(payloadBase64));

       login(token, decodedPayload.sub, decodedPayload.role, decodedPayload.permissions || []);
       navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{
      height: '100vh',
      width: '100%',
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Dynamic Background Blobs */}
      <div style={{
        position: 'absolute',
        top: '-10%', right: '-5%',
        width: '50vw', height: '50vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,120,255,0.15) 0%, transparent 70%)',
        filter: 'blur(60px)',
        zIndex: 0,
        animation: 'float 20s infinite alternate'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%', left: '-5%',
        width: '60vw', height: '60vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)',
        filter: 'blur(80px)',
        zIndex: 0,
        animation: 'float 25s infinite alternate-reverse'
      }} />
      <div style={{
        position: 'absolute',
        top: '20%', left: '10%',
        width: '30vw', height: '30vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
        filter: 'blur(50px)',
        zIndex: 0,
        animation: 'float 15s infinite alternate'
      }} />
      
      {/* Subtle Grid Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
        opacity: 0.5,
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      <div className="glass-card" style={{
        zIndex: 1,
        width: '100%',
        maxWidth: '420px',
        textAlign: 'center',
        boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
        border: '1px solid rgba(255,255,255,0.6)',
        backdropFilter: 'blur(20px)',
        padding: '48px 40px'
      }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <img src="https://raptbot.com/static/Raptbot%20logo-4126ccc4c32495aa61af8533893d8ca2.png" alt="Logo" style={{ width: '140px', height: 'auto' }} />
          </div>
          <h2 className="page-title" style={{ fontSize: 32, margin: 0, fontWeight: 800 }}>IPRE-Reco</h2>
          <p className="page-subtitle" style={{ fontSize: 15, marginTop: 8 }}>Please enter your details to continue</p>
        </div>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</label>
            <input
              className="input"
              style={{ width: '100%' }}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Enter username"
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
            <input
              className="input"
              style={{ width: '100%' }}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          {error && <div className="error-msg" style={{ marginBottom: 20 }}>{error}</div>}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Sign In</button>
        </form>
      </div>
    </div>
  );
}

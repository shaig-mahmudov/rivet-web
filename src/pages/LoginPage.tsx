import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Sparkles, Key } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [bootstrapUsername, setBootstrapUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Admin bootstrap flow state
  const [showBootstrap, setShowBootstrap] = useState(false);
  const [bootstrapToken, setBootstrapToken] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password });
      navigate('/');
    } catch (err: unknown) {
      const errorWithDetails = err as Error & { details?: { details?: Record<string, string> } };
      let msg = errorWithDetails.message || 'Invalid email or password';
      if (errorWithDetails.details && errorWithDetails.details.details) {
        msg = Object.entries(errorWithDetails.details.details)
          .map(([field, error]) => `${field}: ${error}`)
          .join(', ');
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Calls bootstrap admin API endpoint
      const { api } = await import('../services/api');
      const bootEmail = `${bootstrapUsername}@example.com`;
      await api.auth.bootstrapAdmin({
        username: bootstrapUsername,
        email: bootEmail,
        password,
        confirmPassword: password,
        bootstrapToken
      });
      // Immediately log in after bootstrapping (using correct email key)
      await login({ email: bootEmail, password });
      navigate('/');
    } catch (err: unknown) {
      const errorWithDetails = err as Error & { details?: { details?: Record<string, string> } };
      let msg = errorWithDetails.message || 'Bootstrap failed';
      if (errorWithDetails.details && errorWithDetails.details.details) {
        msg = Object.entries(errorWithDetails.details.details)
          .map(([field, error]) => `${field}: ${error}`)
          .join(', ');
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <span>Rivet</span>
          </div>
          <h2 className="auth-title">
            {showBootstrap ? 'Bootstrap First Admin' : 'Welcome Back'}
          </h2>
          <p className="auth-subtitle">
            {showBootstrap 
              ? 'Initialize the first administrator account'
              : 'Sign in to access your engineering dashboard'}
          </p>
        </div>

        {error && (
          <div 
            style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              color: 'var(--color-danger)', 
              padding: '0.75rem', 
              borderRadius: 'var(--border-radius)', 
              marginBottom: '1rem',
              fontSize: '0.85rem',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={showBootstrap ? handleBootstrap : handleSubmit}>
          {showBootstrap ? (
            <div className="form-group">
              <label className="form-label">Admin Username</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. admin"
                value={bootstrapUsername}
                onChange={(e) => setBootstrapUsername(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="e.g. user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {showBootstrap && (
            <div className="form-group">
              <label className="form-label">Bootstrap Token</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Enter ADMIN_BOOTSTRAP_TOKEN env value"
                value={bootstrapToken}
                onChange={(e) => setBootstrapToken(e.target.value)}
                required
              />
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={loading}
          >
            {loading ? (
              <span>Processing...</span>
            ) : showBootstrap ? (
              <>
                <Key size={18} />
                <span>Bootstrap Admin</span>
              </>
            ) : (
              <>
                <LogIn size={18} />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
          {showBootstrap ? (
            <a 
              href="#signin" 
              style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
              onClick={(e) => { e.preventDefault(); setShowBootstrap(false); }}
            >
              Back to regular Sign In
            </a>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span>
                Don't have an account?{' '}
                <Link to="/register" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                  Register here
                </Link>
              </span>
              <a 
                href="#bootstrap" 
                style={{ color: 'var(--color-accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', marginTop: '0.5rem' }}
                onClick={(e) => { e.preventDefault(); setShowBootstrap(true); }}
              >
                <Sparkles size={14} />
                <span>Bootstrap First Admin</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

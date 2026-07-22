import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/auth-context';
import Logo from '../../components/ui/logo';
import './index.scss';

const Login = () => {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const [email, set_email] = useState('');
  const [password, set_password] = useState('');
  const [error, set_error] = useState('');
  const [submitting, set_submitting] = useState(false);

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  const handle_submit = async (e: FormEvent) => {
    e.preventDefault();
    set_error('');
    set_submitting(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      set_error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      set_submitting(false);
    }
  };

  return (
    <div className="login">
      <div className="login-container">
        {/* Left side - Branding */}
        <div className="login-branding">
          <div className="branding-content">
            <Logo size="large" />
            <div className="branding-text">
              <h2>Manage Your CRM</h2>
              <p>Streamline your sales pipeline, track leads, and close deals faster with Simple CRM.</p>
            </div>
            <div className="branding-features">
              <div className="feature">
                <span className="feature-icon">📊</span>
                <span className="feature-text">Track leads and customers</span>
              </div>
              <div className="feature">
                <span className="feature-icon">🎯</span>
                <span className="feature-text">Manage deals and opportunities</span>
              </div>
              <div className="feature">
                <span className="feature-icon">🎫</span>
                <span className="feature-text">Handle support tickets</span>
              </div>
            </div>

            <div className="demo-credentials">
              <h3>Demo Accounts</h3>
              <div className="demo-account">
                <div className="demo-label">Sales Rep</div>
                <div className="demo-value">demo-sales@example.com</div>
                <div className="demo-password">Demo123</div>
              </div>
              <div className="demo-account">
                <div className="demo-label">Support Agent</div>
                <div className="demo-value">demo-support@example.com</div>
                <div className="demo-password">Demo123</div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="login-divider"></div>

        {/* Right side - Login form */}
        <div className="login-form-section">
          <form className="login-card" onSubmit={handle_submit}>
            <h1 className="login-card-title">Welcome</h1>
            <p className="login-card-subtitle">Sign in to your account</p>

            <label className="login-card-field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => set_email(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="login-card-field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => set_password(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {error && <p className="login-card-error">{error}</p>}
            <button type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>

            <div className="login-card-footer">
              <p>Need an account?</p>
              <p className="contact-admin">Contact your company administrator to create an account.</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;

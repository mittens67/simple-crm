import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { BarChart3, Target, Ticket } from 'lucide-react';
import { useAuth } from '../../auth/auth-context';
import Logo from '../../components/ui/logo';
import Button from '../../components/ui/button';
import { Input } from '../../components/ui/field';
import './index.scss';

/**
 * The demo password is read from the build environment rather than written
 * into this file. It used to be a literal here, which drifted from the seed:
 * the page advertised `Demo123` after the seed had moved on to `Demo123!`, so
 * the credentials on the login screen did not log anyone in.
 *
 * Development falls back to the seed's own default. A production build shows
 * the card only when VITE_DEMO_PASSWORD is set deliberately, so a public login
 * page never advertises a password nobody chose to publish.
 */
const demo_password: string | null =
  import.meta.env.VITE_DEMO_PASSWORD ?? (import.meta.env.DEV ? 'Demo123!' : null);

const DEMO_ACCOUNTS = [
  { label: 'Sales Rep', email: 'demo-sales@example.com' },
  { label: 'Sales Manager', email: 'demo-manager@example.com' },
  { label: 'Support Agent', email: 'demo-support@example.com' },
];

const FEATURES = [
  { icon: <BarChart3 aria-hidden="true" />, text: 'Track leads and customers' },
  { icon: <Target aria-hidden="true" />, text: 'Manage deals and opportunities' },
  { icon: <Ticket aria-hidden="true" />, text: 'Handle support tickets' },
];

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
      let error_msg = err instanceof Error ? err.message : 'Login failed';
      // Convert technical error messages to user-friendly ones
      if (error_msg.includes('429') || error_msg.includes('too many')) {
        error_msg = 'Too many login attempts. Please wait a few minutes before trying again.';
      }
      set_error(error_msg);
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
              <p>
                Streamline your sales pipeline, track leads, and close deals faster with Simple
                CRM.
              </p>
            </div>

            <ul className="branding-features">
              {FEATURES.map((feature) => (
                <li className="feature" key={feature.text}>
                  <span className="feature-icon">{feature.icon}</span>
                  <span className="feature-text">{feature.text}</span>
                </li>
              ))}
            </ul>

            {demo_password && (
              <section className="demo-credentials" aria-labelledby="demo-credentials-title">
                <h3 id="demo-credentials-title">Demo accounts</h3>
                <dl>
                  {DEMO_ACCOUNTS.map((account) => (
                    <div className="demo-account" key={account.email}>
                      <dt className="demo-label">{account.label}</dt>
                      <dd className="demo-value">{account.email}</dd>
                    </div>
                  ))}
                </dl>
                <p className="demo-password">
                  Password for all: <code>{demo_password}</code>
                </p>
              </section>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="login-divider"></div>

        {/* Right side - Login form */}
        <div className="login-form-section">
          <form className="login-card" onSubmit={handle_submit}>
            <h1 className="login-card-title">Welcome</h1>
            <p className="login-card-subtitle">Sign in to your account</p>

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => set_email(e.target.value)}
              autoComplete="email"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => set_password(e.target.value)}
              autoComplete="current-password"
              required
            />

            {error && (
              <p className="login-card-error" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" loading={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>

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

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/auth-context';
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
      <form className="login-card" onSubmit={handle_submit}>
        <h1 className="login-card-title">Sign in</h1>
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
      </form>
    </div>
  );
};

export default Login;

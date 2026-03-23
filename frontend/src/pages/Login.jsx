import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Auth.module.css';

export default function Login() {
  const { login, user } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]   = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const data = await login(form.username, form.password);
    setLoading(false);
    if (data.success) {
      // Read verified from the API response directly, not from context
      // (context update is async so may not be reflected yet)
      const verified = !!(data.user.verified || data.user.discord?.verified);
      navigate(verified ? '/chat' : '/verify');
    } else {
      setError(data.error || data.message || 'Login failed');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Bridge</h1>
        <p className={styles.subtitle}>Sign in to your account</p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Username</label>
            <input
              type="text"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="your username"
              autoComplete="username"
              required
            />
          </div>
          <div className={styles.field}>
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className={styles.link}>
          Don't have an account? <Link to="/register">Register</Link>
        </p>
        <p className={styles.legal}>
          <Link to="/tos">Terms of Service</Link>
          {' · '}
          <Link to="/pp">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
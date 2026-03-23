import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiUrl } from '../api';
import styles from './Auth.module.css';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm]   = useState({ username: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      return setError('Passwords do not match');
    }
    setLoading(true);
    const res = await fetch(apiUrl('/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username: form.username, password: form.password })
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      navigate('/verify');
    } else {
      setError(data.error || 'Registration failed');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Bridge</h1>
        <p className={styles.subtitle}>Create an account</p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Username</label>
            <input
              type="text"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="choose a username"
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
              required
            />
          </div>
          <div className={styles.field}>
            <label>Confirm Password</label>
            <input
              type="password"
              value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className={styles.link}>
          Already have an account? <Link to="/login">Sign in</Link>
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
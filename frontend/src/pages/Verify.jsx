import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../api';
import styles from './Auth.module.css';

export default function Verify() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [handle, setHandle]   = useState('');
  const [code, setCode]       = useState('');
  const [step, setStep]       = useState('handle'); // 'handle' | 'code'
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const sendCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch(apiUrl('/auth/verify/send'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ discordHandle: handle })
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      setSuccess('Code sent! Check your Discord DMs.');
      setStep('code');
    } else {
      setError(data.error || 'Failed to send code');
    }
  };

  const confirmCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch(apiUrl('/auth/verify/confirm'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      await refreshUser();
      navigate('/chat');
    } else {
      setError(data.error || 'Invalid code');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Verify Discord</h1>
        <p className={styles.subtitle}>
          Link your Discord account to get started
        </p>

        {error   && <div className={styles.error}>{error}</div>}
        {success && (
          <div style={{
            background: 'rgba(87, 242, 135, 0.1)',
            border: '1px solid var(--success)',
            color: 'var(--success)',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '0.875rem',
            marginBottom: '16px'
          }}>
            {success}
          </div>
        )}

        {step === 'handle' ? (
          <form onSubmit={sendCode} className={styles.form}>
            <div className={styles.field}>
              <label>Your Discord Username</label>
              <input
                type="text"
                value={handle}
                onChange={e => setHandle(e.target.value)}
                placeholder="username (no @)"
                required
              />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              You must be in the server for the bot to DM you.
            </p>
            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? 'Sending...' : 'Send verification code'}
            </button>
          </form>
        ) : (
          <form onSubmit={confirmCode} className={styles.form}>
            <div className={styles.field}>
              <label>Verification Code</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="6-digit code"
                maxLength={6}
                required
              />
            </div>
            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? 'Verifying...' : 'Confirm'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('handle'); setSuccess(''); setError(''); }}
              style={{
                background: 'none',
                border: '1px solid var(--ui-border)',
                color: 'var(--text-dim)',
                borderRadius: '6px',
                padding: '10px',
                fontSize: '0.875rem'
              }}
            >
              Use a different username
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
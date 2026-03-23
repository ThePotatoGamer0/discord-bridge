import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl } from '../api';
import styles from './AccountLinks.module.css';

export default function AccountLinks() {
  const [links, setLinks]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl('/auth/links'), { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.links) setLinks(data.links);
        setLoading(false);
      });
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link to="/chat" className={styles.back}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
          Back to chat
        </Link>
        <h1 className={styles.title}>Account Links</h1>
        <p className={styles.subtitle}>Your verified Discord account</p>
      </div>

      <div className={styles.content}>
        {loading && <p className={styles.dim}>Loading...</p>}
        {!loading && links.length === 0 && (
          <p className={styles.dim}>No verified accounts yet.</p>
        )}
        {links.map(link => (
          <div key={link.user_id} className={styles.row}>
            <div className={styles.discordSide}>
              <div className={styles.avatar}>
                {link.discord_avatar
                  ? <img
                      src={`https://cdn.discordapp.com/avatars/${link.discord_id}/${link.discord_avatar}.png`}
                      alt={link.discord_handle}
                    />
                  : <span>{link.discord_handle[0].toUpperCase()}</span>
                }
              </div>
              <div>
                <div className={styles.discordName}>{link.discord_handle}</div>
                <div className={styles.dim} style={{ fontSize: '0.75rem' }}>Discord</div>
              </div>
            </div>

            <div className={styles.arrow}>→</div>

            <div className={styles.siteSide}>
              <div className={styles.siteTag}>@{link.username}</div>
              <div className={styles.dim} style={{ fontSize: '0.75rem' }}>
                Linked {new Date(link.linked_at * 1000).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
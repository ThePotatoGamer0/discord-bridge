import { useEffect } from 'react';
import styles from './UserProfileModal.module.css';

function formatDate(ts) {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_COLORS = { online: '#43b581', idle: '#faa61a', dnd: '#f04747', offline: '#747f8d' };

function StatusIndicator({ status }) {
  const color = STATUS_COLORS[status] ?? STATUS_COLORS.offline;
  return <span className={styles.statusDot} style={{ backgroundColor: color }} aria-hidden />;
}

export default function UserProfileModal({ profile, loading, onClose }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className={styles.overlay}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {loading ? (
          <div className={styles.loading}>Loading profile…</div>
        ) : profile ? (
          <>
            <div className={styles.sidebar}>
              <div
                className={styles.banner}
                style={{
                  background: profile.banner
                    ? `url(${profile.banner}) center/cover`
                    : profile.accentColor
                      ? profile.accentColor
                      : 'linear-gradient(135deg, #5865f2 0%, #eb459e 100%)',
                }}
              />
              <div className={styles.avatarWrap}>
                <div className={styles.avatar}>
                  {profile.avatar ? (
                    <img src={profile.avatar} alt="" />
                  ) : (
                    <span>{(profile.nickname ?? profile.globalName ?? profile.username ?? '?')[0].toUpperCase()}</span>
                  )}
                </div>
                <StatusIndicator status={profile.status} />
              </div>
              <div className={styles.identity}>
                <h2 className={styles.displayName} style={profile.color ? { color: profile.color } : undefined}>
                  {profile.nickname ?? profile.globalName ?? profile.username ?? 'Unknown'}
                </h2>
                <p className={styles.username}>
                  {profile.username && `@${profile.username}`}
                  {profile.bot && <span className={styles.botBadge}>BOT</span>}
                  {profile.siteUser && <span className={styles.siteBadge}>{profile.siteUser.username}</span>}
                </p>
              </div>
              <div className={styles.statusRow}>
                <StatusIndicator status={profile.status} />
                <span className={styles.statusText} style={{ color: STATUS_COLORS[profile.status] ?? STATUS_COLORS.offline }}>
                  {profile.statusText ?? 'Offline'}
                </span>
              </div>
              <div className={styles.meta}>
                {profile.discordCreatedAt && (
                  <div className={styles.metaRow} title="Discord member since">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                    </svg>
                    <span>{formatDate(profile.discordCreatedAt)}</span>
                  </div>
                )}
                {profile.joinedAt && (
                  <div className={styles.metaRow} title="Joined this server">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
                    </svg>
                    <span>{formatDate(profile.joinedAt)}</span>
                  </div>
                )}
              </div>
              {profile.roles?.length > 0 && (
                <div className={styles.rolesSection}>
                  <h3 className={styles.rolesTitle}>Roles</h3>
                  <div className={styles.rolesList}>
                    {profile.roles.map((r) => (
                      <span
                        key={r.id}
                        className={styles.role}
                        style={r.color ? { backgroundColor: `${r.color}20`, color: r.color, borderColor: `${r.color}40` } : undefined}
                      >
                        {r.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className={styles.error}>Could not load profile.</div>
        )}
      </div>
    </div>
  );
}

import styles from './ServerSidebar.module.css';

export default function ServerSidebar({ servers = [], activeServer, onSelectServer }) {
  if (servers.length === 0) {
    return (
      <aside className={styles.serverSidebar}>
        <div className={styles.empty}>No servers</div>
      </aside>
    );
  }

  return (
    <aside className={styles.serverSidebar}>
      <div className={styles.list}>
        {servers.map((s) => {
          const isActive = activeServer?.id === s.id;
          const iconUrl = s.icon
            ? `https://cdn.discordapp.com/icons/${s.id}/${s.icon}.png?size=48`
            : null;
          const initial = (s.name?.[0] ?? '?').toUpperCase();

          return (
            <button
              key={s.id}
              type="button"
              className={`${styles.serverBtn} ${isActive ? styles.active : ''}`}
              onClick={() => onSelectServer(s)}
              title={s.name}
              aria-label={`Switch to ${s.name}`}
              aria-current={isActive ? 'true' : undefined}
            >
              {iconUrl ? (
                <img src={iconUrl} alt="" className={styles.serverIcon} />
              ) : (
                <span className={styles.serverInitial}>{initial}</span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

import { useState, useMemo } from 'react';
import { useUserProfile } from '../context/UserProfileContext';
import styles from './MembersSidebar.module.css';

function memberDisplayName(m) {
  return m.nickname ?? m.globalName ?? m.username ?? 'Unknown';
}

function matchesSearch(m, q) {
  if (!q) return true;
  return (
    (m.username?.toLowerCase().includes(q)) ||
    (m.globalName?.toLowerCase().includes(q)) ||
    (m.nickname?.toLowerCase().includes(q))
  );
}

function MemberRow({ m, offline, onClick }) {
  const name = memberDisplayName(m);
  const avatarUrl = m.avatar
    ? `https://cdn.discordapp.com/avatars/${m.id}/${m.avatar}.png?size=32`
    : null;
  return (
    <div
      className={`${styles.member} ${offline ? styles.offline : ''} ${onClick ? styles.clickable : ''}`}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } } : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={styles.avatar}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" loading="lazy" decoding="async" />
        ) : (
          <span>{name[0]?.toUpperCase() ?? '?'}</span>
        )}
      </div>
      <div className={styles.memberInfo}>
        <div className={styles.memberNameRow}>
          <span className={styles.memberName} style={m.color ? { color: m.color } : undefined}>{name}</span>
          {m.bot && <span className={styles.botTag}>APP</span>}
          {m.siteUser && <span className={styles.siteTag}>{m.siteUser.username}</span>}
        </div>
        {m.username && name !== m.username && (
          <span className={styles.memberHandle}>@{m.username}</span>
        )}
      </div>
    </div>
  );
}

export default function MembersSidebar({ members = [], sections = [], guildId = '', onToggle, visible }) {
  const { openUserProfile } = useUserProfile();
  const [search, setSearch] = useState('');
  const q = search.toLowerCase().trim();

  const filteredSections = useMemo(() => {
    if (!sections.length) return [];
    if (!q) return sections;
    return sections.map((sec) => ({
      ...sec,
      members: sec.members.filter((m) => matchesSearch(m, q)),
    })).filter((sec) => sec.members.length > 0);
  }, [sections, q]);

  const flatMembers = useMemo(() => {
    if (!q) return members;
    return members.filter((m) => matchesSearch(m, q));
  }, [members, q]);

  const useSections = sections.length > 0;
  const hasContent = useSections ? filteredSections.length > 0 : flatMembers.length > 0;

  return (
    <aside className={`${styles.membersSidebar} ${!visible ? styles.collapsed : ''}`}>
      <div className={styles.header}>
        {visible && <span className={styles.title}>Members</span>}
        <button
          type="button"
          className={styles.toggleBtn}
          onClick={onToggle}
          title={visible ? 'Hide members' : 'Show members'}
          aria-label={visible ? 'Hide members' : 'Show members'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {visible ? (
              <path d="M9 5l7 7-7 7" />
            ) : (
              <path d="M15 19l-7-7 7-7" />
            )}
          </svg>
        </button>
      </div>
      {visible && (
        <>
          <div className={styles.searchWrap}>
            <input
              type="text"
              className={styles.search}
              placeholder="Search members"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search members"
            />
          </div>
          <div className={styles.list}>
            {!hasContent ? (
              <div className={styles.empty}>{search ? 'No members match' : 'No members'}</div>
            ) : useSections ? (
              filteredSections.map((sec) => (
                <div key={sec.roleId ?? sec.type} className={styles.section}>
                  <div className={sec.type === 'offline' ? styles.sectionHeaderOffline : styles.sectionHeader}>
                    {sec.type === 'role' && `${sec.roleName}:`}
                    {sec.type === 'online' && 'Online:'}
                    {sec.type === 'offline' && 'Offline:'}
                  </div>
                  {sec.members.map((m) => (
                    <MemberRow
                      key={m.id}
                      m={m}
                      offline={sec.type === 'offline'}
                      onClick={guildId ? () => openUserProfile(m.id, guildId) : undefined}
                    />
                  ))}
                </div>
              ))
            ) : (
              flatMembers.map((m) => (
                <MemberRow
                  key={m.id}
                  m={m}
                  offline={false}
                  onClick={guildId ? () => openUserProfile(m.id, guildId) : undefined}
                />
              ))
            )}
          </div>
        </>
      )}
    </aside>
  );
}

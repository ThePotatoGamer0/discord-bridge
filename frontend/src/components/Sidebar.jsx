import { Link } from 'react-router-dom';
import styles from './Sidebar.module.css';
import { apiUrl } from '../api';
import { useContextMenu } from '../context/ContextMenuContext';

// ─── Icons ────────────────────────────────────────────────────────────────
const IconCopy   = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const IconLink   = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
const IconInvite = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>;
const IconOpen   = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;
const IconAvatar = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconSave   = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const IconImg    = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>;

function ChannelIcon({ type }) {
  if (type === 2 || type === 13) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zm5.3 9.1a1 1 0 0 0-1 1 4.3 4.3 0 0 1-8.6 0 1 1 0 0 0-2 0 6.3 6.3 0 0 0 5.3 6.22V19H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-1.68A6.3 6.3 0 0 0 18.3 11.1a1 1 0 0 0-1-1z"/>
      </svg>
    );
  }
  if (type === 11 || type === 12) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={styles.threadIcon} aria-hidden>
        <path d="M4 4h7a3 3 0 0 1 3 3v1.5h-1.5V7a1.5 1.5 0 0 0-1.5-1.5H4v9A1.5 1.5 0 0 0 5.5 16H7v1.5A3 3 0 0 1 4 14.5V4zm9 6h5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zm0 1.5a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h5a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5h-5z"/>
      </svg>
    );
  }
  return <span className={styles.hash}>#</span>;
}

function isVoice(type) { return type === 2 || type === 13; }
function isText(type)  { return type !== 2 && type !== 13 && type !== 4; }
/** Public / private thread channel types */
function isThreadChannel(type) { return type === 11 || type === 12; }

async function getOrCopyInvite(guildId) {
  if (!guildId) return { ok: false, error: 'No server selected' };
  try {
    const res = await fetch(apiUrl('/channels/invite'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId }),
    });
    const data = await res.json();
    if (data.url) {
      await navigator.clipboard.writeText(data.url);
      return { ok: true };
    }
    return { ok: false, error: data.error };
  } catch {
    return { ok: false, error: 'Network error' };
  }
}

async function copyImageToClipboard(src) {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
  } catch {
    await navigator.clipboard.writeText(src);
  }
}

export default function Sidebar({ guildName, guildId, channels, activeChannel, onSelectChannel, user, connected, onLogout }) {
  const { showContextMenu } = useContextMenu();

  const categories = channels
    .filter(c => c.type === 4)
    .sort((a, b) => a.rawPosition - b.rawPosition);

  const uncategorized = channels
    .filter(c => c.type !== 4 && !c.parentId && !isThreadChannel(c.type))
    .sort((a, b) => a.rawPosition - b.rawPosition);

  function getThreadsForParent(parentId) {
    return channels
      .filter(c => isThreadChannel(c.type) && c.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function getChildren(categoryId) {
    const children = channels.filter(c => c.parentId === categoryId && c.type !== 4 && !isThreadChannel(c.type));
    const text  = children.filter(c => isText(c.type)).sort((a, b) => a.rawPosition - b.rawPosition);
    const voice = children.filter(c => isVoice(c.type)).sort((a, b) => a.rawPosition - b.rawPosition);
    return [...text, ...voice];
  }

  const serverItems = [
    { label: 'Copy Server ID',   icon: IconCopy,   onClick: () => navigator.clipboard.writeText(guildId ?? '') },
    { label: 'Copy Invite Link', icon: IconInvite, onClick: async () => {
      const result = await getOrCopyInvite(guildId);
      if (!result.ok) alert(`Could not create invite: ${result.error}`);
    }},
  ];

  const avatarUrl = user?.discord?.discord_avatar
    ? `https://cdn.discordapp.com/avatars/${user.discord.discord_id}/${user.discord.discord_avatar}.png`
    : null;

  const userItems = () => {
    const userLink = `https://discord.com/users/${user?.discord?.discord_id}`;
    const items = [];
    if (avatarUrl) {
      items.push(
        { label: 'Open Avatar',  icon: IconImg,  onClick: () => window.open(avatarUrl, '_blank') },
        { label: 'Copy Avatar',  icon: IconImg,  onClick: () => copyImageToClipboard(avatarUrl) },
        { label: 'Save Avatar',  icon: IconSave, onClick: () => {
          const a = document.createElement('a');
          a.href = avatarUrl;
          a.download = `${user?.discord?.discord_handle ?? 'avatar'}.png`;
          a.click();
        }},
        { type: 'divider' },
      );
    }
    items.push(
      { label: 'Copy User ID',    icon: IconCopy, onClick: () => navigator.clipboard.writeText(user?.discord?.discord_id ?? '') },
      { label: 'Copy User Link',  icon: IconLink, onClick: () => navigator.clipboard.writeText(userLink) },
      { label: 'Open in Discord', icon: IconOpen, onClick: () => window.open(userLink, '_blank') },
    );
    return items;
  };

  const handleHeaderContextMenu = (e) => {
    e.stopPropagation();
    showContextMenu(e, serverItems);
  };

  const handleChannelContextMenu = (e, channel) => {
    e.stopPropagation();
    const channelLink = `https://discord.com/channels/${guildId}/${channel.id}`;
    showContextMenu(e, [
      { label: 'Copy Channel ID',   icon: IconCopy, onClick: () => navigator.clipboard.writeText(channel.id) },
      { label: 'Copy Channel Link', icon: IconLink, onClick: () => navigator.clipboard.writeText(channelLink) },
      { label: 'Open in Discord',   icon: IconOpen, onClick: () => window.open(channelLink, '_blank') },
    ]);
  };

  const handleAvatarContextMenu = (e) => {
    e.stopPropagation();
    showContextMenu(e, userItems());
  };

  function ChannelButton({ channel, nested }) {
    return (
      <button
        className={`${styles.channel} ${nested ? styles.channelNested : ''} ${activeChannel?.id === channel.id ? styles.active : ''} ${isVoice(channel.type) ? styles.voice : ''}`}
        onClick={() => onSelectChannel(channel)}
        onContextMenu={(e) => handleChannelContextMenu(e, channel)}
      >
        <ChannelIcon type={channel.type} />
        <span className={styles.channelName}>{channel.name}</span>
      </button>
    );
  }

  return (
    <div
      className={styles.sidebar}
      onContextMenu={(e) => {
        // Catch-all for anything not handled by a child
        showContextMenu(e, serverItems);
      }}
    >
      {/* Server header */}
      <div
        className={styles.header}
        onContextMenu={handleHeaderContextMenu}
      >
        <span className={styles.serverName}>{guildName}</span>
        <span className={`${styles.dot} ${connected ? styles.online : styles.offline}`} />
      </div>

      {/* Channel list — server context menu on background gaps */}
      <div
        className={styles.channels}
        onContextMenu={(e) => {
          e.stopPropagation();
          // Only show if clicking the scroll area itself, not a channel button
          if (e.target === e.currentTarget) showContextMenu(e, serverItems);
        }}
      >
        {uncategorized.map((c) => (
          <div key={c.id} className={styles.channelGroup}>
            <ChannelButton channel={c} />
            {isText(c.type) && getThreadsForParent(c.id).map((t) => (
              <ChannelButton key={t.id} channel={t} nested />
            ))}
          </div>
        ))}
        {categories.map(cat => (
          <div
            key={cat.id}
            className={styles.category}
            onContextMenu={(e) => {
              // Category background → server items, but let channel buttons handle their own
              if (e.target === e.currentTarget ||
                  e.target.classList.contains(styles.categoryName) ||
                  e.target.closest(`.${styles.categoryName}`)) {
                e.stopPropagation();
                showContextMenu(e, serverItems);
              }
            }}
          >
            <div className={styles.categoryName}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className={styles.categoryArrow}>
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
              </svg>
              {cat.name}
            </div>
            {getChildren(cat.id).map((c) => (
              <div key={c.id} className={styles.channelGroup}>
                <ChannelButton channel={c} />
                {isText(c.type) && getThreadsForParent(c.id).map((t) => (
                  <ChannelButton key={t.id} channel={t} nested />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Footer — user context menu everywhere except avatar which has its own */}
      <div
        className={styles.footer}
        onContextMenu={(e) => {
          e.stopPropagation();
          showContextMenu(e, userItems());
        }}
      >
        <div className={styles.userInfo}>
          <div
            className={styles.avatar}
            onContextMenu={handleAvatarContextMenu}
            style={{ cursor: 'context-menu' }}
          >
            {avatarUrl
              ? <img src={avatarUrl} alt={user?.username} loading="lazy" decoding="async" />
              : <span>{user?.username?.[0]?.toUpperCase()}</span>
            }
          </div>
          <div className={styles.userNames}>
            <span className={styles.displayName}>
              {user?.discord?.discord_display_name ?? user?.discord?.discord_handle ?? user?.username}
            </span>
            <span className={styles.siteUsername}>@{user?.username}</span>
          </div>
        </div>
        <div className={styles.footerActions}>
          <Link to="/links" className={styles.iconBtn} title="Account Links">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </Link>
          <button className={styles.iconBtn} onClick={onLogout} title="Logout">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16,17 21,12 16,7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
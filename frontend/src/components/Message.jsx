import { useState, useEffect, Fragment } from 'react';
import emojiRegex from 'emoji-regex';
import styles from './Message.module.css';
import ImageModal from './ImageModal';
import { useContextMenu } from '../context/ContextMenuContext';
import { useEmojiPicker } from '../context/EmojiPickerContext';
import { useUserProfile } from '../context/UserProfileContext';
import { twemojiUrl, SHORTCODE_TO_CHAR } from '../data/emojiData';
import { apiUrl } from '../api';
import Reactions from './Reactions';

const EMOJI_RE = emojiRegex();

/** True if content is only emojis (unicode, :shortcode:, <:id>) and count is 1–4. */
function isEmojiOnlyFew(content) {
  if (!content || !content.trim()) return false;
  let s = content.trim();
  let count = 0;
  s = s.replace(/<(a?):(\w+):(\d+)>/g, () => { count++; return ''; });
  s = s.replace(/:([a-zA-Z0-9_]+):/g, (m, name) => {
    if (SHORTCODE_TO_CHAR[name.toLowerCase()]) { count++; return ''; }
    return m;
  });
  const re = new RegExp(EMOJI_RE.source, EMOJI_RE.flags);
  let m;
  while ((m = re.exec(s)) !== null) count++;
  s = s.replace(re, '');
  return s.replace(/\s/g, '').length === 0 && count > 0 && count < 5;
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit'
  });
}

function formatDate(timestamp) {
  const d = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString();
}

// ─── Discord Markdown Parser ──────────────────────────────────────────────

function EveryoneHereMention({ which }) {
  const label = which === 'everyone' ? 'everyone' : 'here';
  return (
    <span className={styles.roleMention} title={`@${label}`}>
      @{label}
    </span>
  );
}

function RoleMention({ roleId, roleNameById }) {
  const label = roleNameById?.[roleId] ?? 'unknown-role';
  return (
    <span className={styles.roleMention} title={`@${label}`}>
      @{label}
    </span>
  );
}

function ChannelMention({ channelId, channelNameById }) {
  const label = channelNameById?.[channelId] ?? 'unknown-channel';
  return (
    <span
      className={styles.channelMention}
      onClick={() => window.dispatchEvent(
        new CustomEvent('bridge:navigate-channel', { detail: { channelId } })
      )}
      title={`#${label}`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 2, verticalAlign: 'middle' }}>
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
      </svg>
      #{label}
    </span>
  );
}

/** Replaces Unicode emoji in plain text with Twemoji images (Discord-style). */
function renderTextWithTwemoji(text, keyPrefix) {
  if (!text) return null;
  const out = [];
  let last = 0;
  let i = 0;
  const re = new RegExp(EMOJI_RE.source, EMOJI_RE.flags);
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <img
        key={`${keyPrefix}-e${i++}`}
        src={twemojiUrl(m[0])}
        alt={m[0]}
        style={{ width: '22px', height: '22px', verticalAlign: 'middle', margin: '0 1px' }}
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  if (out.length === 0) return null;
  if (out.length === 1) return out[0];
  return <Fragment key={keyPrefix}>{out}</Fragment>;
}

function UserMention({ userId, userDisplayById, guildId }) {
  const { openUserProfile } = useUserProfile();
  const label = userDisplayById?.[userId] ?? 'unknown-user';
  const handleClick = guildId ? () => openUserProfile(userId, guildId) : undefined;
  return (
    <span
      className={styles.userMention}
      title={`@${label}`}
      onClick={handleClick}
      onKeyDown={handleClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } } : undefined}
      role={handleClick ? 'button' : undefined}
      tabIndex={handleClick ? 0 : undefined}
      style={handleClick ? { cursor: 'pointer' } : undefined}
    >
      @{label}
    </span>
  );
}

function parseInline(text, keyPrefix = '', channelNameById, userDisplayById, roleNameById = null, guildId = '') {
  if (!text) return null;

  const patterns = [
    { re: /@(everyone|here)(?!\S)/g, render: (m, key) => (
      <EveryoneHereMention key={key} which={m[1]} />
    )},
    { re: /<@&(\d+)>/g, render: (m, key) => (
      <RoleMention key={key} roleId={m[1]} roleNameById={roleNameById} />
    )},
    { re: /<@!?(\d+)>/g, render: (m, key) => (
      <UserMention key={key} userId={m[1]} userDisplayById={userDisplayById} guildId={guildId} />
    )},
    { re: /<#(\d+)>/g, render: (m, key) => (
      <ChannelMention key={key} channelId={m[1]} channelNameById={channelNameById} />
    )},
    { re: /<(a?):(\w+):(\d+)>/g, render: (m, key) => {
      const animated = m[1] === 'a';
      const ext = animated ? 'gif' : 'webp';
      return (
        <img
          key={key}
          src={`https://cdn.discordapp.com/emojis/${m[3]}.${ext}?size=32`}
          alt={`:${m[2]}:`}
          title={`:${m[2]}:`}
          loading="lazy"
          decoding="async"
          style={{ width: '22px', height: '22px', verticalAlign: 'middle', margin: '0 1px' }}
        />
      );
    }},
    { re: /:([a-zA-Z0-9_]+):/g, render: (m, key) => {
      const char = SHORTCODE_TO_CHAR[m[1].toLowerCase()];
      if (!char) return null;
      return (
        <img
          key={key}
          src={twemojiUrl(char)}
          alt={`:${m[1]}:`}
          title={`:${m[1]}:`}
          style={{ width: '22px', height: '22px', verticalAlign: 'middle', margin: '0 1px' }}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      );
    }},
    { re: /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, render: (m, key) => (
      <a key={key} href={m[2]} target="_blank" rel="noopener noreferrer" className={styles.mdLink}>
        {m[1]}
      </a>
    )},
    { re: /`([^`]+)`/g, render: (m, key) => (
      <code key={key} className={styles.inlineCode}>{m[1]}</code>
    )},
    { re: /\*{3}(.+?)\*{3}/g, render: (m, key) => (
      <strong key={key}><em>{parseInline(m[1], key + 'bi', channelNameById, userDisplayById, roleNameById, guildId)}</em></strong>
    )},
    { re: /\*{2}(.+?)\*{2}/g, render: (m, key) => (
      <strong key={key}>{parseInline(m[1], key + 'b', channelNameById, userDisplayById, roleNameById, guildId)}</strong>
    )},
    { re: /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, render: (m, key) => (
      <em key={key}>{parseInline(m[1] ?? m[2], key + 'i', channelNameById, userDisplayById, roleNameById, guildId)}</em>
    )},
    { re: /__(.+?)__/g, render: (m, key) => (
      <span key={key} className={styles.mdUnderline}>{parseInline(m[1], key + 'u', channelNameById, userDisplayById, roleNameById, guildId)}</span>
    )},
    { re: /~~(.+?)~~/g, render: (m, key) => (
      <del key={key}>{parseInline(m[1], key + 's', channelNameById, userDisplayById, roleNameById, guildId)}</del>
    )},
    { re: /\|\|(.+?)\|\|/g, render: (m, key) => (
      <Spoiler key={key}>{parseInline(m[1], key + 'sp', channelNameById, userDisplayById, roleNameById, guildId)}</Spoiler>
    )},
  ];

  const combined = new RegExp(patterns.map(p => p.re.source).join('|'), 'g');
  const parts = [];
  let last = 0;
  let match;

  while ((match = combined.exec(text)) !== null) {
    if (match.index > last) {
      const segment = text.slice(last, match.index);
      parts.push(renderTextWithTwemoji(segment, `${keyPrefix}-${last}`) ?? segment);
    }
    let rendered = null;
    for (const pattern of patterns) {
      pattern.re.lastIndex = 0;
      const specific = pattern.re.exec(match[0]);
      if (specific) {
        rendered = pattern.render(specific, `${keyPrefix}-${match.index}`);
        break;
      }
    }
    parts.push(rendered ?? match[0]);
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    const segment = text.slice(last);
    parts.push(renderTextWithTwemoji(segment, `${keyPrefix}-${last}`) ?? segment);
  }
  return parts.length === 0 ? null
    : parts.length === 1 && typeof parts[0] === 'string' ? parts[0]
    : parts;
}

function Spoiler({ children }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      className={`${styles.spoiler} ${revealed ? styles.spoilerRevealed : ''}`}
      onClick={() => setRevealed(r => !r)}
      title={revealed ? 'Click to hide' : 'Click to reveal'}
    >
      {children}
    </span>
  );
}

function renderContent(content, block = true, channelNameById, userDisplayById, roleNameById = null, guildId = '') {
  if (!content) return null;
  if (!block) return parseInline(content, 'inline', channelNameById, userDisplayById, roleNameById, guildId);

  const lines = content.split('\n');
  const result = [];
  let i = 0;
  let keyCounter = 0;
  const key = () => `block-${keyCounter++}`;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trimStart().startsWith('```')) {
      const lang = line.trimStart().slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      result.push(
        <pre key={key()} className={styles.codeBlock}>
          {lang && <span className={styles.codeLang}>{lang}</span>}
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      i++;
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const Tag = `h${level}`;
      result.push(
        <Tag key={key()} className={styles[`heading${level}`]}>
          {parseInline(headingMatch[2], key(), channelNameById, userDisplayById, roleNameById, guildId)}
        </Tag>
      );
      i++;
      continue;
    }

    if (line.startsWith('>>> ')) {
      const quoteLines = [line.slice(4)];
      i++;
      while (i < lines.length) { quoteLines.push(lines[i]); i++; }
      result.push(
        <blockquote key={key()} className={styles.blockquote}>
          {renderContent(quoteLines.join('\n'), true, channelNameById, userDisplayById, roleNameById, guildId)}
        </blockquote>
      );
      continue;
    }

    if (line.startsWith('> ')) {
      const quoteLines = [line.slice(2)];
      i++;
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      result.push(
        <blockquote key={key()} className={styles.blockquote}>
          {renderContent(quoteLines.join('\n'), true, channelNameById, userDisplayById, roleNameById, guildId)}
        </blockquote>
      );
      continue;
    }

    if (line.startsWith('-# ')) {
      result.push(
        <span key={key()} className={styles.subtext}>
          {parseInline(line.slice(3), key(), channelNameById, userDisplayById, roleNameById, guildId)}
        </span>
      );
      i++;
      continue;
    }

    if (line === '') {
      result.push(<br key={key()} />);
    } else {
      result.push(
        <span key={key()} style={{ display: 'block' }}>
          {parseInline(line, key(), channelNameById, userDisplayById, roleNameById, guildId)}
        </span>
      );
    }
    i++;
  }

  return result;
}

// ─── End Parser ───────────────────────────────────────────────────────────

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
const IMAGE_EXTS  = /\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i;

function getPlaceholderSize(width, height, maxW = 400, maxH = 300) {
  if (!width || !height) return { width: maxW, height: 200 };
  const ratio = Math.min(maxW / width, maxH / height, 1);
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

// ─── Icon helpers ─────────────────────────────────────────────────────────
const IconCopy    = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const IconSave    = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const IconLink    = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
const IconOpen    = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;
const IconText    = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>;
const IconAvatar  = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconReact   = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
const IconPollEnd = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;

async function copyImageToClipboard(src) {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
  } catch {
    await navigator.clipboard.writeText(src);
  }
}

function saveImage(src, name = 'image') {
  const a = document.createElement('a');
  a.href = src;
  a.download = name;
  a.target = '_blank';
  a.click();
}

// ─── LazyImage ────────────────────────────────────────────────────────────

function LazyImage({ src, alt, className, maxWidth = 400, maxHeight = 300, width, height }) {
  const [loaded,    setLoaded]    = useState(false);
  const [error,     setError]     = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { showContextMenu }       = useContextMenu();

  const size = getPlaceholderSize(width, height, maxWidth, maxHeight);

  useEffect(() => {
    const timer = setTimeout(() => { if (!loaded) setLoaded(true); }, 4000);
    return () => clearTimeout(timer);
  }, [src]);

  const handleContextMenu = (e) => {
    showContextMenu(e, [
      { label: 'Copy Image', icon: IconCopy, onClick: () => copyImageToClipboard(src) },
      { label: 'Save Image', icon: IconSave, onClick: () => saveImage(src, alt) },
      { type: 'divider' },
      { label: 'Copy Link',  icon: IconLink, onClick: () => navigator.clipboard.writeText(src) },
      { label: 'Open Link',  icon: IconOpen, onClick: () => window.open(src, '_blank') },
    ]);
  };

  return (
    <>
      <div
        style={{
          display: 'inline-block',
          position: 'relative',
          width: loaded ? 'auto' : size.width,
          height: loaded ? 'auto' : size.height,
          maxWidth,
          maxHeight,
          cursor: loaded && !error ? 'pointer' : 'default',
        }}
        onClick={loaded && !error ? () => setModalOpen(true) : undefined}
        onContextMenu={loaded && !error ? handleContextMenu : undefined}
      >
        {!loaded && !error && (
          <div className={styles.shimmer} style={{ width: size.width, height: size.height, borderRadius: 6 }} />
        )}
        {!error && (
          <img
            src={src}
            alt={alt}
            className={className}
            loading="lazy"
            decoding="async"
            style={{ display: loaded ? 'block' : 'none', maxWidth, maxHeight, borderRadius: 6, objectFit: 'contain' }}
            onLoad={() => setLoaded(true)}
            onError={() => { setError(true); setLoaded(true); }}
          />
        )}
        {error && (
          <div className={styles.imgError} style={{ width: size.width }}>Failed to load image</div>
        )}
      </div>

      {modalOpen && (
        <ImageModal src={src} alt={alt} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}

// ─── VideoEmbed ───────────────────────────────────────────────────────────

function VideoEmbed({ src }) {
  const { showContextMenu } = useContextMenu();

  const handleContextMenu = (e) => {
    showContextMenu(e, [
      { label: 'Copy Link', icon: IconLink, onClick: () => navigator.clipboard.writeText(src) },
      { label: 'Open Link', icon: IconOpen, onClick: () => window.open(src, '_blank') },
    ]);
  };

  return (
    <video
      src={src}
      autoPlay loop muted playsInline
      className={styles.attachmentImage}
      style={{ maxWidth: 400, maxHeight: 300, borderRadius: 6, cursor: 'context-menu' }}
      onContextMenu={handleContextMenu}
    />
  );
}

// ─── Attachments ─────────────────────────────────────────────────────────

function MessageThreadLink({ thread }) {
  if (!thread?.id || !thread.name) return null;
  const ch = {
    id: thread.id,
    name: thread.name,
    type: 11,
    parentId: thread.parentId ?? null,
    position: 0,
    rawPosition: 0,
  };
  return (
    <div className={styles.threadBanner}>
      <button
        type="button"
        className={styles.threadLinkBtn}
        onClick={() => window.dispatchEvent(
          new CustomEvent('bridge:navigate-channel', { detail: { channelId: thread.id, channel: ch } })
        )}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M4 4h7a3 3 0 0 1 3 3v1.5h-1.5V7a1.5 1.5 0 0 0-1.5-1.5H4v9A1.5 1.5 0 0 0 5.5 16H7v1.5A3 3 0 0 1 4 14.5V4zm9 6h5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zm0 1.5a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h5a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5h-5z"/>
        </svg>
        <span>Open thread: {thread.name}</span>
      </button>
    </div>
  );
}

function formatPollCountdown(expiresAt) {
  if (!expiresAt) return null;
  const now = Date.now();
  const left = expiresAt - now;
  if (left <= 0) return 'Ended';
  const s = Math.floor((left / 1000) % 60);
  const m = Math.floor((left / 60000) % 60);
  const h = Math.floor((left / 3600000) % 24);
  const d = Math.floor(left / 86400000);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || (d === 0 && h === 0)) parts.push(`${m}m`);
  if (d === 0 && h === 0 && m < 60) parts.push(`${s}s`);
  return parts.join(' ') + ' left';
}

function MessagePoll({ poll }) {
  if (!poll?.question) return null;
  const [countdown, setCountdown] = useState(() => formatPollCountdown(poll.expiresAt));
  const answers = Array.isArray(poll.answers) ? poll.answers : [];
  const totalVotes = answers.reduce((sum, a) => sum + (a.voteCount ?? 0), 0);

  useEffect(() => {
    if (!poll.expiresAt || poll.expiresAt <= Date.now()) return;
    const tick = () => setCountdown(formatPollCountdown(poll.expiresAt));
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [poll.expiresAt]);

  return (
    <div className={styles.messagePoll}>
      <div className={styles.pollHeader}>
        <div className={styles.pollBadge}>Poll</div>
        {countdown && <span className={styles.pollCountdown}>{countdown}</span>}
      </div>
      <div className={styles.pollQuestion}>{poll.question}</div>
      <ul className={styles.pollAnswers}>
        {answers.map((a) => {
          const count = a.voteCount ?? 0;
          const percent = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
          return (
            <li key={a.id} className={styles.pollAnswer}>
              <div
                className={styles.pollAnswerBar}
                style={{ width: `${percent}%` }}
                aria-hidden
              />
              <span className={styles.pollAnswerText}>{a.text}</span>
              <span className={styles.pollCount}>{count}</span>
            </li>
          );
        })}
      </ul>
      {poll.allowMultiselect && (
        <div className={styles.pollMeta}>Multiple answers allowed</div>
      )}
    </div>
  );
}

function Attachments({ attachments }) {
  if (!attachments?.length) return null;
  return (
    <div className={styles.attachments}>
      {attachments.map(a => {
        const isImage = IMAGE_TYPES.includes(a.contentType) || IMAGE_EXTS.test(a.name);
        if (isImage) {
          return (
            <LazyImage
              key={a.id}
              src={a.url}
              alt={a.name}
              className={styles.attachmentImage}
              width={a.width}
              height={a.height}
              maxWidth={400}
              maxHeight={300}
            />
          );
        }
        const kb = (a.size / 1024).toFixed(1);
        const mb = (a.size / 1024 / 1024).toFixed(1);
        const size = a.size > 1024 * 1024 ? `${mb} MB` : `${kb} KB`;
        return (
          <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className={styles.fileAttachment}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
            </svg>
            <div className={styles.fileInfo}>
              <span className={styles.fileName}>{a.name}</span>
              <span className={styles.fileSize}>{size}</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 'auto', flexShrink: 0 }}>
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zm-8 2V5h2v6h1.17L12 13.17 9.83 11H11zm-6 7h14v2H5v-2z"/>
            </svg>
          </a>
        );
      })}
    </div>
  );
}

// ─── Embeds ───────────────────────────────────────────────────────────────

const POLL_CLOSURE_AUTHOR_RE = /^(.+?)'s? poll (.+?) has closed\.?$/i;

function fieldMap(fields) {
  const map = {};
  const lower = {};
  for (const f of fields ?? []) {
    if (f?.name != null) {
      map[f.name] = f.value ?? '';
      lower[f.name.toLowerCase()] = f.value ?? '';
    }
  }
  return { map, lower };
}

function hasPollClosureFields(fieldsResult) {
  const { lower } = fieldsResult;
  const norm = (s) => (s ?? '').toLowerCase().replace(/_/g, '');
  if (Object.keys(lower).some((k) => norm(k) === 'pollquestiontext' || norm(k) === 'victoranswertext')) return true;
  return Object.keys(lower).some((k) =>
    norm(k).includes('pollquestion') || norm(k).includes('victoranswer')
  );
}

function getFieldByKey(fieldsLower, fields, ...keys) {
  for (const k of keys) {
    const v = fieldsLower[k] ?? fields[k];
    if (v != null && v !== '') return v;
  }
  const allLower = Object.keys(fieldsLower);
  for (const key of keys) {
    const match = allLower.find((lk) => lk.includes(key.replace(/_/g, '')) || lk.replace(/_/g, '').includes(key.replace(/_/g, '')));
    if (match) return fieldsLower[match];
  }
  return '';
}

function PollClosureEmbed({ e, channelNameById, userDisplayById, roleNameById, guildId, channelId, messageId, displayName: messageAuthorName }) {
  const fieldsResult = fieldMap(e.fields);
  const { map: fields, lower: fieldsLower } = fieldsResult;
  const hasRawFields = hasPollClosureFields(fieldsResult);

  let displayName, pollQuestion, winningAnswer, metaText;
  if (hasRawFields) {
    displayName = messageAuthorName ?? '';
    pollQuestion = getFieldByKey(fieldsLower, fields, 'pollquestiontext', 'poll_question_text');
    winningAnswer = getFieldByKey(fieldsLower, fields, 'victoranswertext', 'victor_answer_text');
    const votesVal = getFieldByKey(fieldsLower, fields, 'victoranswervotes', 'victor_answer_votes');
    const totalVal = getFieldByKey(fieldsLower, fields, 'total_votes', 'totalvotes');
    const votes = parseInt(votesVal || '0', 10);
    const total = parseInt(totalVal || '0', 10);
    const percent = total > 0 ? Math.round((votes / total) * 100) : 0;
    metaText = `Winning answer • ${percent}%`;
  } else {
    const authorMatch = e.author?.name?.match(POLL_CLOSURE_AUTHOR_RE);
    displayName = authorMatch?.[1] ?? messageAuthorName ?? '';
    pollQuestion = authorMatch?.[2] ?? '';
    const firstField = e.fields?.[0];
    winningAnswer = firstField?.name ?? '';
    metaText = firstField?.value ?? e.footer?.text ?? '';
  }

  const viewPollUrl = e.url || (guildId && channelId && messageId
    ? `https://discord.com/channels/${guildId}/${channelId}/${messageId}`
    : null);

  return (
    <div className={styles.pollClosureEmbed}>
      <div className={styles.pollClosureHeader}>
        {e.author?.iconURL ? (
          <img src={e.author.iconURL} alt="" className={styles.pollClosureIcon} />
        ) : (
          <span className={styles.pollClosureListIcon} aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="6" width="16" height="2" rx="1"/>
              <rect x="4" y="11" width="12" height="2" rx="1"/>
              <rect x="4" y="16" width="8" height="2" rx="1"/>
            </svg>
          </span>
        )}
        <span className={styles.pollClosureHeaderText}>
          <span className={styles.pollClosureDisplayName}>{displayName}</span>
          <span className={styles.pollClosureMuted}>'s poll </span>
          <strong className={styles.pollClosureQuestion}>{pollQuestion}</strong>
          <span className={styles.pollClosureMuted}> has closed.</span>
          {e.footer?.text && (
            <span className={styles.pollClosureTimestamp}>{e.footer.text}</span>
          )}
        </span>
      </div>
      <div className={styles.pollClosureCard}>
        <div className={styles.pollClosureResult}>
          <div className={styles.pollClosureWinnerRow}>
            <strong className={styles.pollClosureWinnerText}>{renderContent(winningAnswer, false, channelNameById, userDisplayById, roleNameById, guildId)}</strong>
            <span className={styles.pollClosureTick} aria-hidden>✓</span>
          </div>
          {metaText && (
            <div className={styles.pollClosureMeta}>
              {renderContent(metaText, false, channelNameById, userDisplayById, roleNameById, guildId)}
            </div>
          )}
        </div>
        {viewPollUrl && (
          <a
            href={viewPollUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.pollClosureViewBtn}
          >
            View Poll
          </a>
        )}
      </div>
    </div>
  );
}

const MESSAGE_TYPE_POLL_RESULT = 46;

function isPollClosureEmbed(e, { messageType } = {}) {
  if (messageType === MESSAGE_TYPE_POLL_RESULT && e?.fields?.length) return true;
  if (e?.type === 'poll_result') return true;
  if (e?.fields?.length && hasPollClosureFields(fieldMap(e.fields))) return true;
  return e?.author?.name && POLL_CLOSURE_AUTHOR_RE.test(e.author.name);
}

function Embeds({ embeds, channelNameById, userDisplayById, roleNameById, guildId = '', channelId = '', messageId = '', messageAuthorName = '', messageType }) {
  if (!embeds?.length) return null;
  return (
    <div className={styles.embeds}>
      {embeds.map((e, i) => {
        const embedKey = `embed-${i}`;
        if (isPollClosureEmbed(e, { messageType })) {
          return (
            <PollClosureEmbed
              key={embedKey}
              e={e}
              channelNameById={channelNameById}
              userDisplayById={userDisplayById}
              roleNameById={roleNameById}
              guildId={guildId}
              channelId={channelId}
              messageId={messageId}
              displayName={messageAuthorName}
            />
          );
        }

        if (e.type === 'gifv' || e.video) {
          const src = e.video?.url ?? e.thumbnail?.url;
          if (src) {
            return (
              <div key={embedKey} className={styles.embedGif}>
                {e.type === 'gifv'
                  ? <VideoEmbed src={src} />
                  : <LazyImage src={e.thumbnail?.url} alt={e.title ?? 'gif'} maxWidth={400} maxHeight={300} width={e.video?.width} height={e.video?.height} />
                }
              </div>
            );
          }
        }

        if (e.type === 'image' && e.image) {
          return (
            <LazyImage
              key={embedKey}
              src={e.image.url}
              alt={e.title ?? 'image'}
              maxWidth={400}
              maxHeight={300}
              width={e.image.width}
              height={e.image.height}
            />
          );
        }

        if (e.title || e.description || e.image || e.thumbnail || e.author || e.footer || e.fields?.length) {
          const borderColor = e.color
            ? `#${e.color.toString(16).padStart(6, '0')}`
            : 'var(--ui-border)';
          return (
            <div key={embedKey} className={styles.richEmbed} style={{ borderLeftColor: borderColor }}>
              {e.provider?.name && (
                <div className={styles.embedProvider}>{renderContent(e.provider.name, false, channelNameById, userDisplayById, roleNameById, guildId)}</div>
              )}
              {e.author?.name && (
                <div className={styles.embedAuthor}>
                  {e.author.iconURL && (
                    <img src={e.author.iconURL} alt="" className={styles.embedAuthorIcon} />
                  )}
                  {e.author.url ? (
                    <a href={e.author.url} target="_blank" rel="noopener noreferrer" className={styles.embedAuthorName}>
                      {renderContent(e.author.name, false, channelNameById, userDisplayById, roleNameById, guildId)}
                    </a>
                  ) : (
                    <span className={styles.embedAuthorName}>{renderContent(e.author.name, false, channelNameById, userDisplayById, roleNameById, guildId)}</span>
                  )}
                </div>
              )}
              {e.title && (
                <a href={e.url ?? '#'} target="_blank" rel="noopener noreferrer" className={styles.embedTitle}>
                  {renderContent(e.title, false, channelNameById, userDisplayById, roleNameById, guildId)}
                </a>
              )}
              {e.description && (
                <div className={styles.embedDescription}>{renderContent(e.description, true, channelNameById, userDisplayById, roleNameById, guildId)}</div>
              )}
              {e.fields?.length > 0 && (
                <div className={styles.embedFields}>
                  {e.fields.map((f, fi) => (
                    <div key={f.name ? `field-${f.name}-${fi}` : `field-${fi}`} className={`${styles.embedField} ${f.inline ? styles.embedFieldInline : ''}`}>
                      <div className={styles.embedFieldName}>{renderContent(f.name, false, channelNameById, userDisplayById, roleNameById, guildId)}</div>
                      <div className={styles.embedFieldValue}>{renderContent(f.value, true, channelNameById, userDisplayById, roleNameById, guildId)}</div>
                    </div>
                  ))}
                </div>
              )}
              {e.image && (
                <LazyImage src={e.image.url} alt={e.title ?? 'embed'} className={styles.embedImage} maxWidth={480} maxHeight={300} width={e.image.width} height={e.image.height} />
              )}
              {!e.image && e.thumbnail && (
                <LazyImage src={e.thumbnail.url} alt="thumbnail" className={styles.embedThumbnail} maxWidth={80} maxHeight={80} />
              )}
              {e.footer?.text && (
                <div className={styles.embedFooter}>
                  {e.footer.iconURL && <img src={e.footer.iconURL} alt="" className={styles.embedFooterIcon} />}
                  <span>{renderContent(e.footer.text, false, channelNameById, userDisplayById, roleNameById, guildId)}</span>
                </div>
              )}
            </div>
          );
        }
        return null;
      }).filter(Boolean)}
    </div>
  );
}

// MessageType.UserJoin = 7
const MESSAGE_TYPE_USER_JOIN = 7;

// ─── Message ──────────────────────────────────────────────────────────────

export default function Message({
  message, grouped, isOwn, channelId, guildId = '', channelNameById, userDisplayById, roleNameById = null, currentUser, myReactions = [], onReactionToggle, onPollExpired
}) {
  const { showContextMenu } = useContextMenu();
  const { showEmojiPicker } = useEmojiPicker();
  const { openUserProfile } = useUserProfile();
  const isJoinMessage = message.type === MESSAGE_TYPE_USER_JOIN;
  const isPollResultMessage = message.type === MESSAGE_TYPE_POLL_RESULT;
  const avatarUrl = message.author?.avatar;
  const displayName = message.author?.nickname
    ?? message.author?.globalName
    ?? message.author?.username;

  const handleAvatarClick = (e) => {
    if ('button' in e && e.button !== 0) return;
    const profileUserId = message.author?.discordId ?? message.author?.id;
    if (profileUserId && guildId) openUserProfile(profileUserId, guildId);
  };

  const handleAvatarContextMenu = (e) => {
    showContextMenu(e, [
      { label: 'Open Avatar',     icon: IconAvatar, onClick: () => window.open(avatarUrl, '_blank') },
      { label: 'Copy Avatar URL', icon: IconLink,   onClick: () => navigator.clipboard.writeText(avatarUrl) },
    ]);
  };

  const handleMessageContextMenu = (e) => {
    if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') return;
    const pos = { top: e.clientY, bottom: e.clientY, left: e.clientX, right: e.clientX };
    const menuItems = [
      {
        label: 'Add Reaction',
        icon: IconReact,
        onClick: () => showEmojiPicker(pos, async (emoji) => {
          if (onReactionToggle) onReactionToggle(message.id, emoji.identifier, false);
          await fetch(apiUrl(`/reactions/${channelId}/${message.id}/${encodeURIComponent(emoji.identifier)}`), {
            method: 'POST', credentials: 'include'
          });
        })
      },
      { type: 'divider' },
      { label: 'Copy Text',       icon: IconText, onClick: () => navigator.clipboard.writeText(message.content ?? '') },
      { type: 'divider' },
      { label: 'Copy Message ID', icon: IconCopy, onClick: () => navigator.clipboard.writeText(message.id) },
    ];
    if (message.poll && message.author?.bot && onPollExpired) {
      menuItems.unshift(
        {
          label: 'Close poll now',
          icon: IconPollEnd,
          onClick: async () => {
            try {
              const res = await fetch(apiUrl(`/channels/${channelId}/messages/${message.id}/poll/expire`), {
                method: 'POST', credentials: 'include'
              });
              const data = await res.json().catch(() => ({}));
              if (res.ok && data.message) {
                onPollExpired(message.id, data.message);
              } else {
                alert(data.error || 'Failed to end poll');
              }
            } catch (err) {
              console.error(err);
              alert('Failed to end poll');
            }
          }
        },
        { type: 'divider' }
      );
    }
    showContextMenu(e, menuItems);
  };

  const messageBody = (
    <>
      {message.thread && <MessageThreadLink thread={message.thread} />}
      {message.content && (
        <div className={`${styles.text} ${isOwn ? styles.own : ''} ${isEmojiOnlyFew(message.content) ? styles.emojiOnly : ''}`}>
          {renderContent(message.content, true, channelNameById, userDisplayById, roleNameById, guildId)}
        </div>
      )}
      <Attachments attachments={message.attachments} />
      <MessagePoll poll={message.poll} />
      <Embeds
        embeds={message.embeds}
        channelNameById={channelNameById}
        userDisplayById={userDisplayById}
        roleNameById={roleNameById}
        guildId={guildId}
        channelId={channelId}
        messageId={message.id}
        messageAuthorName={displayName}
        messageType={message.type}
      />
      <Reactions
        reactions={message.reactions}
        messageId={message.id}
        channelId={channelId}
        myReactions={myReactions}
        onReactionToggle={onReactionToggle}
      />
    </>
  );

  if (isJoinMessage) {
    return (
      <div className={`${styles.message} ${styles.joinMessage}`} onContextMenu={handleMessageContextMenu}>
        <span className={styles.joinArrow} aria-hidden>→</span>
        <span className={styles.joinText}>{message.content}</span>
        <span className={styles.joinTimestamp}>{formatTime(message.timestamp)}</span>
      </div>
    );
  }

  if (isPollResultMessage) {
    return (
      <div className={`${styles.message} ${styles.joinMessage}`} onContextMenu={handleMessageContextMenu}>
        <div className={styles.joinContent}>
          {messageBody}
        </div>
        <span className={styles.joinTimestamp}>{formatTime(message.timestamp)}</span>
      </div>
    );
  }

  return (
    <div
      className={`${styles.message} ${grouped ? styles.grouped : ''}`}
      onContextMenu={handleMessageContextMenu}
    >
      {!grouped ? (
        <>
          <div
            className={styles.avatar}
            onClick={handleAvatarClick}
            onContextMenu={avatarUrl ? (e) => { e.stopPropagation(); handleAvatarContextMenu(e); } : undefined}
            style={{ cursor: 'pointer' }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleAvatarClick(e); }}
            aria-label={`View ${displayName}'s profile`}
          >
            {avatarUrl
              ? <img src={avatarUrl} alt={displayName} loading="lazy" decoding="async" />
              : <span>{displayName[0].toUpperCase()}</span>
            }
          </div>
          <div className={styles.content}>
            <div className={styles.meta}>
              <span
                className={styles.username}
                style={{ ...(message.author?.color ? { color: message.author.color } : {}), cursor: 'pointer' }}
                onClick={() => { const uid = message.author?.discordId ?? message.author?.id; if (uid && guildId) openUserProfile(uid, guildId); }}
                onKeyDown={(e) => { const uid = message.author?.discordId ?? message.author?.id; if ((e.key === 'Enter' || e.key === ' ') && uid && guildId) openUserProfile(uid, guildId); }}
                role="button"
                tabIndex={0}
              >{displayName}</span>
              {message.author?.bot && <span className={styles.botTag}>APP</span>}
              {message.siteUser && <span className={styles.siteTag}>{message.siteUser.username}</span>}
              <span className={styles.timestamp}>
                {formatDate(message.timestamp)} at {formatTime(message.timestamp)}
              </span>
            </div>
            {messageBody}
          </div>
        </>
      ) : (
        <>
          <div className={styles.groupedTime}>{formatTime(message.timestamp)}</div>
          <div className={styles.groupedText}>{messageBody}</div>
        </>
      )}
    </div>
  );
}
import { useState, useEffect, useRef } from 'react';
import { useCurrentGuild } from '../context/CurrentGuildContext';
import { EMOJI_CATEGORIES, twemojiUrl } from '../data/emojiData';
import { apiUrl } from '../api';
import styles from './EmojiPicker.module.css';

export default function EmojiPicker({ anchorRect, onSelect, onClose }) {
  const { guildId } = useCurrentGuild();
  const [search, setSearch]     = useState('');
  const [tab, setTab]           = useState(0);
  const [customEmojis, setCustomEmojis] = useState([]);
  const pickerRef = useRef(null);
  const searchRef = useRef(null);

  // Fetch server custom emojis
  useEffect(() => {
    if (!guildId) {
      setCustomEmojis([]);
      return;
    }
    fetch(apiUrl(`/emojis?guildId=${guildId}`), { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.emojis) setCustomEmojis(data.emojis); })
      .catch(() => setCustomEmojis([]));
  }, [guildId]);

  // Focus search on open
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Position the picker above or below the anchor
  useEffect(() => {
    if (!pickerRef.current || !anchorRect) return;
    const picker = pickerRef.current;
    const pickerHeight = 380;
    const pickerWidth  = 340;
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Prefer above anchor
    let top = anchorRect.top - pickerHeight - margin;
    if (top < margin) top = anchorRect.bottom + margin;

    let left = anchorRect.left;
    if (left + pickerWidth > vw - margin) left = vw - pickerWidth - margin;
    if (left < margin) left = margin;

    picker.style.top  = `${top}px`;
    picker.style.left = `${left}px`;
  }, [anchorRect]);

  // Close on outside click or Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    const handleClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) onClose();
    };
    setTimeout(() => {
      window.addEventListener('keydown', handleKey);
      window.addEventListener('mousedown', handleClick);
    }, 50);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  const allCategories = [
    ...EMOJI_CATEGORIES,
    ...(customEmojis.length > 0 ? [{
      name: 'Server',
      icon: '✨',
      custom: true,
      emojis: customEmojis
    }] : [])
  ];

  const searchResults = search.trim()
    ? allCategories.flatMap(cat =>
        cat.custom
          ? cat.emojis.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
          : cat.emojis.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.char.includes(search))
      )
    : null;

  const currentCategory = allCategories[tab];

  const handleSelect = (emoji) => {
    onSelect(emoji);
  };

  return (
    <div ref={pickerRef} className={styles.picker}>
      {/* Search */}
      <div className={styles.searchRow}>
        <input
          ref={searchRef}
          className={styles.search}
          placeholder="Search emojis..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Category tabs */}
      {!search && (
        <div className={styles.tabs}>
          {allCategories.map((cat, i) => (
            <button
              key={i}
              className={`${styles.tab} ${tab === i ? styles.tabActive : ''}`}
              onClick={() => setTab(i)}
              title={cat.name}
            >
              {cat.custom
                ? <img
                    src={`https://cdn.discordapp.com/emojis/${cat.emojis[0]?.id}.webp?size=20`}
                    style={{ width: 18, height: 18 }}
                    alt={cat.name}
                  />
                : <img src={twemojiUrl(cat.icon)} alt={cat.name} style={{ width: 18, height: 18 }} draggable={false} />
              }
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className={styles.grid}>
        {search ? (
          searchResults?.length === 0
            ? <div className={styles.empty}>No emojis found</div>
            : searchResults.map((emoji, i) => (
                <EmojiButton key={i} emoji={emoji} isCustom={'id' in emoji} onSelect={handleSelect} />
              ))
        ) : (
          <>
            <div className={styles.categoryLabel}>{currentCategory.name}</div>
            {currentCategory.emojis.map((emoji, i) => (
              <EmojiButton
                key={i}
                emoji={emoji}
                isCustom={currentCategory.custom}
                onSelect={handleSelect}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function EmojiButton({ emoji, isCustom, onSelect }) {
  if (isCustom) {
    const ext = emoji.animated ? 'gif' : 'webp';
    return (
      <button
        className={styles.emojiBtn}
        onClick={() => onSelect({
          char: null,
          identifier: `${emoji.name}:${emoji.id}`,
          name: emoji.name,
          customUrl: `https://cdn.discordapp.com/emojis/${emoji.id}.${ext}?size=32`,
          animated: emoji.animated,
          id: emoji.id,
        })}
        title={`:${emoji.name}:`}
      >
        <img
          src={`https://cdn.discordapp.com/emojis/${emoji.id}.${ext}?size=32`}
          alt={emoji.name}
          style={{ width: 24, height: 24 }}
          loading="lazy"
        />
      </button>
    );
  }

  return (
    <button
      className={styles.emojiBtn}
      onClick={() => onSelect({
        char: emoji.char,
        identifier: emoji.char,
        name: emoji.name,
      })}
      title={`:${emoji.name}:`}
    >
      <img
        src={twemojiUrl(emoji.char)}
        alt={emoji.name}
        style={{ width: 24, height: 24 }}
        loading="lazy"
        draggable={false}
      />
    </button>
  );
}
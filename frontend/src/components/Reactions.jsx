import { useEmojiPicker } from '../context/EmojiPickerContext';
import { twemojiUrl } from '../data/emojiData';
import { apiUrl } from '../api';
import styles from './Reactions.module.css';

export default function Reactions({ reactions, messageId, channelId, myReactions = [], onReactionToggle }) {
  const { showEmojiPicker } = useEmojiPicker();

  // No reactions — render nothing, no space, no add button
  if (!reactions?.length) return null;

  const handleReactionClick = async (reaction) => {
    const isRemoving = myReactions.includes(reaction.identifier);

    // Optimistic update
    if (onReactionToggle) onReactionToggle(messageId, reaction.identifier, isRemoving);

    await fetch(
      apiUrl(`/reactions/${channelId}/${messageId}/${encodeURIComponent(reaction.identifier)}`),
      { method: isRemoving ? 'DELETE' : 'POST', credentials: 'include' }
    );
  };

  const handleAddReaction = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    showEmojiPicker(rect, async (emoji) => {
      if (onReactionToggle) onReactionToggle(messageId, emoji.identifier, false);
      await fetch(
        apiUrl(`/reactions/${channelId}/${messageId}/${encodeURIComponent(emoji.identifier)}`),
        { method: 'POST', credentials: 'include' }
      );
    });
  };

  return (
    <div className={styles.reactions}>
      {reactions.map((r, i) => {
        const isMe = myReactions.includes(r.identifier);
        return (
          <button
            key={i}
            className={`${styles.reaction} ${isMe ? styles.reacted : ''}`}
            onClick={() => handleReactionClick(r)}
            title={`:${r.name}:`}
          >
            {r.custom
              ? <img
                  src={`https://cdn.discordapp.com/emojis/${r.id}.${r.animated ? 'gif' : 'webp'}?size=20`}
                  alt={r.name}
                  style={{ width: 18, height: 18 }}
                />
              : <img
                  src={twemojiUrl(r.emoji)}
                  alt={r.name ?? ''}
                  style={{ width: 18, height: 18 }}
                  draggable={false}
                />
            }
            <span className={styles.count}>{r.count}</span>
          </button>
        );
      })}

      {/* Add button — only exists when reactions exist, hidden until hover */}
      <button
        className={styles.addReaction}
        onClick={handleAddReaction}
        title="Add reaction"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M8 13s1.5 2 4 2 4-2 4-2"/>
          <line x1="9" y1="9" x2="9.01" y2="9"/>
          <line x1="15" y1="9" x2="15.01" y2="9"/>
          <line x1="12" y1="5" x2="12" y2="7"/>
          <line x1="12" y1="17" x2="12" y2="19"/>
        </svg>
      </button>
    </div>
  );
}
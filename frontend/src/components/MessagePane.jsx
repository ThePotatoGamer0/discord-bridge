import { useEffect, useRef, useCallback, useMemo } from 'react';
import Message from './Message';
import MessageInput from './MessageInput';
import styles from './MessagePane.module.css';

export default function MessagePane({
  channel, channels = [], guildId = '', guildMembers = [], messages, loading, loadingMore, hasMore,
  onLoadMore, onSend, currentUser, myReactions, onReactionToggle, onPollExpired
}) {
  const channelNameById = useMemo(() => {
    const m = Object.create(null);
    for (const c of channels) m[c.id] = c.name;
    return m;
  }, [channels]);

  const userDisplayById = useMemo(() => {
    const o = Object.create(null);
    for (const mem of guildMembers) {
      o[mem.id] = mem.nickname ?? mem.globalName ?? mem.username;
    }
    for (const msg of messages) {
      const a = msg.author;
      if (!a?.id) continue;
      const label = a.nickname ?? a.globalName ?? a.username;
      if (label) o[a.id] = label;
    }
    return o;
  }, [guildMembers, messages]);
  const messagesRef      = useRef(null);
  const bottomRef        = useRef(null);
  const prevScrollHeight = useRef(0);
  const isAtBottom       = useRef(true);
  const lastChannelId    = useRef(null);
  const lastMsgCount     = useRef(0);

  const handleScroll = useCallback(() => {
    const el = messagesRef.current;
    if (!el) return;
    isAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;

    if (el.scrollTop < 100 && !loadingMore && hasMore) {
      prevScrollHeight.current = el.scrollHeight;
      onLoadMore();
    }
  }, [loadingMore, hasMore, onLoadMore]);

  useEffect(() => {
    const el = messagesRef.current;
    if (!el || loading) return;

    const channelChanged    = channel?.id !== lastChannelId.current;
    const newMessageArrived = messages.length > lastMsgCount.current;

    lastMsgCount.current = messages.length;

    if (channelChanged) {
      lastChannelId.current = channel?.id;
      isAtBottom.current = true;
      requestAnimationFrame(() => {
        if (messagesRef.current) {
          messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
      });
      return;
    }

    if (newMessageArrived && isAtBottom.current) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [messages, loading, channel?.id]);

  useEffect(() => {
    if (!loadingMore && prevScrollHeight.current && messagesRef.current) {
      const el = messagesRef.current;
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight - prevScrollHeight.current;
        prevScrollHeight.current = 0;
      });
    }
  }, [loadingMore, messages]);

  if (!channel) return (
    <div className={styles.empty}>
      <div className={styles.emptyInner}>
        <span className={styles.emptyHash}>#</span>
        <p>Select a channel to start chatting</p>
      </div>
    </div>
  );

  return (
    <div className={styles.pane}>
      <div className={styles.header}>
        <span className={styles.hash}>#</span>
        <span className={styles.channelName}>{channel.name}</span>
      </div>

      <div className={styles.messages} ref={messagesRef} onScroll={handleScroll}>
        {hasMore && (
          <div className={styles.loadMore}>
            {loadingMore
              ? <div className={styles.loadingMore}>Loading older messages...</div>
              : <button className={styles.loadMoreBtn} onClick={onLoadMore}>
                  Load older messages
                </button>
            }
          </div>
        )}

        {loading && <div className={styles.loading}>Loading messages...</div>}

        {!loading && messages.length === 0 && (
          <div className={styles.loading}>No messages yet. Say something!</div>
        )}

        {messages.map((msg, i) => {
          const prev = messages[i - 1];
          const grouped = prev &&
            prev.author.id === msg.author.id &&
            msg.timestamp - prev.timestamp < 5 * 60 * 1000;
          return (
            <Message
              key={msg.id}
              message={msg}
              grouped={grouped}
              isOwn={msg.siteUser?.id === currentUser?.id}
              channelId={channel?.id}
              guildId={guildId}
              channelNameById={channelNameById}
              userDisplayById={userDisplayById}
              currentUser={currentUser}
              myReactions={myReactions?.[msg.id] ?? []}
              onReactionToggle={onReactionToggle}
              onPollExpired={onPollExpired}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>

      <MessageInput onSend={onSend} channel={channel} channels={channels} guildId={guildId} />
    </div>
  );
}
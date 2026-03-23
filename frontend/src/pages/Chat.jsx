import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrentGuild } from '../context/CurrentGuildContext';
import ServerSidebar from '../components/ServerSidebar';
import Sidebar from '../components/Sidebar';
import MessagePane from '../components/MessagePane';
import MembersSidebar from '../components/MembersSidebar';
import { io } from 'socket.io-client';
import { apiUrl, API_BASE } from '../api';
import styles from './Chat.module.css';

export default function Chat() {
  const { user, logout } = useAuth();
  const { setGuildId: setCurrentGuildId } = useCurrentGuild();
  const [socket, setSocket]                 = useState(null);
  const [connected, setConnected]          = useState(false);
  const [servers, setServers]               = useState([]);
  const [activeServer, setActiveServer]     = useState(null);
  const [channels, setChannels]             = useState([]);
  const [guildName, setGuildName]           = useState('');
  const [guildId, setGuildId]               = useState('');
  const [activeChannel, setActiveChannel]  = useState(null);
  const [messages, setMessages]            = useState([]);
  const [loadingMsgs, setLoadingMsgs]      = useState(false);
  const [loadingMore, setLoadingMore]      = useState(false);
  const [hasMore, setHasMore]               = useState(false);
  const [myReactions, setMyReactions]      = useState({});
  const [guildMembers, setGuildMembers]     = useState([]);
  const [membersSections, setMembersSections] = useState([]);
  const [membersSidebarVisible, setMembersSidebarVisible] = useState(true);

  // Fetch servers on mount
  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl('/servers'), { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const list = Array.isArray(data.servers) ? data.servers : [];
        setServers(list);
        if (list.length > 0 && !activeServer) {
          setActiveServer(list[0]);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // When activeServer changes, fetch channels and members
  useEffect(() => {
    if (!activeServer) {
      setChannels([]);
      setGuildName('');
      setGuildId('');
      setActiveChannel(null);
      setGuildMembers([]);
      setMembersSections([]);
      return;
    }

    setActiveChannel(null);
    setMessages([]);
    setGuildId(activeServer.id);
    setGuildName(activeServer.name);

    let cancelled = false;
    Promise.all([
      fetch(apiUrl(`/channels?guildId=${activeServer.id}`), { credentials: 'include' }).then(r => r.json()),
      fetch(apiUrl(`/members?guildId=${activeServer.id}`), { credentials: 'include' }).then(r => r.json()),
    ]).then(([chData, memData]) => {
      if (cancelled) return;
      setChannels(chData.channels ?? []);
      setGuildMembers(Array.isArray(memData.members) ? memData.members : []);
      setMembersSections(Array.isArray(memData.sections) ? memData.sections : []);
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [activeServer?.id]);

  // Sync guildId to context for EmojiPicker (uses different guildId source than MessageInput)
  useEffect(() => {
    setCurrentGuildId(activeServer?.id ?? '');
  }, [activeServer?.id, setCurrentGuildId]);

  useEffect(() => {
    const s = io(API_BASE || undefined, { withCredentials: true });
    setSocket(s);
    s.on('connect',    () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('error',      (err) => {
      console.error('Socket error:', err);
      if (err.message?.includes('server')) logout();
    });
    return () => s.disconnect();
  }, []);

  // New messages
  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => {
      if (msg.channelId === activeChannel?.id) {
        setMessages(prev => [...prev, msg]);
      }
    };
    socket.on('new_message', handler);
    return () => socket.off('new_message', handler);
  }, [socket, activeChannel]);

  // Message deleted
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      if (data.channelId !== activeChannel?.id) return;
      setMessages((prev) => {
        const idsToRemove = data.messageIds ?? (data.messageId ? [data.messageId] : []);
        if (idsToRemove.length === 0) return prev;
        const set = new Set(idsToRemove);
        return prev.filter((msg) => !set.has(msg.id));
      });
    };
    socket.on('message_deleted', handler);
    return () => socket.off('message_deleted', handler);
  }, [socket, activeChannel]);

  // Poll vote counts (Discord does not allow apps to submit votes; this keeps counts in sync)
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      if (data.channelId !== activeChannel?.id) return;
      setMessages((prev) => prev.map((msg) => (
        msg.id === data.messageId ? { ...msg, poll: data.poll } : msg
      )));
    };
    socket.on('poll_update', handler);
    return () => socket.off('poll_update', handler);
  }, [socket, activeChannel]);

  // Reaction updates from Discord
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      if (data.channelId !== activeChannel?.id) return;
      setMessages(prev => prev.map(msg => {
        if (msg.id !== data.messageId) return msg;
        const reactions = msg.reactions ?? [];
        const existing  = reactions.find(r => r.identifier === data.identifier);
        const discordCount = typeof data.count === 'number' ? data.count : null;

        if (data.action === 'add') {
          if (discordCount !== null) {
            if (discordCount <= 0) {
              return { ...msg, reactions: reactions.filter(r => r.identifier !== data.identifier) };
            }
            if (existing) {
              return { ...msg, reactions: reactions.map(r =>
                r.identifier === data.identifier ? { ...r, count: discordCount } : r
              )};
            }
            return { ...msg, reactions: [...reactions, {
              emoji: data.emoji, identifier: data.identifier,
              name: data.name, count: discordCount,
              custom: data.custom, id: data.id, animated: data.animated,
            }]};
          }
          if (existing) {
            return { ...msg, reactions: reactions.map(r =>
              r.identifier === data.identifier
                ? { ...r, count: r.count + 1 }
                : r
            )};
          }
          return { ...msg, reactions: [...reactions, {
            emoji: data.emoji, identifier: data.identifier,
            name: data.name, count: 1,
            custom: data.custom, id: data.id, animated: data.animated,
          }]};
        }

        if (data.action === 'remove') {
          if (discordCount !== null) {
            if (discordCount <= 0) {
              return { ...msg, reactions: reactions.filter(r => r.identifier !== data.identifier) };
            }
            if (existing) {
              return { ...msg, reactions: reactions.map(r =>
                r.identifier === data.identifier ? { ...r, count: discordCount } : r
              )};
            }
            return msg;
          }
          return { ...msg, reactions: reactions
            .map(r => r.identifier === data.identifier
              ? { ...r, count: r.count - 1 }
              : r
            )
            .filter(r => r.count > 0)
          };
        }
        return msg;
      }));
    };
    socket.on('reaction_update', handler);
    return () => socket.off('reaction_update', handler);
  }, [socket, activeChannel]);

  const selectServer = useCallback((server) => {
    setActiveServer(server);
  }, []);

  const selectChannel = useCallback(async (channel) => {
    setActiveChannel(channel);
    setLoadingMsgs(true);
    setMessages([]);
    setHasMore(false);
    setMyReactions({});

    if (socket) socket.emit('join_channel', channel.id);

    // Fetch messages and this user's reactions in parallel
    const [msgRes, reactRes] = await Promise.all([
      fetch(apiUrl(`/channels/${channel.id}/messages?limit=25`), { credentials: 'include' }),
      fetch(apiUrl(`/channels/${channel.id}/my-reactions`), { credentials: 'include' }),
    ]);

    const msgData   = await msgRes.json();
    const reactData = await reactRes.json();

    if (msgData.messages)   setMessages(msgData.messages);
    if (reactData.reactions) setMyReactions(reactData.reactions);
    setHasMore(msgData.hasMore ?? false);
    setLoadingMsgs(false);
  }, [socket]);

  useEffect(() => {
    const handler = (e) => {
      const det = e.detail ?? {};
      if (det.channel?.id) {
        setChannels((prev) => (prev.some((c) => c.id === det.channel.id) ? prev : [...prev, det.channel]));
        selectChannel(det.channel);
        return;
      }
      const channel = channels.find((c) => c.id === det.channelId);
      if (channel) selectChannel(channel);
    };
    window.addEventListener('bridge:navigate-channel', handler);
    return () => window.removeEventListener('bridge:navigate-channel', handler);
  }, [channels, selectChannel]);

  const loadMore = useCallback(async () => {
    if (!activeChannel || loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    const oldest = messages[0].id;
    const res = await fetch(
      apiUrl(`/channels/${activeChannel.id}/messages?limit=25&before=${oldest}`),
      { credentials: 'include' }
    );
    const data = await res.json();
    if (data.messages) {
      setMessages(prev => [...data.messages, ...prev]);
      setHasMore(data.hasMore ?? false);
    }
    setLoadingMore(false);
  }, [activeChannel, loadingMore, hasMore, messages]);

  const sendMessage = useCallback(async (payload) => {
    const isObject = payload != null && typeof payload === 'object';
    const content = isObject ? String(payload.content ?? '').trim() : String(payload ?? '').trim();
    const files = isObject ? (payload.files ?? []) : [];
    const poll = isObject ? payload.poll : null;

    if (!activeChannel) return;
    if (!content && !files.length && !poll) return;

    if (files.length > 0 || poll) {
      try {
        const fd = new FormData();
        if (content) fd.append('content', content);
        for (const f of files) fd.append('files', f);
        if (poll) fd.append('poll', JSON.stringify(poll));
        const r = await fetch(apiUrl(`/channels/${activeChannel.id}/message`), {
          method: 'POST',
          credentials: 'include',
          body: fd,
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) console.error(data.error || 'Failed to send message');
      } catch (e) {
        console.error(e);
      }
      return;
    }

    if (!socket) return;
    socket.emit('send_message', { channelId: activeChannel.id, content });
  }, [socket, activeChannel]);

  useEffect(() => {
    const onThreadCreated = (e) => {
      const thread = e.detail?.thread;
      if (!thread?.id) return;
      setChannels((prev) => {
        if (prev.some((c) => c.id === thread.id)) return prev;
        return [...prev, thread];
      });
      const ch = {
        id: thread.id,
        name: thread.name,
        type: thread.type,
        parentId: thread.parentId ?? null,
        position: thread.position ?? 0,
        rawPosition: thread.rawPosition ?? 0,
      };
      selectChannel(ch);
    };
    window.addEventListener('bridge:thread-created', onThreadCreated);
    return () => window.removeEventListener('bridge:thread-created', onThreadCreated);
  }, [selectChannel]);

  // Optimistically update myReactions when user reacts
  const handleReactionToggle = useCallback((messageId, identifier, isRemoving) => {
    setMyReactions(prev => {
      const curr = prev[messageId] ?? [];
      if (isRemoving) {
        return { ...prev, [messageId]: curr.filter(e => e !== identifier) };
      }
      return { ...prev, [messageId]: [...curr, identifier] };
    });
  }, []);

  const handlePollExpired = useCallback((messageId, updatedMessage) => {
    setMessages(prev => prev.map(m => (m.id === messageId ? updatedMessage : m)));
  }, []);

  return (
    <div className={styles.layout}>
      <ServerSidebar
        servers={servers}
        activeServer={activeServer}
        onSelectServer={selectServer}
      />
      <Sidebar
        guildName={guildName}
        guildId={guildId}
        channels={channels}
        activeChannel={activeChannel}
        onSelectChannel={selectChannel}
        user={user}
        connected={connected}
        onLogout={logout}
      />
      <div className={styles.main}>
        <MessagePane
          channel={activeChannel}
          channels={channels}
          guildId={guildId}
          guildMembers={guildMembers}
          messages={messages}
          loading={loadingMsgs}
          loadingMore={loadingMore}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onSend={sendMessage}
          currentUser={user}
          myReactions={myReactions}
          onReactionToggle={handleReactionToggle}
          onPollExpired={handlePollExpired}
        />
        <MembersSidebar
          members={guildMembers}
          sections={membersSections}
          guildId={guildId}
          visible={membersSidebarVisible}
          onToggle={() => setMembersSidebarVisible((v) => !v)}
        />
      </div>
    </div>
  );
}
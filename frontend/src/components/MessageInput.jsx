import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import styles from './MessageInput.module.css';
import { apiUrl } from '../api';
import { useEmojiPicker } from '../context/EmojiPickerContext';
import { ALL_UNICODE_EMOJIS, filterEmojiCandidates, twemojiUrl } from '../data/emojiData';

/** Guild text / post surfaces that accept `<#id>` mentions (matches Discord). */
const TEXT_MENTION_TYPES = new Set([0, 5, 10, 11, 12, 15]);

function parseInProgressChannelMention(value, cursorPos) {
  if (cursorPos == null || cursorPos < 0) return null;
  const slice = value.slice(0, cursorPos);
  const hashIdx = slice.lastIndexOf('#');
  if (hashIdx < 0) return null;
  const prev = hashIdx === 0 ? '\n' : value[hashIdx - 1];
  if (prev !== undefined && !/[\s\n]/.test(prev)) return null;
  const typed = value.slice(hashIdx + 1, cursorPos);
  if (!/^[a-zA-Z0-9_-]*$/.test(typed)) return null;
  return { start: hashIdx, query: typed };
}

function parseInProgressUserMention(value, cursorPos) {
  if (cursorPos == null || cursorPos < 0) return null;
  const slice = value.slice(0, cursorPos);
  const atIdx = slice.lastIndexOf('@');
  if (atIdx < 0) return null;
  const prev = atIdx === 0 ? '\n' : value[atIdx - 1];
  if (prev !== undefined && !/[\s\n]/.test(prev)) return null;
  const typed = value.slice(atIdx + 1, cursorPos);
  if (typed.length > 48) return null;
  if (/[\n@]/.test(typed)) return null;
  return { start: atIdx, query: typed };
}

/** `/command` stub at the very start of the message (Discord-style slash menu). */
function parseSlashStub(value, cursorPos) {
  if (cursorPos < 1 || value[0] !== '/') return null;
  const prefix = value.slice(0, cursorPos);
  if (!prefix.startsWith('/')) return null;
  const after = prefix.slice(1);
  if (/[\s\n]/.test(after)) return null;
  return { kind: 'slash', start: 0, query: after };
}

/** `:emoji` inline suggestion (Discord-style). */
function parseInProgressEmojiMention(value, cursorPos) {
  if (cursorPos == null || cursorPos < 1) return null;
  const slice = value.slice(0, cursorPos);
  const colonIdx = slice.lastIndexOf(':');
  if (colonIdx < 0) return null;
  const prev = colonIdx === 0 ? '\n' : value[colonIdx - 1];
  if (prev !== undefined && !/[\s\n]/.test(prev)) return null;
  const typed = slice.slice(colonIdx + 1, cursorPos);
  if (typed.length > 48) return null;
  if (/[\n:]/.test(typed)) return null;
  if (!/^[a-zA-Z0-9_]*$/.test(typed)) return null;
  return { kind: 'emoji', start: colonIdx, query: typed };
}

/** Among `#`, `@`, `:`, and leading `/`, the trigger closest to the cursor wins (Discord-style). */
function pickActiveMention(value, cursorPos) {
  const candidates = [];
  const ch = parseInProgressChannelMention(value, cursorPos);
  const usr = parseInProgressUserMention(value, cursorPos);
  const em = parseInProgressEmojiMention(value, cursorPos);
  const sl = parseSlashStub(value, cursorPos);
  if (ch) candidates.push({ kind: 'channel', ...ch });
  if (usr) candidates.push({ kind: 'user', ...usr });
  if (em) candidates.push(em);
  if (sl) candidates.push(sl);
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (a.start >= b.start ? a : b));
}

function filterChannelMentionCandidates(channels, query) {
  const list = channels.filter(c => TEXT_MENTION_TYPES.has(c.type));
  const byPos = (a, b) => (a.rawPosition ?? a.position ?? 0) - (b.rawPosition ?? b.position ?? 0);
  if (!query) {
    return [...list].sort(byPos).slice(0, 25);
  }
  const q = query.toLowerCase();
  return list
    .filter(c => c.name.toLowerCase().includes(q))
    .sort((a, b) => {
      const as = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bs = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      if (as !== bs) return as - bs;
      return byPos(a, b);
    })
    .slice(0, 25);
}

function memberDisplayName(m) {
  return m.nickname ?? m.globalName ?? m.username;
}

function filterRoleMentionCandidates(roles, query) {
  if (!roles?.length) return [];
  const list = roles;
  if (!query) return list.slice(0, 15);
  const q = query.toLowerCase();
  return list
    .filter((r) => r.name?.toLowerCase().includes(q))
    .sort((a, b) => {
      const as = a.name?.toLowerCase().startsWith(q) ? 0 : 1;
      const bs = b.name?.toLowerCase().startsWith(q) ? 0 : 1;
      return as - bs;
    })
    .slice(0, 15);
}

export default function MessageInput({ onSend, channel, channels = [], guildId = '', guildRoles = [] }) {
  const [value, setValue]             = useState('');
  const [mention, setMention]         = useState(null);
  const [mentionIdx, setMentionIdx]   = useState(0);
  const [userCandidates, setUserCandidates] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [attachOpen, setAttachOpen]   = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [pendingPoll, setPendingPoll] = useState(null);
  const [threadModal, setThreadModal] = useState(false);
  const [pollModal, setPollModal]     = useState(false);
  const [threadName, setThreadName]   = useState('');
  const [pollForm, setPollForm]       = useState({
    question: '', answers: ['', ''], duration: 24, allowMultiselect: false,
  });
  const [customEmojis, setCustomEmojis] = useState([]);
  const { showEmojiPicker }         = useEmojiPicker();
  const emojiButtonRef              = useRef(null);
  const textareaRef                 = useRef(null);
  const wrapperRef                  = useRef(null);
  const debounceRef                 = useRef(null);
  const fileInputRef                = useRef(null);
  const plusRef                     = useRef(null);
  const attachMenuRef               = useRef(null);

  const channelCandidates = useMemo(
    () => (mention?.kind === 'channel'
      ? filterChannelMentionCandidates(channels, mention.query)
      : []),
    [channels, mention]
  );

  const emojiCandidates = useMemo(
    () => (mention?.kind === 'emoji'
      ? filterEmojiCandidates(ALL_UNICODE_EMOJIS, customEmojis, mention.query)
      : []),
    [mention?.kind, mention?.query, customEmojis]
  );

  useEffect(() => {
    if (!guildId) {
      setCustomEmojis([]);
      return;
    }
    fetch(apiUrl(`/emojis?guildId=${guildId}`), { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.emojis) setCustomEmojis(d.emojis); })
      .catch(() => setCustomEmojis([]));
  }, [guildId]);

  useEffect(() => {
    if (mention?.kind !== 'user') {
      setUserCandidates([]);
      setUserSearchLoading(false);
      return;
    }
    setUserSearchLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const q = mention.query;
        const params = new URLSearchParams();
        if (guildId) params.set('guildId', guildId);
        if (q) params.set('q', q);
        const url = apiUrl(`/members?${params.toString()}`);
        const r = await fetch(url, { credentials: 'include' });
        const d = await r.json();
        setUserCandidates(Array.isArray(d.members) ? d.members : []);
      } catch {
        setUserCandidates([]);
      } finally {
        setUserSearchLoading(false);
      }
    }, 120);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [mention?.kind, mention?.query, guildId]);

  const roleCandidates = useMemo(
    () => (mention?.kind === 'user'
      ? filterRoleMentionCandidates(guildRoles, mention.query)
      : []),
    [guildRoles, mention?.kind, mention?.query]
  );

  const userOrRoleCandidates = useMemo(() => {
    if (mention?.kind !== 'user') return [];
    const roles = roleCandidates.map((r) => ({ ...r, _type: 'role' }));
    const users = userCandidates.map((u) => ({ ...u, _type: 'user' }));
    return [...roles, ...users];
  }, [mention?.kind, roleCandidates, userCandidates]);

  const isSlashSuggest = mention?.kind === 'slash';
  const activeCandidates = mention?.kind === 'channel' ? channelCandidates
    : mention?.kind === 'emoji' ? emojiCandidates
    : mention?.kind === 'user' ? userOrRoleCandidates
    : [];

  const syncMention = useCallback((val, cursorPos) => {
    const m = pickActiveMention(val, cursorPos);
    setMention(m);
    setMentionIdx(0);
  }, []);

  useEffect(() => {
    const len = isSlashSuggest ? 1 : activeCandidates.length;
    if (mentionIdx >= len && len > 0) {
      setMentionIdx(len - 1);
    }
  }, [activeCandidates.length, isSlashSuggest, mentionIdx]);

  useEffect(() => {
    const onDocDown = (e) => {
      if (!mention) return;
      if (wrapperRef.current?.contains(e.target)) return;
      setMention(null);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [mention]);

  useEffect(() => {
    setPendingFiles([]);
    setPendingPoll(null);
    setAttachOpen(false);
  }, [channel?.id]);

  useEffect(() => {
    if (!attachOpen) return;
    const down = (e) => {
      if (attachMenuRef.current?.contains(e.target) || plusRef.current?.contains(e.target)) return;
      setAttachOpen(false);
    };
    document.addEventListener('mousedown', down);
    return () => document.removeEventListener('mousedown', down);
  }, [attachOpen]);

  const applyMention = useCallback((item) => {
    const ta = textareaRef.current;
    if (!ta || !mention) return;
    const v = ta.value;
    const cursorPos = ta.selectionStart;
    if (mention.kind === 'slash') {
      const m = v.match(/^\/[^\s\n]*/);
      const len = m ? m[0].length : 1;
      setValue(v.slice(len));
      setMention(null);
      setUserCandidates([]);
      requestAnimationFrame(() => {
        ta.focus();
        ta.selectionStart = ta.selectionEnd = 0;
      });
      return;
    }
    let insertText;
    if (mention.kind === 'emoji') {
      insertText = item.char ?? `<${item.animated ? 'a' : ''}:${item.name}:${item.id}>`;
    } else if (mention.kind === 'channel') {
      insertText = `<#${item.id}>`;
    } else if (mention.kind === 'user' && item._type === 'role') {
      insertText = `<@&${item.id}>`;
    } else {
      insertText = `<@${item.id}>`;
    }
    const newVal = v.slice(0, mention.start) + insertText + v.slice(cursorPos);
    setValue(newVal);
    setMention(null);
    setUserCandidates([]);
    const caret = mention.start + insertText.length;
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = caret;
    });
  }, [mention]);

  const submit = useCallback(() => {
    const content = value.trim();
    if (!content && !pendingFiles.length && !pendingPoll) return;
    setMention(null);
    onSend({ content, files: pendingFiles, poll: pendingPoll });
    setValue('');
    setPendingFiles([]);
    setPendingPoll(null);
  }, [value, pendingFiles, pendingPoll, onSend]);

  const onFilesPicked = (e) => {
    const list = [...(e.target.files ?? [])];
    setPendingFiles((prev) => [...prev, ...list].slice(0, 10));
    e.target.value = '';
    setAttachOpen(false);
  };

  const submitThread = async () => {
    const name = threadName.trim().slice(0, 100);
    if (!name || !channel?.id) return;
    try {
      const r = await fetch(apiUrl(`/channels/${channel.id}/threads`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to create thread');
      window.dispatchEvent(new CustomEvent('bridge:thread-created', { detail: d }));
      setThreadModal(false);
      setThreadName('');
      setAttachOpen(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const confirmPoll = () => {
    const q = pollForm.question.trim();
    const ans = pollForm.answers.map((a) => a.trim()).filter(Boolean);
    if (!q || ans.length < 2) return;
    setPendingPoll({
      question: q,
      answers: ans,
      duration: pollForm.duration,
      allowMultiselect: pollForm.allowMultiselect,
    });
    setPollModal(false);
    setPollForm({ question: '', answers: ['', ''], duration: 24, allowMultiselect: false });
    setAttachOpen(false);
  };

  const canSend = Boolean(value.trim() || pendingFiles.length || pendingPoll);

  const handleKeyDown = (e) => {
    if (mention && (isSlashSuggest || activeCandidates.length > 0)) {
      const listLen = isSlashSuggest ? 1 : activeCandidates.length;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIdx(i => (i + 1) % listLen);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIdx(i => (i - 1 + listLen) % listLen);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (isSlashSuggest) applyMention();
        else applyMention(activeCandidates[mentionIdx]);
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        if (isSlashSuggest) applyMention();
        else applyMention(activeCandidates[mentionIdx]);
        return;
      }
    }
    if (e.key === 'Escape' && mention) {
      e.preventDefault();
      setMention(null);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleChange = (e) => {
    const v = e.target.value;
    setValue(v);
    syncMention(v, e.target.selectionStart);
  };

  const handleSelect = (e) => {
    syncMention(e.target.value, e.target.selectionStart);
  };

  const handleEmojiClick = () => {
    const rect = emojiButtonRef.current?.getBoundingClientRect();
    if (!rect) return;
    showEmojiPicker(rect, (emoji) => {
      if (emoji.char) {
        setValue(v => v + emoji.char);
      } else {
        const animated = emoji.animated ? 'a' : '';
        setValue(v => v + `<${animated}:${emoji.name}:${emoji.id}>`);
      }
    });
  };

  const showSuggest = Boolean(mention);
  const showUserLoading = mention?.kind === 'user' && userSearchLoading;
  const showEmpty = mention && !isSlashSuggest && !showUserLoading && activeCandidates.length === 0;
  const showEmojiSuggest = mention?.kind === 'emoji';

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      {showSuggest && (
        <ul className={styles.channelSuggest} role="listbox">
          {mention.kind === 'slash' ? (
            <li key="slash-stub">
              <button
                type="button"
                role="option"
                aria-selected
                className={`${styles.channelSuggestItem} ${styles.slashSuggestItem} ${styles.channelSuggestItemActive}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyMention()}
              >
                Slash commands are not supported
              </button>
            </li>
          ) : showUserLoading ? (
            <li className={styles.channelSuggestEmpty}>Searching members…</li>
          ) : showEmpty ? (
            <li className={styles.channelSuggestEmpty}>
              {mention.kind === 'channel' ? 'No matching channels' : mention.kind === 'emoji' ? 'No matching emojis' : 'No matching members or roles'}
            </li>
          ) : showEmojiSuggest ? (
            emojiCandidates.map((emoji, i) => (
              <li key={emoji.id ?? emoji.name + i}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === mentionIdx}
                  className={`${styles.channelSuggestItem} ${styles.emojiSuggestItem} ${i === mentionIdx ? styles.channelSuggestItemActive : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setMentionIdx(i)}
                  onClick={() => applyMention(emoji)}
                >
                  {emoji.id ? (
                    <img
                      src={`https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'webp'}?size=24`}
                      alt={emoji.name}
                      className={styles.emojiSuggestImg}
                    />
                  ) : (
                    <img
                      src={twemojiUrl(emoji.char)}
                      alt={emoji.name}
                      className={styles.emojiSuggestImg}
                    />
                  )}
                  <span className={styles.channelSuggestName}>:{emoji.name}:</span>
                </button>
              </li>
            ))
          ) : mention.kind === 'channel' ? (
            channelCandidates.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === mentionIdx}
                  className={`${styles.channelSuggestItem} ${i === mentionIdx ? styles.channelSuggestItemActive : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setMentionIdx(i)}
                  onClick={() => applyMention(c)}
                >
                  <span className={styles.channelSuggestHash}>#</span>
                  <span className={styles.channelSuggestName}>{c.name}</span>
                </button>
              </li>
            ))
          ) : (
            activeCandidates.map((m, i) => {
              const isRole = m._type === 'role';
              const disp = isRole ? m.name : memberDisplayName(m);
              return (
                <li key={`${isRole ? 'role-' : 'user-'}${m.id}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === mentionIdx}
                    className={`${styles.channelSuggestItem} ${i === mentionIdx ? styles.channelSuggestItemActive : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setMentionIdx(i)}
                    onClick={() => applyMention(m)}
                  >
                    <span className={styles.userSuggestAt}>@</span>
                    <span className={styles.channelSuggestName}>{disp}</span>
                    {isRole ? (
                      <span className={styles.userSuggestHandle}>Role</span>
                    ) : m.username && disp !== m.username ? (
                      <span className={styles.userSuggestHandle}>@{m.username}</span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
      {(pendingFiles.length > 0 || pendingPoll) && (
        <div className={styles.attachmentChips}>
          {pendingPoll && (
            <span className={styles.chip}>
              Poll: {pendingPoll.question.length > 36 ? `${pendingPoll.question.slice(0, 36)}…` : pendingPoll.question}
              <button type="button" className={styles.chipRemove} onClick={() => setPendingPoll(null)} aria-label="Remove poll">×</button>
            </span>
          )}
          {pendingFiles.map((f, i) => (
            <span key={`${f.name}-${i}`} className={styles.chip}>
              {f.name}
              <button
                type="button"
                className={styles.chipRemove}
                onClick={() => setPendingFiles((p) => p.filter((_, j) => j !== i))}
                aria-label="Remove file"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className={styles.inputRow}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className={styles.hiddenFile}
          onChange={onFilesPicked}
        />
        <div className={styles.plusWrap}>
          <button
            ref={plusRef}
            type="button"
            className={styles.plusBtn}
            onClick={() => setAttachOpen((o) => !o)}
            title="Attach"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          {attachOpen && (
            <div ref={attachMenuRef} className={styles.attachMenu} role="menu">
              <button type="button" className={styles.attachMenuItem} role="menuitem" onClick={() => fileInputRef.current?.click()}>
                Upload a File
              </button>
              <button
                type="button"
                className={styles.attachMenuItem}
                role="menuitem"
                onClick={() => { setThreadModal(true); setAttachOpen(false); }}
              >
                Create Thread
              </button>
              <button
                type="button"
                className={styles.attachMenuItem}
                role="menuitem"
                onClick={() => { setPollModal(true); setAttachOpen(false); }}
              >
                Create Poll
              </button>
            </div>
          )}
        </div>
        <textarea
          ref={textareaRef}
          className={styles.input}
          value={value}
          onChange={handleChange}
          onSelect={handleSelect}
          onKeyDown={handleKeyDown}
          onClick={handleSelect}
          placeholder={`Message #${channel?.name ?? '...'}`}
          rows={1}
          maxLength={2000}
        />
        <button
          ref={emojiButtonRef}
          className={styles.emojiBtn}
          onClick={handleEmojiClick}
          type="button"
          title="Add emoji"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 13s1.5 2 4 2 4-2 4-2"/>
            <line x1="9" y1="9" x2="9.01" y2="9"/>
            <line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
        </button>
        <button
          className={styles.sendBtn}
          onClick={submit}
          disabled={!canSend}
          title="Send message"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>

      {threadModal && (
        <div className={styles.modalOverlay} onMouseDown={() => setThreadModal(false)}>
          <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Create Thread</h3>
            <input
              className={styles.modalInput}
              value={threadName}
              onChange={(e) => setThreadName(e.target.value)}
              placeholder="Thread name"
              maxLength={100}
              autoFocus
            />
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalBtnSecondary} onClick={() => setThreadModal(false)}>Cancel</button>
              <button type="button" className={styles.modalBtnPrimary} onClick={submitThread}>Create</button>
            </div>
          </div>
        </div>
      )}

      {pollModal && (
        <div className={styles.modalOverlay} onMouseDown={() => setPollModal(false)}>
          <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Create Poll</h3>
            <label className={styles.modalLabel}>Question</label>
            <input
              className={styles.modalInput}
              value={pollForm.question}
              onChange={(e) => setPollForm((f) => ({ ...f, question: e.target.value }))}
              placeholder="Ask a question"
              maxLength={300}
            />
            <label className={styles.modalLabel}>Answers</label>
            {pollForm.answers.map((a, i) => (
              <input
                key={i}
                className={styles.modalInput}
                value={a}
                onChange={(e) => setPollForm((f) => {
                  const answers = [...f.answers];
                  answers[i] = e.target.value;
                  return { ...f, answers };
                })}
                placeholder={`Option ${i + 1}`}
                maxLength={55}
              />
            ))}
            <div className={styles.pollAnswerActions}>
              {pollForm.answers.length < 10 && (
                <button
                  type="button"
                  className={styles.modalBtnSecondary}
                  onClick={() => setPollForm((f) => ({ ...f, answers: [...f.answers, ''] }))}
                >
                  Add answer
                </button>
              )}
              {pollForm.answers.length > 2 && (
                <button
                  type="button"
                  className={styles.modalBtnSecondary}
                  onClick={() => setPollForm((f) => ({ ...f, answers: f.answers.slice(0, -1) }))}
                >
                  Remove last
                </button>
              )}
            </div>
            <label className={styles.modalLabel}>Duration (hours)</label>
            <select
              className={styles.modalSelect}
              value={pollForm.duration}
              onChange={(e) => setPollForm((f) => ({ ...f, duration: Number(e.target.value) }))}
            >
              {[1, 6, 12, 24, 48, 72, 168].map((h) => (
                <option key={h} value={h}>{h} hour{h === 1 ? '' : 's'}</option>
              ))}
            </select>
            <label className={styles.modalCheck}>
              <input
                type="checkbox"
                checked={pollForm.allowMultiselect}
                onChange={(e) => setPollForm((f) => ({ ...f, allowMultiselect: e.target.checked }))}
              />
              Allow multiple answers
            </label>
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalBtnSecondary} onClick={() => setPollModal(false)}>Cancel</button>
              <button type="button" className={styles.modalBtnPrimary} onClick={confirmPoll}>Add poll</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// backend/src/routes/channels.js
const express = require('express');
const multer = require('multer');
const { ThreadAutoArchiveDuration } = require('discord.js');
const { Routes } = require('discord-api-types/v10');
const router = express.Router();
const { client } = require('../bot/index');
const requireVerified = require('../middleware/requireVerified');
const { sendAsUser } = require('../bot/webhook');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 10 },
});

// Read reactions from raw discord API data since bulk fetch
// doesn't populate the ReactionManager cache
function extractRawReactions(message) {
  // discord.js stores raw API data — reactions are in there
  try {
    const raw = message.toJSON();
    if (raw.reactions?.length) return raw.reactions;
  } catch { }
  // Fallback: check the reaction manager cache (populated on single fetches)
  if (message.reactions?.cache?.size > 0) {
    return [...message.reactions.cache.values()].map(r => ({
      emoji: { name: r.emoji.name, animated: r.emoji.animated ?? false, id: r.emoji.id },
      count: r.count,
      me: false,
    }));
  }
  return [];
}

function formatReactions(rawReactions, messageId) {
  if (!rawReactions?.length) return [];
  const { db } = require('../db');

  return rawReactions.map(r => {
    // Raw API reaction shape: { emoji: { id, name, animated }, count, me }
    const emojiName = r.emoji?.name ?? String(r.emoji);
    const emojiId   = r.emoji?.id ?? null;
    const identifier = emojiId ? `${emojiName}:${emojiId}` : emojiName;

    const siteUserCount = db.prepare(`
      SELECT COUNT(*) as count FROM user_reactions
      WHERE message_id = ? AND emoji_identifier = ?
    `).get(messageId, identifier);

    return {
      emoji: emojiName,
      identifier,
      name: emojiName,
      count: r.count,
      siteUserCount: siteUserCount?.count ?? 0,
      custom: !!emojiId,
      id: emojiId,
      animated: r.emoji?.animated ?? false,
    };
  });
}

function collectUserIds(messages) {
  const ids = new Set();
  for (const m of messages.values()) {
    ids.add(m.author.id);
    const mentionRegex = /<@!?(\d+)>/g;
    let match;
    while ((match = mentionRegex.exec(m.content)) !== null) {
      ids.add(match[1]);
    }
  }
  return [...ids];
}

async function buildMemberMap(guild, userIds) {
  const map = new Map();
  if (userIds.length === 0) return map;
  try {
    const fetched = await guild.members.fetch({ user: userIds });
    for (const [id, member] of fetched) map.set(id, member);
  } catch { }
  return map;
}

// MessageType.UserJoin = 7 — system message, content is empty; we synthesize from Discord's templates
const MESSAGE_TYPE_USER_JOIN = 7;
const { formatJoinMessage } = require('../bot/joinMessages');

function formatMessage(m, memberMap, db) {
  const member   = memberMap.get(m.author.id);
  const nickname = member?.nickname ?? null;
  const displayName = nickname ?? m.author.globalName ?? m.author.username ?? 'Unknown';
  let resolvedContent = m.content ?? '';
  if (!resolvedContent && m.type === MESSAGE_TYPE_USER_JOIN) {
    resolvedContent = formatJoinMessage(displayName, m.id);
  }

  const log = db.prepare(`
    SELECT u.username, u.id as site_user_id, dl.discord_id
    FROM message_log ml
    JOIN users u ON u.id = ml.user_id
    LEFT JOIN discord_links dl ON dl.user_id = u.id AND dl.verified = 1
    WHERE ml.discord_msg_id = ?
  `).get(m.id);

  const attachments = m.attachments.map(a => ({
    id: a.id, url: a.url, name: a.name,
    contentType: a.contentType ?? null,
    size: a.size, width: a.width ?? null, height: a.height ?? null,
  }));

  const embeds = m.embeds.map(e => ({
    type: e.data?.type ?? 'rich',
    url: e.url ?? null, title: e.title ?? null,
    description: e.description ?? null,
    image: e.image ? { url: e.image.url, width: e.image.width, height: e.image.height } : null,
    thumbnail: e.thumbnail ? { url: e.thumbnail.url } : null,
    video: e.video ? { url: e.video.url, width: e.video.width, height: e.video.height } : null,
    provider: e.provider ? { name: e.provider.name } : null,
    author: e.author ? { name: e.author.name, url: e.author.url, iconURL: e.author.iconURL } : null,
    footer: e.footer ? { text: e.footer.text, iconURL: e.footer.iconURL } : null,
    fields: e.fields?.length ? e.fields.map(f => ({ name: f.name, value: f.value, inline: f.inline })) : null,
    color: e.color ?? null,
  }));

  const rawReactions = extractRawReactions(m);
  const reactions    = formatReactions(rawReactions, m.id);

  let poll = null;
  if (m.poll) {
    poll = {
      question: m.poll.question?.text ?? '',
      answers: [...m.poll.answers.values()].map((a) => ({
        id: a.id,
        text: a.text ?? '',
        voteCount: a.voteCount ?? 0,
      })),
      allowMultiselect: Boolean(m.poll.allowMultiselect),
      expiresAt: m.poll.expiresTimestamp ?? null,
    };
  }

  const hex = member?.displayHexColor;
  const authorColor = (hex && hex !== '#000000') ? hex : null;

  return {
    id: m.id,
    channelId: m.channelId,
    content: resolvedContent,
    type: m.type ?? 0,
    author: {
      id: m.author.id,
      ...(log?.discord_id && { discordId: log.discord_id }),
      username: m.author.username,
      globalName: m.author.globalName ?? null,
      nickname,
      avatar: m.author.displayAvatarURL(),
      bot: m.author.bot,
      color: authorColor,
    },
    attachments, embeds, reactions, poll,
    siteUser: log ? { username: log.username, id: log.site_user_id } : null,
    timestamp: m.createdTimestamp,
    thread: null,
  };
}

/** Resolves thread metadata for messages that started a thread (parent channel only). */
async function formatMessageWithThread(m, memberMap, db) {
  const base = formatMessage(m, memberMap, db);
  if (m.hasThread && m.channel?.isTextBased?.() && !m.channel.isThread?.()) {
    let t = m.thread;
    if (t) {
      base.thread = { id: t.id, name: t.name, parentId: t.parentId };
    } else {
      try {
        const raw = await client.rest.get(Routes.channelMessage(m.channelId, m.id));
        if (raw.thread) {
          base.thread = {
            id: raw.thread.id,
            name: raw.thread.name,
            parentId: raw.thread.parent_id ?? m.channelId,
          };
        }
      } catch (_) { /* ignore */ }
    }
  }
  return base;
}

// GET /channels?guildId=...
router.get('/', requireVerified, async (req, res) => {
  try {
    const guildId = req.query.guildId;
    if (!guildId) {
      return res.status(400).json({ error: 'guildId is required' });
    }

    const { hasAccessToGuild } = require('../bot/membership');
    if (!(await hasAccessToGuild(req.session.userId, guildId))) {
      return res.status(403).json({ error: 'Access denied to this server' });
    }

    const guild    = await client.guilds.fetch(guildId);
    const channels = await guild.channels.fetch();

    const allChannels = channels
      .filter(c => c.type === 4 || c.isTextBased() || c.type === 2 || c.type === 13)
      .filter(c => !c.isThread())
      .map(c => ({
        id: c.id, name: c.name, type: c.type,
        parentId: c.parentId ?? null,
        position: c.position ?? 0,
        rawPosition: c.rawPosition ?? 0,
      }));

    // Include active threads so they appear in the sidebar
    let threads = [];
    try {
      const fetched = await guild.channels.fetchActiveThreads();
      threads = [...fetched.threads.values()].map((t) => ({
        id: t.id,
        name: t.name,
        type: t.type,
        parentId: t.parentId ?? t.parent?.id ?? null,
        position: 0,
        rawPosition: 0,
      }));
    } catch (e) {
      console.warn('Could not fetch active threads:', e.message);
    }

    const combined = [...allChannels, ...threads];
    return res.json({ channels: combined, guildName: guild.name, guildId: guild.id });
  } catch (err) {
    console.error('Channels error:', err);
    return res.status(500).json({ error: 'Could not fetch channels.' });
  }
});

// POST /channels/:id/message — multipart: files, fields content, poll (JSON string)
router.post('/:id/message', requireVerified, upload.array('files', 10), async (req, res) => {
  try {
    const channelId = req.params.id;
    let channel;
    try {
      channel = await client.channels.fetch(channelId);
    } catch {
      return res.status(404).json({ error: 'Channel not found' });
    }
    if (!channel?.isTextBased()) {
      return res.status(400).json({ error: 'Cannot send to this channel' });
    }

    const { hasAccessToGuild } = require('../bot/membership');
    if (!(await hasAccessToGuild(req.session.userId, channel.guildId))) {
      return res.status(403).json({ error: 'Access denied to this server' });
    }

    const content = req.body.content != null ? String(req.body.content) : '';
    let poll = null;
    if (req.body.poll) {
      try {
        poll = JSON.parse(req.body.poll);
      } catch {
        return res.status(400).json({ error: 'Invalid poll data' });
      }
      const q = String(poll.question ?? '').trim();
      const answers = Array.isArray(poll.answers)
        ? poll.answers.map((a) => String(a).trim()).filter(Boolean)
        : [];
      if (!q) return res.status(400).json({ error: 'Poll needs a question' });
      if (answers.length < 2 || answers.length > 10) {
        return res.status(400).json({ error: 'Poll needs between 2 and 10 answers' });
      }
      let duration = parseInt(poll.duration, 10);
      if (Number.isNaN(duration)) duration = 24;
      duration = Math.min(768, Math.max(1, duration));
      poll = {
        question: q,
        answers,
        duration,
        allowMultiselect: Boolean(poll.allowMultiselect),
      };
    }

    const files = (req.files ?? []).map((f) => ({
      buffer: f.buffer,
      originalname: f.originalname,
    }));

    if (!content.trim() && !files.length && !poll) {
      return res.status(400).json({ error: 'Empty message' });
    }

    const msg = await sendAsUser(req.session.userId, channelId, { content, files, poll });
    return res.json({ id: msg.id, channelId });
  } catch (err) {
    console.error('Send message (multipart) error:', err);
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

// POST /channels/:id/messages/:messageId/poll/expire — end poll early (bot-authored polls only)
router.post('/:id/messages/:messageId/poll/expire', requireVerified, async (req, res) => {
  try {
    const channelId = req.params.id;
    const messageId = req.params.messageId;
    let channel;
    try {
      channel = await client.channels.fetch(channelId);
    } catch {
      return res.status(404).json({ error: 'Channel not found' });
    }
    if (!channel?.isTextBased()) {
      return res.status(400).json({ error: 'Cannot expire poll in this channel' });
    }

    const { hasAccessToGuild } = require('../bot/membership');
    if (!(await hasAccessToGuild(req.session.userId, channel.guildId))) {
      return res.status(403).json({ error: 'Access denied to this server' });
    }

    const updated = await channel.messages.endPoll(messageId);
    const guild = channel.guild ?? await client.guilds.fetch(channel.guildId);
    const { db } = require('../db');
    const memberMap = await buildMemberMap(guild, collectUserIds(new Map([[updated.id, updated]])));
    const message = formatMessage(updated, memberMap, db);
    return res.json({ ok: true, message });
  } catch (err) {
    if (err.code === 'PollAlreadyExpired') {
      return res.status(400).json({ error: 'Poll has already ended' });
    }
    console.error('Expire poll error:', err);
    return res.status(500).json({ error: 'Failed to end poll' });
  }
});

// POST /channels/:id/threads — create a public thread in a text/announcement channel
router.post('/:id/threads', requireVerified, async (req, res) => {
  try {
    const name = String(req.body?.name ?? '').trim().slice(0, 100);
    if (!name) return res.status(400).json({ error: 'Thread name is required' });

    let channel;
    try {
      channel = await client.channels.fetch(req.params.id);
    } catch {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const { hasAccessToGuild } = require('../bot/membership');
    if (!(await hasAccessToGuild(req.session.userId, channel.guildId))) {
      return res.status(403).json({ error: 'Access denied to this server' });
    }

    const guild = await channel.guild?.fetch() ?? await client.guilds.fetch(channel.guildId);

    if (!channel?.isTextBased() || !channel.threads) {
      return res.status(400).json({ error: 'Threads cannot be created in this channel' });
    }

    const thread = await channel.threads.create({
      name,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
      reason: 'Bridge app — user created thread',
    });

    return res.json({
      thread: {
        id: thread.id,
        name: thread.name,
        type: thread.type,
        parentId: channel.id,
        position: 0,
        rawPosition: 0,
      },
    });
  } catch (err) {
    console.error('Create thread error:', err);
    return res.status(500).json({ error: 'Failed to create thread' });
  }
});

// GET /channels/:id/messages
router.get('/:id/messages', requireVerified, async (req, res) => {
  try {
    let channel;
    try {
      channel = await client.channels.fetch(req.params.id);
    } catch {
      return res.status(404).json({ error: 'Channel not found.' });
    }

    if (!channel?.isTextBased()) {
      return res.status(404).json({ error: 'Channel not found.' });
    }

    const { hasAccessToGuild } = require('../bot/membership');
    if (!(await hasAccessToGuild(req.session.userId, channel.guildId))) {
      return res.status(403).json({ error: 'Access denied to this server' });
    }

    const guild = await channel.guild?.fetch() ?? await client.guilds.fetch(channel.guildId);

    const limit = Math.min(parseInt(req.query.limit) || 25, 50);
    const before = req.query.before ?? undefined;
    const fetchOptions = { limit };
    if (before) fetchOptions.before = before;

    const { db }   = require('../db');
    const messages = await channel.messages.fetch(fetchOptions);
    const userIds  = collectUserIds(messages);
    const memberMap = await buildMemberMap(guild, userIds);
    const formatted = await Promise.all(
      [...messages.values()]
        .reverse()
        .map(m => formatMessageWithThread(m, memberMap, db))
    );

    return res.json({ messages: formatted, hasMore: messages.size === limit });
  } catch (err) {
    console.error('Messages error:', err);
    return res.status(500).json({ error: 'Could not fetch messages.' });
  }
});

// GET /channels/:id/my-reactions
router.get('/:id/my-reactions', requireVerified, async (req, res) => {
  try {
    const { db } = require('../db');
    const rows = db.prepare(`
      SELECT message_id, emoji_identifier
      FROM user_reactions
      WHERE user_id = ? AND channel_id = ?
    `).all(req.session.userId, req.params.id);

    const map = {};
    for (const row of rows) {
      if (!map[row.message_id]) map[row.message_id] = [];
      map[row.message_id].push(row.emoji_identifier);
    }
    return res.json({ reactions: map });
  } catch (err) {
    console.error('My reactions error:', err);
    return res.status(500).json({ error: 'Could not fetch reactions.' });
  }
});

// POST /channels/invite — body: { guildId }
router.post('/invite', requireVerified, async (req, res) => {
  try {
    const guildId = req.body?.guildId ?? req.query?.guildId;
    if (!guildId) {
      return res.status(400).json({ error: 'guildId is required' });
    }

    const { hasAccessToGuild } = require('../bot/membership');
    if (!(await hasAccessToGuild(req.session.userId, guildId))) {
      return res.status(403).json({ error: 'Access denied to this server' });
    }

    const guild = await client.guilds.fetch(guildId);
    const channels = await guild.channels.fetch();
    const textChannel = channels.find(c => c.isTextBased() && !c.isThread());

    if (!textChannel) {
      return res.status(400).json({ error: 'No suitable channel found to create invite.' });
    }

    const invite = await textChannel.createInvite({
      maxAge: 0, maxUses: 0, unique: false,
      reason: 'Bridge app invite link request'
    });

    return res.json({ url: `https://discord.gg/${invite.code}` });
  } catch (err) {
    console.error('Invite error:', err);
    return res.status(403).json({
      error: 'Could not create invite. The bot may not have permission to create invite links.'
    });
  }
});

module.exports = router;
// backend/src/bot/listener.js
const { Routes } = require('discord-api-types/v10');
const { Events } = require('discord.js');
const { client } = require('./index');
const { db } = require('../db');

function serializePoll(poll) {
  if (!poll) return null;
  return {
    question: poll.question?.text ?? '',
    answers: [...poll.answers.values()].map((a) => ({
      id: a.id,
      text: a.text ?? '',
      voteCount: a.voteCount ?? 0,
    })),
    allowMultiselect: Boolean(poll.allowMultiselect),
    expiresAt: poll.expiresTimestamp ?? null,
  };
}

/** Fetch poll state from REST — gateway cache often lacks correct vote counts. */
async function fetchPollFromApi(channelId, messageId) {
  try {
    const data = await client.rest.get(Routes.channelMessage(channelId, messageId));
    const p = data.poll;
    if (!p?.question?.text || !p.answers?.length) return null;
    const countByAnswer = new Map();
    if (p.results?.answer_counts) {
      for (const ac of p.results.answer_counts) {
        countByAnswer.set(ac.id, ac.count ?? 0);
      }
    }
    return {
      question: p.question?.text ?? '',
      answers: p.answers.map((a) => ({
        id: a.answer_id,
        text: a.poll_media?.text ?? '',
        voteCount: countByAnswer.get(a.answer_id) ?? 0,
      })),
      allowMultiselect: Boolean(p.allow_multiselect),
      expiresAt: p.expiry ? Date.parse(p.expiry) : null,
    };
  } catch (_) {
    return null;
  }
}

function collectUserIds(message) {
  const ids = new Set();
  ids.add(message.author.id);
  const mentionRegex = /<@!?(\d+)>/g;
  let match;
  while ((match = mentionRegex.exec(message.content)) !== null) {
    ids.add(match[1]);
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

/** Match API reaction row to the emoji from the gateway event. */
function countFromApiReactions(list, emoji) {
  if (!list?.length) return 0;
  const wantId = emoji.id != null ? String(emoji.id) : null;
  const wantName = emoji.name;
  for (const r of list) {
    const e = r.emoji;
    const id = e?.id != null ? String(e.id) : null;
    if (wantId) {
      if (id === wantId) return r.count ?? 0;
    } else if (!id && e?.name != null) {
      const n = e.name;
      if (n === wantName) return r.count ?? 0;
      try {
        if (decodeURIComponent(n) === wantName) return r.count ?? 0;
        if (n === decodeURIComponent(wantName)) return r.count ?? 0;
      } catch { /* ignore */ }
    }
  }
  return 0;
}

/**
 * True remaining count from Discord REST (not ReactionManager cache — it can stay at 1 after
 * the bot removes the last reaction on that emoji).
 */
async function authoritativeCountAfterRemove(reaction) {
  try {
    const data = await client.rest.get(
      Routes.channelMessage(reaction.message.channelId, reaction.message.id)
    );
    return countFromApiReactions(data.reactions, reaction.emoji);
  } catch {
    return null;
  }
}

/** Fallback if fetch fails — best-effort from cache (can be wrong after bot + others sequence). */
function reactionCountAfterRemoveFallback(reaction, user, clientUser) {
  const cacheKey = reaction.emoji.id ?? reaction.emoji.name;
  const cached = reaction.message.reactions.cache.get(cacheKey);

  if (user.id === clientUser.id) {
    const base =
      typeof reaction.count === 'number'
        ? reaction.count
        : (cached && typeof cached.count === 'number' ? cached.count : 0);
    return Math.max(0, base - 1);
  }
  if (cached && typeof cached.count === 'number') return cached.count;
  if (typeof reaction.count === 'number') return Math.max(0, reaction.count);
  return 0;
}

function initListener(io) {
  // ── New messages ──────────────────────────────────────────────────────────
  client.on('messageCreate', async (message) => {
    if (!message.guildId) return;

    const guild = client.guilds.cache.get(message.guildId);
    if (!guild) return;

    const userIds = collectUserIds(message);
    const memberMap = await buildMemberMap(guild, userIds);

    const authorMember = memberMap.get(message.author.id);
    const nickname = authorMember?.nickname ?? null;
    const hex = authorMember?.displayHexColor;
    const authorColor = (hex && hex !== '#000000') ? hex : null;

    const { formatJoinMessage } = require('./joinMessages');
    let resolvedContent = message.content ?? '';
    if (!resolvedContent && message.type === 7) { // MessageType.UserJoin
      const displayName = nickname ?? message.author.globalName ?? message.author.username ?? 'Unknown';
      resolvedContent = formatJoinMessage(displayName, message.id);
    }

    const log = db.prepare(`
      SELECT u.username, u.id as site_user_id, dl.discord_id
      FROM message_log ml
      JOIN users u ON u.id = ml.user_id
      LEFT JOIN discord_links dl ON dl.user_id = u.id AND dl.verified = 1
      WHERE ml.discord_msg_id = ?
    `).get(message.id);

    const attachments = message.attachments.map(a => ({
      id: a.id, url: a.url, name: a.name,
      contentType: a.contentType ?? null,
      size: a.size, width: a.width ?? null, height: a.height ?? null,
    }));

    const embeds = message.embeds.map(e => ({
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

    let poll = null;
    if (message.poll) {
      const p = message.poll;
      poll = {
        question: p.question?.text ?? '',
        answers: [...p.answers.values()].map((a) => ({
          id: a.id,
          text: a.text ?? '',
          voteCount: a.voteCount ?? 0,
        })),
        allowMultiselect: Boolean(p.allowMultiselect),
        expiresAt: p.expiresTimestamp ?? null,
      };
    }

    let threadPayload = null;
    if (message.hasThread && message.channel?.isTextBased?.() && !message.channel.isThread?.()) {
      let t = message.thread;
      if (t) {
        threadPayload = { id: t.id, name: t.name, parentId: t.parentId };
      } else {
        try {
          const raw = await client.rest.get(Routes.channelMessage(message.channelId, message.id));
          if (raw.thread) {
            threadPayload = {
              id: raw.thread.id,
              name: raw.thread.name,
              parentId: raw.thread.parent_id ?? message.channelId,
            };
          }
        } catch (_) { /* ignore */ }
      }
    }

    const payload = {
      id: message.id,
      channelId: message.channelId,
      content: resolvedContent,
      type: message.type ?? 0,
      author: {
        id: message.author.id,
        ...(log?.discord_id && { discordId: log.discord_id }),
        username: message.author.username,
        globalName: message.author.globalName ?? null,
        nickname,
        avatar: message.author.displayAvatarURL(),
        bot: message.author.bot,
        color: authorColor,
      },
      attachments,
      embeds,
      poll,
      thread: threadPayload,
      reactions: [],
      siteUser: log ? { username: log.username, id: log.site_user_id } : null,
      timestamp: message.createdTimestamp
    };

    io.to(`channel:${message.channelId}`).emit('new_message', payload);
    const hasMentions = message.mentions?.everyone || (message.mentions?.users?.size > 0);
    if (hasMentions) {
      io.to(`guild:${message.guildId}`).except(`channel:${message.channelId}`).emit('new_message', payload);
    }
  });

  client.on(Events.MessagePollVoteAdd, async (pollAnswer) => {
    const poll = pollAnswer.poll;
    const message = poll?.message;
    if (!message) return;
    const channelId = message.channelId;
    const messageId = message.id;
    const serialized = await fetchPollFromApi(channelId, messageId);
    if (!serialized) return;
    io.to(`channel:${channelId}`).emit('poll_update', {
      messageId,
      channelId,
      poll: serialized,
    });
  });

  client.on(Events.MessagePollVoteRemove, async (pollAnswer) => {
    const poll = pollAnswer.poll;
    const message = poll?.message;
    if (!message) return;
    const channelId = message.channelId;
    const messageId = message.id;
    const serialized = await fetchPollFromApi(channelId, messageId);
    if (!serialized) return;
    io.to(`channel:${channelId}`).emit('poll_update', {
      messageId,
      channelId,
      poll: serialized,
    });
  });

  // ── Message deleted ────────────────────────────────────────────────────────
  client.on(Events.MessageDelete, (message) => {
    if (!message.guildId) return;
    const channelId = message.channelId ?? message.channel?.id;
    if (!channelId) return;
    io.to(`channel:${channelId}`).emit('message_deleted', {
      messageId: message.id,
      channelId,
    });
  });

  client.on(Events.MessageBulkDelete, (messages, channel) => {
    if (!channel?.guildId) return;
    const channelId = channel.id;
    const messageIds = [...messages.keys()];
    if (messageIds.length === 0) return;
    io.to(`channel:${channelId}`).emit('message_deleted', {
      messageIds,
      channelId,
    });
  });

  // ── Reaction added ────────────────────────────────────────────────────────
  client.on('messageReactionAdd', async (reaction, user) => {
    if (!reaction.message.guildId) return;
    // Web UI reacts via this bot — skip only *other* bots so those events still update the client
    if (user.bot && user.id !== client.user.id) return;

    if (reaction.partial) {
      try { await reaction.fetch(); } catch { return; }
    }

    io.to(`channel:${reaction.message.channelId}`).emit('reaction_update', {
      messageId: reaction.message.id,
      channelId: reaction.message.channelId,
      emoji: reaction.emoji.name,
      identifier: reaction.emoji.id
        ? `${reaction.emoji.name}:${reaction.emoji.id}`
        : reaction.emoji.name,
      name: reaction.emoji.name,
      count: reaction.count,
      custom: !!reaction.emoji.id,
      id: reaction.emoji.id ?? null,
      animated: reaction.emoji.animated ?? false,
      action: 'add',
      userId: user.id,
    });
  });

  // ── Reaction removed ──────────────────────────────────────────────────────
  client.on('messageReactionRemove', async (reaction, user) => {
    if (!reaction.message.guildId) return;
    if (user.bot && user.id !== client.user.id) return;

    if (reaction.partial) {
      try { await reaction.fetch(); } catch { return; }
    }

    let removeCount = await authoritativeCountAfterRemove(reaction);
    if (removeCount === null) {
      removeCount = reactionCountAfterRemoveFallback(reaction, user, client.user);
    }

    io.to(`channel:${reaction.message.channelId}`).emit('reaction_update', {
      messageId: reaction.message.id,
      channelId: reaction.message.channelId,
      emoji: reaction.emoji.name,
      identifier: reaction.emoji.id
        ? `${reaction.emoji.name}:${reaction.emoji.id}`
        : reaction.emoji.name,
      name: reaction.emoji.name,
      count: removeCount,
      custom: !!reaction.emoji.id,
      id: reaction.emoji.id ?? null,
      animated: reaction.emoji.animated ?? false,
      action: 'remove',
      userId: user.id,
    });
  });

  console.log('✅ Discord message listener active');
}

module.exports = { initListener };
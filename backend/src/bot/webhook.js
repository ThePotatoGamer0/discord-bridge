// backend/src/bot/webhook.js
const { AttachmentBuilder } = require('discord.js');
const { client } = require('./index');
const { db } = require('../db');

const webhookCache = new Map();

async function getOrCreateWebhook(channel) {
  if (webhookCache.has(channel.id)) {
    return webhookCache.get(channel.id);
  }
  const webhooks = await channel.fetchWebhooks();
  let webhook = webhooks.find(w => w.name === 'BridgeBot');
  if (!webhook) {
    webhook = await channel.createWebhook({ name: 'BridgeBot' });
  }
  webhookCache.set(channel.id, webhook);
  return webhook;
}

/**
 * @param {string} userId - site user id
 * @param {string} channelId
 * @param {string | { content?: string, files?: { buffer: Buffer, originalname: string }[], poll?: { question: string, answers: string[], duration: number, allowMultiselect: boolean } }} contentOrOptions
 */
async function sendAsUser(userId, channelId, contentOrOptions) {
  const link = db.prepare(`
    SELECT discord_handle, discord_display_name, discord_avatar, discord_id
    FROM discord_links WHERE user_id = ? AND verified = 1
  `).get(userId);

  if (!link) throw new Error('User not verified');

  const opts = typeof contentOrOptions === 'string'
    ? { content: contentOrOptions }
    : (contentOrOptions ?? {});

  const content = (opts.content ?? '').trim();
  const files = opts.files ?? [];
  const poll = opts.poll ?? null;

  if (!content && !files.length && !poll) {
    throw new Error('Empty message');
  }

  const channel = await client.channels.fetch(channelId);

  if (!channel?.isTextBased()) throw new Error('Invalid channel');

  const guild = await channel.guild?.fetch() ?? await client.guilds.fetch(channel.guildId);

  // Webhooks cannot be created in threads; use the parent channel's webhook and pass threadId
  const webhookChannel = channel.isThread?.() ? channel.parent : channel;
  if (!webhookChannel) throw new Error('Thread has no parent channel');

  let displayName = link.discord_display_name ?? link.discord_handle;
  try {
    const member = await guild.members.fetch(link.discord_id);
    if (member.nickname) displayName = member.nickname;
  } catch { }

  const avatarURL = link.discord_avatar
    ? `https://cdn.discordapp.com/avatars/${link.discord_id}/${link.discord_avatar}.png`
    : null;

  // Poll-only messages: send via bot so "Close poll now" works (webhook messages can't be expired by the bot)
  const isPollOnly = poll && !content && !files.length;
  if (isPollOnly) {
    const msg = await channel.send({
      content: `${displayName}'s poll`,
      poll: {
        question: { text: poll.question },
        answers: poll.answers.map((t) => ({ text: t })),
        duration: poll.duration,
        allowMultiselect: Boolean(poll.allowMultiselect),
      },
    });

    const logContent = `[poll] ${poll.question}`;
    db.prepare(`
      INSERT INTO message_log (user_id, channel_id, discord_msg_id, content)
      VALUES (?, ?, ?, ?)
    `).run(userId, channelId, msg.id, logContent);

    return msg;
  }

  const webhook = await getOrCreateWebhook(webhookChannel);

  const payload = {
    username: displayName,
    avatarURL: avatarURL ?? undefined,
    ...(channel.isThread?.() && { threadId: channel.id }),
  };

  if (content) payload.content = content;

  if (files.length) {
    payload.files = files.map(
      (f) => new AttachmentBuilder(f.buffer, { name: f.originalname || 'file' })
    );
  }

  if (poll) {
    payload.poll = {
      question: { text: poll.question },
      answers: poll.answers.map((t) => ({ text: t })),
      duration: poll.duration,
      allowMultiselect: Boolean(poll.allowMultiselect),
    };
  }

  const msg = await webhook.send(payload);

  const logContent = content || (poll ? `[poll] ${poll.question}` : '') || (files.length ? `[${files.length} file(s)]` : '');

  db.prepare(`
    INSERT INTO message_log (user_id, channel_id, discord_msg_id, content)
    VALUES (?, ?, ?, ?)
  `).run(userId, channelId, msg.id, logContent);

  return msg;
}

module.exports = { sendAsUser };

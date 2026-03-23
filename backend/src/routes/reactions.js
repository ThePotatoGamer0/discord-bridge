// backend/src/routes/reactions.js
const express = require('express');
const router = express.Router();
const { client } = require('../bot/index');
const { db } = require('../db');
const requireVerified = require('../middleware/requireVerified');
const { hasAccessToGuild } = require('../bot/membership');

// POST /reactions/:channelId/:messageId/:emoji
router.post('/:channelId/:messageId/:emoji', requireVerified, async (req, res) => {
  const { channelId, messageId } = req.params;
  const identifier = decodeURIComponent(req.params.emoji);
  const userId = req.session.userId;

  try {
    const existing = db.prepare(`
      SELECT id FROM user_reactions
      WHERE user_id = ? AND message_id = ? AND emoji_identifier = ?
    `).get(userId, messageId, identifier);

    if (existing) {
      return res.json({ success: true, alreadyReacted: true });
    }

    let channel;
    try {
      channel = await client.channels.fetch(channelId);
    } catch {
      return res.status(404).json({ error: 'Channel not found' });
    }
    if (!(await hasAccessToGuild(userId, channel.guildId))) {
      return res.status(403).json({ error: 'Access denied to this server' });
    }
    const message = await channel.messages.fetch(messageId);

    await message.react(identifier);

    db.prepare(`
      INSERT OR IGNORE INTO user_reactions (user_id, message_id, channel_id, emoji_identifier)
      VALUES (?, ?, ?, ?)
    `).run(userId, messageId, channelId, identifier);

    return res.json({ success: true });
  } catch (err) {
    console.error('React error:', err);
    return res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// DELETE /reactions/:channelId/:messageId/:emoji
router.delete('/:channelId/:messageId/:emoji', requireVerified, async (req, res) => {
  const { channelId, messageId } = req.params;
  const identifier = decodeURIComponent(req.params.emoji);
  const userId = req.session.userId;

  try {
    db.prepare(`
      DELETE FROM user_reactions
      WHERE user_id = ? AND message_id = ? AND emoji_identifier = ?
    `).run(userId, messageId, identifier);

    const othersReacted = db.prepare(`
      SELECT COUNT(*) as count FROM user_reactions
      WHERE message_id = ? AND emoji_identifier = ?
    `).get(messageId, identifier);

    if (othersReacted.count === 0) {
      let channel;
      try {
        channel = await client.channels.fetch(channelId);
      } catch {
        return res.json({ success: true });
      }
      if (!(await hasAccessToGuild(userId, channel.guildId))) {
        return res.json({ success: true });
      }
      const message = await channel.messages.fetch(messageId);
      const emojiName = identifier.split(':')[0];
      const reaction  = message.reactions.cache.find(r => r.emoji.name === emojiName);
      if (reaction) await reaction.users.remove(client.user.id);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Unreact error:', err);
    return res.status(500).json({ error: 'Failed to remove reaction' });
  }
});

module.exports = router;
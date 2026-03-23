// backend/src/routes/emojis.js
const express = require('express');
const router = express.Router();
const { client } = require('../bot/index');
const requireVerified = require('../middleware/requireVerified');

// GET /emojis?guildId=...
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

    const guild = await client.guilds.fetch(guildId);
    const emojis = await guild.emojis.fetch();
    return res.json({
      emojis: [...emojis.values()].map(e => ({
        id: e.id, name: e.name, animated: e.animated,
      }))
    });
  } catch (err) {
    console.error('Emojis error:', err);
    return res.status(500).json({ error: 'Could not fetch emojis.' });
  }
});

module.exports = router;
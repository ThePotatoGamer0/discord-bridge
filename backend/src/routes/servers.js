// backend/src/routes/servers.js
const express = require('express');
const router = express.Router();
const { client } = require('../bot/index');
const { getAccessibleGuildIds } = require('../bot/membership');
const requireVerified = require('../middleware/requireVerified');

// GET /servers — guilds the user has access to (bot is in + user is member)
router.get('/', requireVerified, async (req, res) => {
  try {
    const guildIds = await getAccessibleGuildIds(req.session.userId);
    const servers = [];

    for (const id of guildIds) {
      try {
        const guild = await client.guilds.fetch(id);
        servers.push({
          id: guild.id,
          name: guild.name,
          icon: guild.icon,
        });
      } catch { /* guild left or inaccessible */ }
    }

    return res.json({ servers });
  } catch (err) {
    console.error('Servers error:', err);
    return res.status(500).json({ error: 'Could not fetch servers.' });
  }
});

module.exports = router;

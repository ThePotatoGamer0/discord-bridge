// backend/src/bot/membership.js
const { client } = require('./index');
const { db } = require('../db');

async function getAccessibleGuildIds(userId) {
  const link = db.prepare(`
    SELECT discord_id FROM discord_links WHERE user_id = ? AND verified = 1
  `).get(userId);
  if (!link) return [];

  const results = await Promise.all(
    [...client.guilds.cache.entries()].map(async ([guildId, guild]) => {
      try {
        const member = await guild.members.fetch(link.discord_id);
        return member ? guildId : null;
      } catch {
        return null;
      }
    })
  );
  return results.filter(Boolean);
}

async function hasAccessToGuild(userId, guildId) {
  const accessible = await getAccessibleGuildIds(userId);
  return accessible.includes(guildId);
}

/** @deprecated Use hasAccessToGuild or getAccessibleGuildIds */
async function checkMembership(userId) {
  const ids = await getAccessibleGuildIds(userId);
  return ids.length > 0;
}

module.exports = { getAccessibleGuildIds, hasAccessToGuild, checkMembership };
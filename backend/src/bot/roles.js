// backend/src/bot/roles.js
const { client } = require('./index');

const VERIFIED_GUILD_ID = process.env.VERIFIED_GUILD_ID || null;
const VERIFIED_ROLE_ID  = process.env.VERIFIED_ROLE_ID || null;

/**
 * Adds the configured "verified site user" role to a Discord user.
 * Requires VERIFIED_GUILD_ID and VERIFIED_ROLE_ID in env.
 * No-op if either is unset.
 *
 * @param {string} discordId - Discord user ID (snowflake)
 * @returns {{ added: boolean, error?: string }}
 */
async function assignVerifiedRole(discordId) {
  if (!VERIFIED_ROLE_ID || !VERIFIED_GUILD_ID) return { added: false };

  const guild = client.guilds.cache.get(VERIFIED_GUILD_ID);
  if (!guild) return { added: false, error: 'Guild not found' };

  try {
    const member = await guild.members.fetch(discordId);
    const role = guild.roles.cache.get(VERIFIED_ROLE_ID) ?? await guild.roles.fetch(VERIFIED_ROLE_ID);

    if (!role) return { added: false, error: 'Role not found' };
    if (member.roles.cache.has(VERIFIED_ROLE_ID)) return { added: true };

    await member.roles.add(role, 'Site account verified');
    return { added: true };
  } catch (err) {
    if (err.code === 10007) return { added: false, error: 'User not in guild' };
    throw err;
  }
}

module.exports = { assignVerifiedRole };

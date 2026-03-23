// backend/src/bot/verify.js
const { client } = require('./index');
const { db } = require('../db');
const { assignVerifiedRole } = require('./roles');

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationCode(userId, discordHandle) {
  const query = discordHandle.toLowerCase();
  let member = null;

  for (const guild of client.guilds.cache.values()) {
    try {
      const results = await guild.members.search({ query: discordHandle, limit: 5 });
      const found = results.find(m => m.user.username.toLowerCase() === query);
      if (found) {
        member = found;
        break;
      }
    } catch { /* skip guild */ }
  }

  if (!member) {
    return { success: false, error: 'Could not find that Discord user in any shared server. Make sure you\'re in a server with this bot and using your exact username.' };
  }

  const code = generateCode();
  const expiresAt = Math.floor(Date.now() / 1000) + 600;

  db.prepare(`
    DELETE FROM verification_codes WHERE user_id = ? AND used = 0
  `).run(userId);

  db.prepare(`
    INSERT INTO verification_codes (user_id, code, expires_at)
    VALUES (?, ?, ?)
  `).run(userId, code, expiresAt);

  try {
    await member.send(
      `👋 Hi **${member.user.globalName ?? member.user.username}**!\n\n` +
      `Someone is trying to link your Discord account to a web app.\n` +
      `Your verification code is:\n\n` +
      `**${code}**\n\n` +
      `This code expires in 10 minutes. If you didn't request this, ignore this message.`
    );
  } catch (err) {
    return { success: false, error: 'Could not DM you. Make sure your DMs are open.' };
  }

  // Store discord identity including display name
  db.prepare(`
    INSERT INTO discord_links (user_id, discord_id, discord_handle, discord_avatar, discord_display_name, verified)
    VALUES (?, ?, ?, ?, ?, 0)
    ON CONFLICT(user_id) DO UPDATE SET
      discord_id           = excluded.discord_id,
      discord_handle       = excluded.discord_handle,
      discord_avatar       = excluded.discord_avatar,
      discord_display_name = excluded.discord_display_name,
      verified             = 0
  `).run(
    userId,
    member.user.id,
    member.user.username,
    member.user.avatar,
    member.user.globalName ?? member.user.username  // ← was missing entirely
  );

  return { success: true, discordId: member.user.id };
}

async function confirmVerificationCode(userId, inputCode) {
  const row = db.prepare(`
    SELECT * FROM verification_codes
    WHERE user_id = ? AND used = 0
    ORDER BY id DESC LIMIT 1
  `).get(userId);

  if (!row) {
    return { success: false, error: 'No pending verification code found.' };
  }

  if (Math.floor(Date.now() / 1000) > row.expires_at) {
    return { success: false, error: 'Code has expired. Please request a new one.' };
  }

  if (row.code !== inputCode) {
    return { success: false, error: 'Incorrect code. Please try again.' };
  }

  db.prepare(`UPDATE verification_codes SET used = 1 WHERE id = ?`).run(row.id);

  db.prepare(`
    UPDATE discord_links SET verified = 1, linked_at = unixepoch()
    WHERE user_id = ?
  `).run(userId);

  const link = db.prepare('SELECT discord_id FROM discord_links WHERE user_id = ?').get(userId);
  if (link?.discord_id) {
    assignVerifiedRole(link.discord_id).catch((err) => console.error('Assign verified role:', err));
  }

  return { success: true };
}

module.exports = { sendVerificationCode, confirmVerificationCode };
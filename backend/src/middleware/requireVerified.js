// backend/src/middleware/requireVerified.js
const { db } = require('../db');
const { checkMembership } = require('../bot/membership');

async function requireVerified(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  // Check they have a verified discord link
  const link = db.prepare(`
    SELECT * FROM discord_links
    WHERE user_id = ? AND verified = 1
  `).get(req.session.userId);

  if (!link) {
    return res.status(403).json({ 
      error: 'unverified',
      message: 'You need to verify your Discord account first.'
    });
  }

  // Check they are still in at least one shared server
  const inServer = await checkMembership(req.session.userId);
  if (!inServer) {
    req.session.destroy();
    return res.status(403).json({
      error: 'not_in_server',
      message: 'You are no longer in any shared Discord server. Rejoin and reverify to regain access.'
    });
  }

  next();
}

module.exports = requireVerified;
// backend/src/routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { db } = require('../db');
const { sendVerificationCode, confirmVerificationCode } = require('../bot/verify');
const { assignVerifiedRole } = require('../bot/roles');
const { checkMembership } = require('../bot/membership');
const requireAuth = require('../middleware/requireAuth');
const requireVerified = require('../middleware/requireVerified');

const SALT_ROUNDS = 12;

// POST /auth/register
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  if (username.length < 3 || username.length > 32) {
    return res.status(400).json({ error: 'Username must be between 3 and 32 characters.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  // Check username isn't taken
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Username already taken.' });
  }

  try {
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const result = db.prepare(`
      INSERT INTO users (username, password) VALUES (?, ?)
    `).run(username, hashed);

    // Log them in immediately after registering
    req.session.userId = result.lastInsertRowid;
    req.session.username = username;

    return res.status(201).json({ 
      success: true,
      message: 'Account created! Now verify your Discord account.',
      user: { id: result.lastInsertRowid, username }
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  // Check if they have a verified discord link
  const link = db.prepare(`
    SELECT * FROM discord_links WHERE user_id = ? AND verified = 1
  `).get(user.id);

  if (link) {
    const inServer = await checkMembership(user.id);
    if (!inServer) {
      return res.status(403).json({
        error: 'not_in_server',
        message: 'You are no longer in any shared Discord server. Rejoin and reverify to regain access.'
      });
    }
  }

  req.session.userId = user.id;
  req.session.username = user.username;

  return res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      verified: !!link
    }
  });
});

// POST /auth/verify/send
router.post('/verify/send', requireAuth, async (req, res) => {
  const { discordHandle } = req.body;

  if (!discordHandle) {
    return res.status(400).json({ error: 'Discord handle is required.' });
  }

  const result = await sendVerificationCode(req.session.userId, discordHandle);

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  return res.json({ 
    success: true, 
    message: 'Verification code sent! Check your Discord DMs.' 
  });
});

// POST /auth/verify/confirm
router.post('/verify/confirm', requireAuth, async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code is required.' });
  }

  const result = await confirmVerificationCode(req.session.userId, code);

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  return res.json({ 
    success: true, 
    message: 'Discord account verified successfully!' 
  });
});

// POST /auth/roles/assign — add verified-site-user role to current user's Discord
router.post('/roles/assign', requireAuth, requireVerified, async (req, res) => {
  const link = db.prepare(`
    SELECT discord_id FROM discord_links WHERE user_id = ? AND verified = 1
  `).get(req.session.userId);

  if (!link) {
    return res.status(403).json({ error: 'Not verified' });
  }

  try {
    const result = await assignVerifiedRole(link.discord_id);
    if (result.added) {
      return res.json({ success: true, message: 'Role assigned' });
    }
    return res.status(400).json({ error: result.error || 'Could not assign role' });
  } catch (err) {
    console.error('Assign role error:', err);
    return res.status(500).json({ error: 'Could not assign role' });
  }
});

// POST /auth/logout
router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy();
  return res.json({ success: true });
});

// GET /auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, is_admin, created_at FROM users WHERE id = ?')
    .get(req.session.userId);

  if (!user) {
    req.session.destroy();
    return res.status(401).json({ error: 'User not found.' });
  }

  const link = db.prepare(`
    SELECT discord_handle, discord_avatar, discord_id, verified, linked_at
    FROM discord_links WHERE user_id = ?
  `).get(user.id);

  return res.json({
    user: {
      ...user,
      discord: link ?? null
    }
  });
});

// GET /auth/links — current user's verified link only
router.get('/links', requireAuth, (req, res) => {
  const link = db.prepare(`
    SELECT u.id as user_id, u.username, 
           dl.discord_handle, dl.discord_avatar, dl.discord_id, dl.linked_at
    FROM discord_links dl
    JOIN users u ON u.id = dl.user_id
    WHERE dl.user_id = ? AND dl.verified = 1
  `).get(req.session.userId);

  return res.json({ links: link ? [link] : [] });
});

module.exports = router;
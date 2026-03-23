// backend/src/routes/linked-role.js
// Linked Roles Verification URL — users hit this when connecting from Discord's role Links
// https://docs.discord.com/developers/tutorials/configuring-app-metadata-for-linked-roles

const express = require('express');
const router = express.Router();
const { isProd } = require('../config');
const { db } = require('../db');
const {
  generateState,
  getOAuthUrl,
  exchangeCodeForTokens,
  getCurrentUser,
  pushRoleConnectionMetadata,
} = require('../linked-roles');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

function htmlPage(title, body) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:system-ui;max-width:32rem;margin:4rem auto;padding:1rem;text-align:center;">
${body}
</body>
</html>`;
}

// GET /linked-role — entry point; redirects to Discord OAuth
router.get('/linked-role', (req, res) => {
  try {
    const state = generateState();
    res.cookie('clientState', state, {
      maxAge: 1000 * 60 * 5,
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      signed: true,
    });
    const url = getOAuthUrl(state);
    return res.redirect(url);
  } catch (err) {
    console.error('Linked role OAuth init:', err);
    return res.status(500).send(
      htmlPage('Error', '<p>Linked Roles is not configured. Set DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI.</p>')
    );
  }
});

// GET /discord-oauth-callback — OAuth callback; checks DB and pushes metadata
router.get('/discord-oauth-callback', async (req, res) => {
  const { code, state } = req.query;
  const savedState = req.signedCookies?.clientState;

  if (!code || !state || state !== savedState) {
    return res.status(400).send(
      htmlPage('Verification failed', '<p>Invalid or expired verification request. Please try again from Discord.</p>')
    );
  }

  res.clearCookie('clientState');

  try {
    const tokens = await exchangeCodeForTokens(code);
    const user = await getCurrentUser(tokens.access_token);

    const link = db.prepare(`
      SELECT verified FROM discord_links
      WHERE discord_id = ? AND verified = 1
    `).get(user.id);

    const verified = !!link;
    const metadata = {
      verified: verified ? '1' : '0',
    };

    await pushRoleConnectionMetadata(tokens.access_token, metadata);

    if (verified) {
      return res.send(htmlPage(
        'Connected',
        '<h1>✓ Success</h1><p>Your verified site account is now linked. Return to Discord to claim your role.</p>'
      ));
    }

    const verifyUrl = `${FRONTEND_URL}/verify`;
    return res.send(htmlPage(
      'Verification required',
      `<h1>Account not verified</h1><p>You need to <a href="${verifyUrl}">verify your site account</a> first, then come back here.</p>`
    ));
  } catch (err) {
    console.error('Linked role callback:', err);
    return res.status(500).send(
      htmlPage('Error', '<p>Something went wrong. Please try again from Discord.</p>')
    );
  }
});

module.exports = router;

// backend/src/linked-roles/index.js
// OAuth2 flow and role connection metadata for Discord Linked Roles
// See: https://docs.discord.com/developers/tutorials/configuring-app-metadata-for-linked-roles

const crypto = require('crypto');

const API_BASE = 'https://discord.com/api/v10';
const OAUTH_AUTHORIZE = 'https://discord.com/oauth2/authorize';
const OAUTH_TOKEN = `${API_BASE}/oauth2/token`;

function getConfig() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Linked Roles requires DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, and DISCORD_REDIRECT_URI');
  }
  return { clientId, clientSecret, redirectUri };
}

function generateState() {
  return crypto.randomBytes(16).toString('hex');
}

function getOAuthUrl(state) {
  const { clientId, redirectUri } = getConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify role_connections.write',
    state,
  });
  return `${OAUTH_AUTHORIZE}?${params.toString()}`;
}

async function exchangeCodeForTokens(code) {
  const { clientId, clientSecret, redirectUri } = getConfig();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch(OAUTH_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${err}`);
  }
  return res.json();
}

async function getCurrentUser(accessToken) {
  const res = await fetch(`${API_BASE}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Fetch user failed: ${res.status}`);
  }
  return res.json();
}

async function pushRoleConnectionMetadata(accessToken, metadata) {
  const { clientId } = getConfig();
  const url = `${API_BASE}/users/@me/applications/${clientId}/role-connection`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      platform_name: 'Web App',
      metadata,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Push metadata failed: ${res.status} ${err}`);
  }
  return res.json();
}

module.exports = {
  getConfig,
  generateState,
  getOAuthUrl,
  exchangeCodeForTokens,
  getCurrentUser,
  pushRoleConnectionMetadata,
};

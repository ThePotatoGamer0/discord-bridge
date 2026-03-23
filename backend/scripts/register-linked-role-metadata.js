#!/usr/bin/env node
/**
 * One-time script to register the Linked Roles metadata schema with Discord.
 * Run: node scripts/register-linked-role-metadata.js
 *
 * Requires: DISCORD_CLIENT_ID, DISCORD_BOT_TOKEN (or DISCORD_TOKEN)
 * See: https://docs.discord.com/developers/tutorials/configuring-app-metadata-for-linked-roles
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const clientId = process.env.DISCORD_CLIENT_ID;
const token = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;

if (!clientId || !token) {
  console.error('Set DISCORD_CLIENT_ID and DISCORD_BOT_TOKEN (or DISCORD_TOKEN) in .env');
  process.exit(1);
}

const url = `https://discord.com/api/v10/applications/${clientId}/role-connections/metadata`;
const body = [
  {
    key: 'verified',
    name: 'Verified',
    description: 'User has a verified site account',
    type: 7, // BOOLEAN_EQUAL
  },
];

async function main() {
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    const data = await res.json();
    console.log('Metadata schema registered:');
    console.log(JSON.stringify(data, null, 2));
  } else {
    const text = await res.text();
    console.error(`Failed: ${res.status} ${res.statusText}`);
    console.error(text);
    process.exit(1);
  }
}

main();

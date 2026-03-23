// backend/src/routes/members.js
const express = require('express');
const router = express.Router();
const { ActivityType } = require('discord-api-types/v10');
const { client } = require('../bot/index');
const { db } = require('../db');
const requireVerified = require('../middleware/requireVerified');

function getStatusText(presence) {
  if (!presence?.activities?.length) return null;
  const act = presence.activities[0];
  if (act.type === ActivityType.Custom) {
    const emojiPart = act.emoji ? `${act.emoji} ` : '';
    const text = act.state || act.name;
    return text ? emojiPart + text : null;
  }
  const labels = {
    [ActivityType.Playing]: 'Playing',
    [ActivityType.Streaming]: 'Streaming',
    [ActivityType.Listening]: 'Listening to',
    [ActivityType.Watching]: 'Watching',
    [ActivityType.Competing]: 'Competing in',
  };
  const label = labels[act.type];
  if (!label) return act.name;
  const detail = (act.type === ActivityType.Streaming || act.type === ActivityType.Watching) ? (act.details || act.name) : act.name;
  return detail ? `${label} ${detail}` : null;
}

function serializeMember(m) {
  const u = m.user;
  const hex = m.displayHexColor;
  const color = (hex && hex !== '#000000') ? hex : null;
  return {
    id: u.id,
    username: u.username,
    globalName: u.globalName ?? null,
    nickname: m.nickname ?? null,
    avatar: u.avatar ?? null,
    bot: Boolean(u.bot),
    color,
  };
}

function attachSiteUsers(memberObjects) {
  if (memberObjects.length === 0) return;
  const placeholders = memberObjects.map(() => '?').join(',');
  const ids = memberObjects.map((m) => m.id);
  const rows = db
    .prepare(
      `SELECT dl.discord_id, u.username, u.id as site_user_id
       FROM discord_links dl
       JOIN users u ON u.id = dl.user_id
       WHERE dl.discord_id IN (${placeholders}) AND dl.verified = 1`
    )
    .all(...ids);
  const byDiscordId = Object.create(null);
  for (const r of rows) {
    byDiscordId[r.discord_id] = { username: r.username, id: r.site_user_id };
  }
  for (const m of memberObjects) {
    m.siteUser = byDiscordId[m.id] ?? null;
  }
}

function isOnline(member) {
  const s = member.presence?.status;
  return s === 'online' || s === 'idle' || s === 'dnd';
}

function buildSections(guild) {
  const all = [...guild.members.cache.values()];
  const hoistedRoles = [...guild.roles.cache.values()]
    .filter((r) => r.hoist)
    .sort((a, b) => b.position - a.position);

  const byRole = new Map();
  for (const r of hoistedRoles) byRole.set(r.id, []);
  const onlineNoRole = [];
  const offline = [];

  for (const m of all) {
    const online = isOnline(m);
    const hoist = m.roles.hoist;

    if (online) {
      if (hoist && byRole.has(hoist.id)) {
        byRole.get(hoist.id).push(m);
      } else {
        onlineNoRole.push(m);
      }
    } else {
      offline.push(m);
    }
  }

  const sortByName = (list) =>
    list.sort((a, b) => {
      const an = (a.nickname ?? a.user.globalName ?? a.user.username ?? '').toLowerCase();
      const bn = (b.nickname ?? b.user.globalName ?? b.user.username ?? '').toLowerCase();
      return an.localeCompare(bn);
    });

  for (const arr of byRole.values()) sortByName(arr);
  sortByName(onlineNoRole);
  sortByName(offline);

  const sections = [];
  for (const r of hoistedRoles) {
    const members = byRole.get(r.id) ?? [];
    if (members.length > 0) {
      sections.push({ type: 'role', roleId: r.id, roleName: r.name, members });
    }
  }
  if (onlineNoRole.length > 0) {
    sections.push({ type: 'online', members: onlineNoRole });
  }
  if (offline.length > 0) {
    sections.push({ type: 'offline', members: offline });
  }

  return sections;
}

// GET /members/:userId/profile?guildId=... — full profile for user viewer modal
router.get('/:userId/profile', requireVerified, async (req, res) => {
  try {
    const { userId } = req.params;
    const guildId = req.query.guildId;
    if (!guildId) {
      return res.status(400).json({ error: 'guildId is required' });
    }

    const { hasAccessToGuild } = require('../bot/membership');
    if (!(await hasAccessToGuild(req.session.userId, guildId))) {
      return res.status(403).json({ error: 'Access denied to this server' });
    }

    const guild = await client.guilds.fetch(guildId);
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const u = member.user;
    let userProfile = null;
    try {
      userProfile = await client.users.fetch(userId, { force: true });
    } catch {
      userProfile = u;
    }

    const hex = member.displayHexColor;
    const roleAccent = (hex && hex !== '#000000') ? hex : null;
    let bannerUrl = null;
    if (userProfile.banner) {
      const ext = userProfile.banner.startsWith('a_') ? 'gif' : 'png';
      bannerUrl = `https://cdn.discordapp.com/banners/${userId}/${userProfile.banner}.${ext}?size=512`;
    }
    const userAccentHex = userProfile.hexAccentColor ?? (userProfile.accentColor != null && userProfile.accentColor !== 0 ? `#${userProfile.accentColor.toString(16).padStart(6, '0')}` : null);
    const accentColor = (userAccentHex && userAccentHex !== '#000000') ? userAccentHex : (roleAccent && roleAccent !== '#000000') ? roleAccent : null;

    const roles = [...member.roles.cache.values()]
      .filter((r) => r.name !== '@everyone')
      .sort((a, b) => b.position - a.position)
      .map((r) => ({
        id: r.id,
        name: r.name,
        color: (r.hexColor && r.hexColor !== '#000000') ? r.hexColor : null,
      }));

    const status = member.presence?.status ?? 'offline';
    const statusText = getStatusText(member.presence);

    const profile = {
      id: u.id,
      username: u.username,
      globalName: u.globalName ?? null,
      nickname: member.nickname ?? null,
      avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=256` : null,
      banner: bannerUrl,
      accentColor,
      bot: Boolean(u.bot),
      color: accentColor ?? roleAccent,
      roles,
      joinedAt: member.joinedTimestamp,
      discordCreatedAt: userProfile.createdTimestamp ?? null,
      status,
      statusText,
    };

    attachSiteUsers([profile]);
    return res.json({ profile });
  } catch (err) {
    console.error('Profile error:', err);
    return res.status(500).json({ error: 'Could not fetch profile.' });
  }
});

// GET /members?guildId=...&q=   — guildId required, optional q for search
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
    const q = String(req.query.q ?? '').trim().slice(0, 32);

    if (q.length >= 1) {
      const results = await guild.members.search({ query: q, limit: 25 });
      const members = [...results.values()].map(serializeMember);
      attachSiteUsers(members);
      return res.json({ members });
    }

    await guild.members.fetch({ limit: 200 }).catch(() => {});

    const sections = buildSections(guild);
    const out = sections.map((sec) => {
      const serialized = sec.members.map(serializeMember);
      attachSiteUsers(serialized);
      return {
        type: sec.type,
        roleId: sec.roleId ?? null,
        roleName: sec.roleName ?? null,
        members: serialized,
      };
    });

    const allMembers = out.flatMap((s) => s.members);
    return res.json({ sections: out, members: allMembers });
  } catch (err) {
    console.error('Members error:', err);
    return res.status(500).json({ error: 'Could not fetch members.' });
  }
});

module.exports = router;

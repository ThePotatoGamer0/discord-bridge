// backend/src/socket/index.js
const { Server } = require('socket.io');
const { client } = require('../bot/index');
const { db } = require('../db');
const { sendAsUser } = require('../bot/webhook');
const { getAccessibleGuildIds } = require('../bot/membership');

const { getCorsOrigin } = require('../config');

function getCorsOrigins() {
  return getCorsOrigin();
}

function initSocket(server, sessionMiddleware) {
  const io = new Server(server, {
    cors: {
      origin: getCorsOrigins(),
      credentials: true
    }
  });

  io.engine.use(sessionMiddleware);

  io.on('connection', async (socket) => {
    const session = socket.request.session;

    if (!session?.userId) {
      socket.emit('error', { message: 'Not logged in' });
      socket.disconnect();
      return;
    }

    const link = db.prepare(`
      SELECT * FROM discord_links WHERE user_id = ? AND verified = 1
    `).get(session.userId);

    if (!link) {
      socket.emit('error', { message: 'Account not verified' });
      socket.disconnect();
      return;
    }

    const accessibleGuildIds = await getAccessibleGuildIds(session.userId);
    if (accessibleGuildIds.length === 0) {
      socket.emit('error', { message: 'You are no longer in the Discord server' });
      socket.disconnect();
      return;
    }

    socket.accessibleGuildIds = new Set(accessibleGuildIds);
    for (const gid of accessibleGuildIds) {
      socket.join(`guild:${gid}`);
    }

    const user = db.prepare(`SELECT id, username FROM users WHERE id = ?`)
      .get(session.userId);

    console.log(`✅ Socket connected: ${user.username}`);

    async function hasAccessToChannel(channelId) {
      try {
        const channel = await client.channels.fetch(channelId);
        const guildId = channel.guild?.id ?? channel.guildId;
        return guildId && socket.accessibleGuildIds.has(guildId);
      } catch {
        return false;
      }
    }

    socket.on('join_channel', async (channelId) => {
      if (!channelId) return;
      const allowed = await hasAccessToChannel(channelId);
      if (!allowed) {
        socket.emit('error', { message: 'Access denied to this channel' });
        return;
      }
      socket.rooms.forEach(room => {
        if (room !== socket.id) socket.leave(room);
      });
      socket.join(`channel:${channelId}`);
      console.log(`${user.username} joined channel ${channelId}`);
    });

    socket.on('send_message', async ({ channelId, content }) => {
      if (!channelId || !content?.trim()) return;

      if (content.length > 2000) {
        socket.emit('error', { message: 'Message too long (max 2000 characters)' });
        return;
      }

      const allowed = await hasAccessToChannel(channelId);
      if (!allowed) {
        socket.emit('error', { message: 'Access denied to this channel' });
        return;
      }

      try {
        const msg = await sendAsUser(session.userId, channelId, { content: content.trim() });
        socket.emit('message_sent', {
          id: msg.id,
          channelId,
          content: content.trim(),
        });
      } catch (err) {
        console.error('Send message error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${user.username}`);
    });
  });

  return io;
}

module.exports = { initSocket };
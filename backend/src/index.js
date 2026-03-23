// backend/src/index.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { SESSION_SECRET, getCorsOrigin } = require('./config');
const { startBot, client } = require('./bot/index');
const { initDb } = require('./db');
const sessionMiddleware = require('./middleware/session');
const { initSocket } = require('./socket/index');
const { initListener } = require('./bot/listener');
const authRoutes     = require('./routes/auth');
const linkedRoleRoutes = require('./routes/linked-role');
const channelRoutes  = require('./routes/channels');
const emojiRoutes    = require('./routes/emojis');
const reactionRoutes = require('./routes/reactions');
const memberRoutes   = require('./routes/members');
const serverRoutes   = require('./routes/servers');

const app = express();
const server = http.createServer(app);

// Trust proxy for correct client IP and protocol (Nginx Proxy Manager, etc.)
app.set('trust proxy', 1);

app.use(express.json());
app.use(cors({ origin: getCorsOrigin(), credentials: true }));
app.use(cookieParser(SESSION_SECRET));
app.use(sessionMiddleware);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/', linkedRoleRoutes);
app.use('/auth', authLimiter, authRoutes);
app.use('/channels',  channelRoutes);
app.use('/emojis',    emojiRoutes);
app.use('/reactions', reactionRoutes);
app.use('/members',   memberRoutes);
app.use('/servers',   serverRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

// Serve frontend (Docker / production)
const publicDir = path.join(__dirname, '../public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('/{*splat}', (req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/auth') || req.path.startsWith('/channels') ||
        req.path.startsWith('/emojis') || req.path.startsWith('/reactions') || req.path.startsWith('/members') ||
        req.path.startsWith('/servers') || req.path.startsWith('/socket.io') || req.path.startsWith('/linked-role') ||
        req.path.startsWith('/discord-oauth-callback') || req.path === '/health') return next();
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

async function main() {
  initDb();

  client.once('clientReady', () => {
    const count = client.guilds.cache.size;
    console.log(`✅ Connected to ${count} server(s)`);
    const io = initSocket(server, sessionMiddleware);
    initListener(io);
  });

  await startBot();

  server.listen(process.env.PORT || 3000, () => {
    console.log(`✅ Server running on port ${process.env.PORT || 3000}`);
  });
}

main().catch(console.error);
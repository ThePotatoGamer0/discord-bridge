// backend/src/middleware/session.js
const session = require('express-session');
const SqliteStore = require('connect-sqlite3')(session);
const path = require('path');
const { SESSION_SECRET, isProd } = require('../config');

const sessionMiddleware = session({
  store: new SqliteStore({
    db: 'sessions.db',
    dir: path.join(__dirname, '../../data')
  }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProd,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    sameSite: 'lax'
  }
});

module.exports = sessionMiddleware;
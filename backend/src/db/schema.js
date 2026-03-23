// backend/src/db/schema.js
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../data/app.db'));

function initDb() {
  db.exec(`
    -- Users table: local site accounts
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      username    TEXT    NOT NULL UNIQUE,
      password    TEXT    NOT NULL,         -- bcrypt hashed
      is_admin    INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    -- Discord links: connects a site account to a real Discord identity
    CREATE TABLE IF NOT EXISTS discord_links (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id              INTEGER NOT NULL UNIQUE REFERENCES users(id),
      discord_id           TEXT    NOT NULL UNIQUE, -- their real Discord user ID
      discord_handle       TEXT    NOT NULL,         -- e.g. thepotatogamer
      discord_avatar       TEXT,                     -- avatar hash from Discord API
      discord_display_name TEXT,                     -- globalName e.g. ThePotatoGamer
      verified             INTEGER NOT NULL DEFAULT 0,
      linked_at            INTEGER DEFAULT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Verification codes: temporary codes sent via DM
    CREATE TABLE IF NOT EXISTS verification_codes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id),
      code        TEXT    NOT NULL,
      expires_at  INTEGER NOT NULL,             -- unixepoch, 10 min expiry
      used        INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Audit log: every message sent through the web app
    CREATE TABLE IF NOT EXISTS message_log (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        INTEGER NOT NULL REFERENCES users(id),
      channel_id     TEXT    NOT NULL,
      discord_msg_id TEXT,                      -- Discord's message ID if we get it back
      content        TEXT    NOT NULL,
      sent_at        INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- User reactions on messages (site users who reacted)
    CREATE TABLE IF NOT EXISTS user_reactions (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message_id       TEXT    NOT NULL,
      channel_id       TEXT    NOT NULL,
      emoji_identifier TEXT    NOT NULL,
      created_at       INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(user_id, message_id, emoji_identifier)
    );
  `);

  // Runtime migrations — safely add columns that may not exist on older DBs
  const migrations = [
    'ALTER TABLE discord_links ADD COLUMN discord_display_name TEXT',
  ];

  for (const migration of migrations) {
    try {
      db.exec(migration);
    } catch {
      // Column already exists, safe to ignore
    }
  }

  console.log('✅ Database initialised');
}

module.exports = { db, initDb };
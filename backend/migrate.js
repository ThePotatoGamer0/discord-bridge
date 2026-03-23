require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'data/app.db'));
try {
  db.exec(`CREATE TABLE IF NOT EXISTS user_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    emoji_identifier TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(user_id, message_id, emoji_identifier)
  )`);
  console.log('Migration done');
} catch(e) { console.log(e.message); }
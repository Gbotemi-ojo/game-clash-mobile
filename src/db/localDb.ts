// src/db/localDb.ts
import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './localSchema';

const expoDb = openDatabaseSync('gameclash.db');
export const db = drizzle(expoDb, { schema });

export const initializeLocalDatabase = () => {
  try {
    expoDb.execSync(`
      PRAGMA journal_mode = WAL;
      
      CREATE TABLE IF NOT EXISTS chat_rooms (
        id INTEGER PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT,
        match_id INTEGER,
        target_user_id TEXT,
        last_message TEXT,
        last_message_at TEXT,
        unread_count INTEGER DEFAULT 0,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        local_id TEXT PRIMARY KEY,
        id INTEGER,
        chat_room_id INTEGER NOT NULL,
        sender_id TEXT NOT NULL,
        content TEXT NOT NULL,
        status TEXT DEFAULT 'pending' NOT NULL,
        is_edited INTEGER DEFAULT 0,
        reply_to_id INTEGER, -- ✅ Added here for new installs
        created_at TEXT NOT NULL
      );
    `);

    try {
      expoDb.execSync(`ALTER TABLE messages ADD COLUMN is_edited INTEGER DEFAULT 0;`);
    } catch (e) {}

    // ✅ THE UPGRADE FIX: Auto-adds the column to existing app installs
    try {
      expoDb.execSync(`ALTER TABLE messages ADD COLUMN reply_to_id INTEGER;`);
    } catch (e) {}

    console.log('✅ Local SQLite Database Initialized & Upgraded Successfully!');
  } catch (error) {
    console.error('❌ Failed to initialize local database:', error);
  }
};

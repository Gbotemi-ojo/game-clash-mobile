// src/db/localSchema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const localChatRooms = sqliteTable('chat_rooms', {
  id: integer('id').primaryKey(), 
  type: text('type').notNull(), 
  name: text('name'),
  matchId: integer('match_id'),
  targetUserId: text('target_user_id'), 
  
  lastMessage: text('last_message'),
  lastMessageAt: text('last_message_at'),
  
  unreadCount: integer('unread_count').default(0),
  updatedAt: text('updated_at').notNull(),
});

export const localMessages = sqliteTable('messages', {
  localId: text('local_id').primaryKey(), 
  id: integer('id'), 
  chatRoomId: integer('chat_room_id').notNull(), 
  senderId: text('sender_id').notNull(),
  content: text('content').notNull(),
  status: text('status').default('pending').notNull(), 
  
  isEdited: integer('is_edited', { mode: 'boolean' }).default(false),
  // ✅ THE FIX: Added the replyToId column!
  replyToId: integer('reply_to_id'), 
  
  createdAt: text('created_at').notNull(),
});

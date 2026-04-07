-- Migration number: 0003 	 2026-04-03T00:00:00.000Z

CREATE TABLE chat_summaries (
  chat_id TEXT PRIMARY KEY REFERENCES chats (id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  last_covered_message_id TEXT NOT NULL,
  last_covered_created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Migration number: 0004 	 2026-04-07T00:00:00.000Z

CREATE TABLE chat_memory (
  chat_id TEXT PRIMARY KEY REFERENCES chats (id) ON DELETE CASCADE,
  summary_text TEXT,
  summary_json TEXT,
  last_summarized_message_id TEXT,
  updated_at TEXT NOT NULL
);

ALTER TABLE messages ADD COLUMN token_count INTEGER;
ALTER TABLE messages ADD COLUMN metadata TEXT;

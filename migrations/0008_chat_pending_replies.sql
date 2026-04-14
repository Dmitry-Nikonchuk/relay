-- Failed assistant replies that can be retried after interruption or upstream failures

CREATE TABLE chat_pending_replies (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES chats (id) ON DELETE CASCADE,
  user_message_id TEXT NOT NULL REFERENCES messages (id) ON DELETE CASCADE,
  user_message_text TEXT NOT NULL,
  model TEXT,
  failure_stage TEXT NOT NULL,
  failure_code TEXT NOT NULL,
  failure_message TEXT NOT NULL,
  request_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  resolved_at TEXT,
  UNIQUE (user_message_id)
);

CREATE INDEX idx_chat_pending_replies_chat_updated
  ON chat_pending_replies (chat_id, updated_at DESC);

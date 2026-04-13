-- Guardrails: daily usage, rate buckets, denial/event log

CREATE TABLE user_ai_usage_daily (
  user_id TEXT NOT NULL,
  usage_date TEXT NOT NULL,
  usage_scope TEXT NOT NULL CHECK (usage_scope IN ('user_visible', 'system')),
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, usage_date, usage_scope)
);

CREATE TABLE user_ai_rate_limits (
  user_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('chat', 'title', 'summary')),
  bucket_start TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  estimated_tokens INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, operation, bucket_start)
);

CREATE TABLE guardrail_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('chat', 'title', 'summary')),
  usage_scope TEXT NOT NULL CHECK (usage_scope IN ('user_visible', 'system')),
  tier TEXT NOT NULL,
  model TEXT,
  outcome TEXT NOT NULL,
  code TEXT,
  message TEXT,
  reset_at TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_guardrail_events_user_created
  ON guardrail_events (user_id, created_at DESC);

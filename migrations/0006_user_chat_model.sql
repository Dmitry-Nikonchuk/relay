-- User preference for chat model + tier for future subscription-based model lists

ALTER TABLE users ADD COLUMN preferred_chat_model TEXT;

ALTER TABLE users ADD COLUMN subscription_tier TEXT NOT NULL DEFAULT 'free';

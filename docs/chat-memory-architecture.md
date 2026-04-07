# Chat Memory Architecture (MVP)

## Why full history is still stored

All chat messages remain in `messages` for:

- UI pagination and history scrolling
- auditability and restore of complete conversations
- future analytics and offline processing

This storage model is unchanged by memory summarization.

## Why full history is not sent to the model

Sending full history on every request is expensive, slow, and eventually breaks on context/rate limits.
Inference now uses compact context:

1. base system prompt
2. compact memory from `chat_memory` (if present)
3. recent message window (`RECENT_CONTEXT_MESSAGES`)
4. current user message (deduplicated when already in recent window)

This keeps runtime context bounded and predictable.

## Incremental summary flow

`chat_memory` stores working memory per chat:

- `summary_text`
- `summary_json`
- `last_summarized_message_id`

Summary updates are incremental only:

- load previous memory
- fetch unsummarized message delta after `last_summarized_message_id`
- summarize only delta + previous memory
- write updated memory and advance `last_summarized_message_id`

The full chat is never rebuilt into one summary request.

## What triggers summary update

MVP thresholds:

- `SUMMARY_TRIGGER_MESSAGES = 10`
- optional token fallback `SUMMARY_TRIGGER_TOKENS = 2000`

If neither threshold is reached, summarization is skipped.
Large deltas are chunked (`SUMMARY_CHUNK_MESSAGES`) and processed sequentially.

## Failure and rate-limit fallback

Summary updates are best-effort and do not block chat responses.
If summarization fails (including 429/502/503 or invalid JSON):

- error is logged
- existing `chat_memory` is preserved
- chat continues using existing memory + recent window

This makes summary a resilience/performance enhancement, not a hard dependency.

## Legacy summary backfill

When `chat_memory` row is missing, service performs one-time best-effort backfill from legacy `chat_summaries`.
This allows gradual migration without breaking old chats.

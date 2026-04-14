import type { ChatFailedReply } from '@/entities/chat';
import { execute, queryOne } from '@/shared/lib/db/client';

type PendingReplyRow = {
  chat_id: string;
  user_message_id: string;
  user_message_text: string;
  failure_code: string;
  failure_message: string;
  updated_at: string;
  resolved_at: string | null;
};

function canRetryFromFailureCode(code: string): boolean {
  return (
    code === 'RATE_LIMITED' ||
    code === 'UPSTREAM_UNAVAILABLE' ||
    code === 'STREAM_INTERRUPTED' ||
    code === 'ASSISTANT_SAVE_FAILED' ||
    code === 'INTERNAL_ERROR'
  );
}

async function assertChatOwnedByUser(chatId: string, userId: string): Promise<boolean> {
  const row = await queryOne<{ id: string }>('SELECT id FROM chats WHERE id = ? AND user_id = ?', [
    chatId,
    userId,
  ]);
  return row != null;
}

export async function upsertPendingReply(params: {
  chatId: string;
  userMessageId: string;
  userMessageText: string;
  model?: string;
  failureStage: string;
  failureCode: string;
  failureMessage: string;
  requestId: string;
}): Promise<void> {
  const now = new Date().toISOString();
  await execute(
    `INSERT INTO chat_pending_replies
      (id, chat_id, user_message_id, user_message_text, model, failure_stage, failure_code, failure_message, request_id, created_at, updated_at, resolved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
     ON CONFLICT(user_message_id) DO UPDATE SET
       model = excluded.model,
       failure_stage = excluded.failure_stage,
       failure_code = excluded.failure_code,
       failure_message = excluded.failure_message,
       request_id = excluded.request_id,
       updated_at = excluded.updated_at,
       resolved_at = NULL`,
    [
      crypto.randomUUID(),
      params.chatId,
      params.userMessageId,
      params.userMessageText,
      params.model ?? null,
      params.failureStage,
      params.failureCode,
      params.failureMessage,
      params.requestId,
      now,
      now,
    ],
  );
}

export async function resolvePendingReply(userMessageId: string): Promise<void> {
  await execute(
    'UPDATE chat_pending_replies SET resolved_at = ?, updated_at = ? WHERE user_message_id = ?',
    [new Date().toISOString(), new Date().toISOString(), userMessageId],
  );
}

export async function getLatestFailedReplyForChat(
  chatId: string,
  userId: string,
): Promise<ChatFailedReply | null> {
  const owned = await assertChatOwnedByUser(chatId, userId);
  if (!owned) {
    return null;
  }

  const row = await queryOne<PendingReplyRow>(
    `SELECT chat_id, user_message_id, user_message_text, failure_code, failure_message, updated_at, resolved_at
     FROM chat_pending_replies
     WHERE chat_id = ? AND resolved_at IS NULL
     ORDER BY updated_at DESC
     LIMIT 1`,
    [chatId],
  );

  if (!row) {
    return null;
  }

  return {
    userMessageId: row.user_message_id,
    userText: row.user_message_text,
    errorMessage: row.failure_message,
    canRetry: canRetryFromFailureCode(row.failure_code),
    failedAt: row.updated_at,
  };
}

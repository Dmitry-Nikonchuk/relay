import { ZodError, treeifyError } from 'zod';

import {
  ApiError,
  apiErrorResponse,
  internalServerErrorResponse,
  invalidPayloadResponse,
} from '@/shared/lib/api/errors';
import { execute, queryAll, queryOne } from '@/shared/lib/db/client';
import { ChatAppendMessageRequestDtoSchema } from '@/entities/chat';
import type { ChatMessage } from '@/entities/chat';
import { MESSAGE_PAGE_DEFAULT_LIMIT, MESSAGE_PAGE_MAX_LIMIT } from '@/features/chat/lib/constants';
import { estimateMessageTokenCount, maybeUpdateChatMemory } from './chatMemory';
import { getLatestFailedReplyForChat, resolvePendingReply } from './pendingReplies';
import { createRequestId, logChatEvent, serializeError } from '@/shared/lib/logging/chatLogger';

async function assertChatOwnedByUser(chatId: string, userId: string): Promise<boolean> {
  const row = await queryOne<{ id: string }>('SELECT id FROM chats WHERE id = ? AND user_id = ?', [
    chatId,
    userId,
  ]);
  return row != null;
}

type MessageRow = {
  id: string;
  role: ChatMessage['role'];
  content: string;
  created_at: string;
};

function rowToChatMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

function clampLimit(raw: number): number {
  if (!Number.isFinite(raw) || raw < 1) {
    return MESSAGE_PAGE_DEFAULT_LIMIT;
  }
  return Math.min(Math.max(1, Math.floor(raw)), MESSAGE_PAGE_MAX_LIMIT);
}

export type MessagePageCursor = {
  beforeCreatedAt: string;
  beforeId: string;
};

export type ListMessagesPageResult = {
  messages: ChatMessage[];
  hasMore: boolean;
  failedReply: {
    userMessageId: string;
    userText: string;
    errorMessage: string;
    canRetry: boolean;
    failedAt: string;
  } | null;
};

/**
 * Latest page: last `limit` messages in chronological order (oldest of the page first).
 * Uses `LIMIT+1` to compute `hasMore`.
 */
export async function listMessagesLatestPage(
  chatId: string,
  limit: number,
  userId: string,
): Promise<ListMessagesPageResult | null> {
  const owned = await assertChatOwnedByUser(chatId, userId);
  if (!owned) {
    return null;
  }

  const lim = clampLimit(limit);
  const [rows, failedReply] = await Promise.all([
    queryAll<MessageRow>(
      `SELECT id, role, content, created_at FROM messages
       WHERE chat_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
      [chatId, lim + 1],
    ),
    getLatestFailedReplyForChat(chatId, userId),
  ]);

  const hasMore = rows.length > lim;
  const slice = hasMore ? rows.slice(0, lim) : rows;
  const asc = [...slice].reverse();

  return {
    messages: asc.map(rowToChatMessage),
    hasMore,
    failedReply,
  };
}

/**
 * Older messages strictly before the given cursor (same chronological segment shape as latest page).
 */
export async function listMessagesPageBefore(
  chatId: string,
  limit: number,
  cursor: MessagePageCursor,
  userId: string,
): Promise<ListMessagesPageResult | null> {
  const owned = await assertChatOwnedByUser(chatId, userId);
  if (!owned) {
    return null;
  }

  const lim = clampLimit(limit);
  const rows = await queryAll<MessageRow>(
    `SELECT id, role, content, created_at FROM messages
     WHERE chat_id = ?
       AND (created_at < ? OR (created_at = ? AND id < ?))
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    [chatId, cursor.beforeCreatedAt, cursor.beforeCreatedAt, cursor.beforeId, lim + 1],
  );

  const hasMore = rows.length > lim;
  const slice = hasMore ? rows.slice(0, lim) : rows;
  const asc = [...slice].reverse();

  return {
    messages: asc.map(rowToChatMessage),
    hasMore,
    failedReply: null,
  };
}

export async function getUserMessageForChat(
  chatId: string,
  userMessageId: string,
  userId: string,
): Promise<{ id: string; content: string } | null> {
  const owned = await assertChatOwnedByUser(chatId, userId);
  if (!owned) {
    return null;
  }

  return queryOne<{ id: string; content: string }>(
    `SELECT id, content
     FROM messages
     WHERE id = ? AND chat_id = ? AND role = 'user'`,
    [userMessageId, chatId],
  );
}

export async function persistChatMessage(params: {
  chatId: string;
  userId: string;
  role: ChatMessage['role'];
  content: string;
  resolvePendingForUserMessageId?: string;
}): Promise<{ id: string; createdAt: string }> {
  const owned = await assertChatOwnedByUser(params.chatId, params.userId);
  if (!owned) {
    throw new ApiError('Chat not found', {
      status: 404,
      code: 'CHAT_NOT_FOUND',
      message: 'Chat not found',
    });
  }

  const messageId = crypto.randomUUID();
  const now = new Date().toISOString();
  const tokenCount = estimateMessageTokenCount(params.content);

  await execute(
    `INSERT INTO messages
      (id, chat_id, role, content, created_at, token_count, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [messageId, params.chatId, params.role, params.content, now, tokenCount, null],
  );
  await execute('UPDATE chats SET updated_at = ? WHERE id = ?', [now, params.chatId]);

  if (params.resolvePendingForUserMessageId) {
    await resolvePendingReply(params.resolvePendingForUserMessageId);
  }

  if (params.role === 'assistant') {
    void maybeUpdateChatMemory(params.chatId, params.userId).catch((error) => {
      console.warn('[chat-memory] async update failed', {
        chatId: params.chatId,
        error: error instanceof Error ? error.message : 'unknown-error',
      });
    });
  }

  return { id: messageId, createdAt: now };
}

/** Full message history for the main chat model (stream by `chatId`). */
export async function getMessagesForModelCompletion(
  chatId: string,
  userId: string,
): Promise<ChatMessage[] | null> {
  const owned = await assertChatOwnedByUser(chatId, userId);
  if (!owned) {
    return null;
  }

  const rows = await queryAll<{ role: ChatMessage['role']; content: string }>(
    'SELECT role, content FROM messages WHERE chat_id = ? ORDER BY created_at ASC, id ASC',
    [chatId],
  );

  return rows as ChatMessage[];
}

export async function handleGetMessages(req: Request, userId: string) {
  try {
    const url = new URL(req.url);
    const chatId = url.searchParams.get('chatId');
    if (!chatId) {
      return Response.json({ error: 'Missing chatId' }, { status: 400 });
    }

    const limitRaw = url.searchParams.get('limit');
    const limit = limitRaw != null ? Number.parseInt(limitRaw, 10) : MESSAGE_PAGE_DEFAULT_LIMIT;

    const beforeCreatedAt = url.searchParams.get('beforeCreatedAt');
    const beforeId = url.searchParams.get('beforeId');

    if (beforeCreatedAt != null || beforeId != null) {
      if (!beforeCreatedAt || !beforeId) {
        return Response.json(
          { error: 'beforeCreatedAt and beforeId must be provided together' },
          { status: 400 },
        );
      }

      const page = await listMessagesPageBefore(
        chatId,
        limit,
        {
          beforeCreatedAt,
          beforeId,
        },
        userId,
      );
      if (!page) {
        return Response.json({ error: 'Not found' }, { status: 404 });
      }

      return Response.json({
        messages: page.messages,
        hasMore: page.hasMore,
        failedReply: null,
      });
    }

    const page = await listMessagesLatestPage(chatId, limit, userId);
    if (!page) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    return Response.json({
      messages: page.messages,
      hasMore: page.hasMore,
      failedReply: page.failedReply,
    });
  } catch (error) {
    console.error(error);
    return internalServerErrorResponse();
  }
}

export async function handleAppendMessage(req: Request, userId: string) {
  try {
    const body = await req.json();
    const dto = ChatAppendMessageRequestDtoSchema.parse(body);
    const requestId = dto.requestId ?? createRequestId();
    const persisted = await persistChatMessage({
      chatId: dto.chatId,
      userId,
      role: dto.role,
      content: dto.content,
    });

    logChatEvent(
      'info',
      {
        request_id: requestId,
        user_id: userId,
        chat_id: dto.chatId,
        user_message_id: dto.role === 'user' ? persisted.id : null,
      },
      {
        stage: 'user_message_persist',
        event: dto.role === 'user' ? 'user_message_persisted' : 'message_persisted',
        role: dto.role,
      },
    );

    return Response.json({ id: persisted.id });
  } catch (error) {
    if (error instanceof ZodError) {
      return invalidPayloadResponse(treeifyError(error));
    }

    if (error instanceof ApiError) {
      return apiErrorResponse(error);
    }

    logChatEvent(
      'error',
      {
        request_id: createRequestId(),
        user_id: userId,
      },
      {
        stage: 'user_message_persist',
        event: 'message_persist_failed',
        error: serializeError(error),
      },
    );
    return internalServerErrorResponse();
  }
}

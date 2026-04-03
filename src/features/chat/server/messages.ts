import { ZodError, treeifyError } from 'zod';

import { execute, queryAll, queryOne } from '@/shared/lib/db/client';
import { ChatAppendMessageRequestDtoSchema } from '@/entities/chat';
import type { ChatMessage } from '@/entities/chat';
import { MESSAGE_PAGE_DEFAULT_LIMIT, MESSAGE_PAGE_MAX_LIMIT } from '@/features/chat/lib/constants';

const DEV_USER_ID = '1';

async function assertChatOwnedByUser(chatId: string): Promise<boolean> {
  const row = await queryOne<{ id: string }>('SELECT id FROM chats WHERE id = ? AND user_id = ?', [
    chatId,
    DEV_USER_ID,
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
};

/**
 * Latest page: last `limit` messages in chronological order (oldest of the page first).
 * Uses `LIMIT+1` to compute `hasMore`.
 */
export async function listMessagesLatestPage(
  chatId: string,
  limit: number,
): Promise<ListMessagesPageResult | null> {
  const owned = await assertChatOwnedByUser(chatId);
  if (!owned) {
    return null;
  }

  const lim = clampLimit(limit);
  const rows = await queryAll<MessageRow>(
    `SELECT id, role, content, created_at FROM messages
     WHERE chat_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    [chatId, lim + 1],
  );

  const hasMore = rows.length > lim;
  const slice = hasMore ? rows.slice(0, lim) : rows;
  const asc = [...slice].reverse();

  return {
    messages: asc.map(rowToChatMessage),
    hasMore,
  };
}

/**
 * Older messages strictly before the given cursor (same chronological segment shape as latest page).
 */
export async function listMessagesPageBefore(
  chatId: string,
  limit: number,
  cursor: MessagePageCursor,
): Promise<ListMessagesPageResult | null> {
  const owned = await assertChatOwnedByUser(chatId);
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
  };
}

/**
 * Full history for the model (pagination-independent). Extend here later for summarization / token caps.
 */
export async function getMessagesForModelCompletion(chatId: string): Promise<ChatMessage[] | null> {
  const owned = await assertChatOwnedByUser(chatId);
  if (!owned) {
    return null;
  }

  const rows = await queryAll<{ role: ChatMessage['role']; content: string }>(
    'SELECT role, content FROM messages WHERE chat_id = ? ORDER BY created_at ASC, id ASC',
    [chatId],
  );

  return rows as ChatMessage[];
}

export async function handleGetMessages(req: Request) {
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

      const page = await listMessagesPageBefore(chatId, limit, {
        beforeCreatedAt,
        beforeId,
      });
      if (!page) {
        return Response.json({ error: 'Not found' }, { status: 404 });
      }

      return Response.json({
        messages: page.messages,
        hasMore: page.hasMore,
      });
    }

    const page = await listMessagesLatestPage(chatId, limit);
    if (!page) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    return Response.json({
      messages: page.messages,
      hasMore: page.hasMore,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function handleAppendMessage(req: Request) {
  try {
    const body = await req.json();
    const dto = ChatAppendMessageRequestDtoSchema.parse(body);

    const owned = await assertChatOwnedByUser(dto.chatId);
    if (!owned) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const messageId = crypto.randomUUID();
    const now = new Date().toISOString();

    await execute(
      'INSERT INTO messages (id, chat_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)',
      [messageId, dto.chatId, dto.role, dto.content, now],
    );
    await execute('UPDATE chats SET updated_at = ? WHERE id = ?', [now, dto.chatId]);

    return Response.json({ id: messageId });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: 'Invalid payload', details: treeifyError(error) },
        { status: 400 },
      );
    }

    console.error(error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

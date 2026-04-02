import { ZodError, treeifyError } from 'zod';

import { execute, queryAll, queryOne } from '@/shared/lib/db/client';
import { ChatAppendMessageRequestDtoSchema } from '@/entities/chat';
import type { ChatMessage } from '@/entities/chat';

const DEV_USER_ID = '1';

async function assertChatOwnedByUser(chatId: string): Promise<boolean> {
  const row = await queryOne<{ id: string }>('SELECT id FROM chats WHERE id = ? AND user_id = ?', [
    chatId,
    DEV_USER_ID,
  ]);
  return row != null;
}

/** Used by RSC and GET `/api/chat/history` — loads full history for a chat (owned by dev user). */
export async function listMessagesForChat(chatId: string): Promise<ChatMessage[] | null> {
  const owned = await assertChatOwnedByUser(chatId);
  if (!owned) {
    return null;
  }

  const rows = await queryAll<{ role: ChatMessage['role']; content: string }>(
    'SELECT role, content FROM messages WHERE chat_id = ? ORDER BY created_at ASC',
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

    const messages = await listMessagesForChat(chatId);
    if (!messages) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    return Response.json(messages);
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

import { ZodError, treeifyError } from 'zod';

import { batchExecute, execute, queryOne, queryAll } from '@/shared/lib/db/client';
import {
  ChatCreateRequestDtoSchema,
  ChatUpdateTitleRequestDtoSchema,
  ChatRenameRequestDtoSchema,
  type ChatListRow,
} from '@/entities/chat';

export async function handleCreateChat(req: Request, userId: string) {
  try {
    const body = JSON.parse(await req.text());
    const dto = ChatCreateRequestDtoSchema.parse(body);

    const chatId = crypto.randomUUID();
    const now = new Date().toISOString();

    await batchExecute([
      {
        query:
          'INSERT INTO chats (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        params: [chatId, userId, dto.title, now, now],
      },
    ]);

    return Response.json({ id: chatId, title: dto.title, createdAt: now });
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

/** Shared by GET `/api/chat` and RSC (initial chat list). */
export async function listChatsForUser(userId: string): Promise<ChatListRow[]> {
  return queryAll<ChatListRow>('SELECT * FROM chats WHERE user_id = ? ORDER BY updated_at DESC', [
    userId,
  ]);
}

export async function handleListChats(userId: string) {
  const chats = await listChatsForUser(userId);
  return Response.json(chats);
}

export async function handleUpdateChatTitle(req: Request, chatId: string, userId: string) {
  try {
    const body = await req.json();
    const dto = ChatUpdateTitleRequestDtoSchema.parse(body);

    const row = await queryOne<{ id: string }>(
      'SELECT id FROM chats WHERE id = ? AND user_id = ?',
      [chatId, userId],
    );
    if (!row) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    await execute('UPDATE chats SET title = ?, updated_at = ? WHERE id = ?', [
      dto.title,
      now,
      chatId,
    ]);

    return Response.json({ id: chatId, title: dto.title, updatedAt: now });
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

export async function handleDeleteChat(req: Request, chatId: string, userId: string) {
  try {
    const row = await queryOne<{ id: string }>(
      'SELECT id FROM chats WHERE id = ? AND user_id = ?',
      [chatId, userId],
    );
    if (!row) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    await execute('DELETE FROM chats WHERE id = ?', [chatId]);
    await execute('DELETE FROM messages WHERE chat_id = ?', [chatId]);

    return Response.json({ id: chatId });
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

export async function handleRenameChat(req: Request, chatId: string, userId: string) {
  try {
    const body = await req.json();
    const dto = ChatRenameRequestDtoSchema.parse(body);

    const row = await queryOne<{ id: string }>(
      'SELECT id FROM chats WHERE id = ? AND user_id = ?',
      [chatId, userId],
    );
    if (!row) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    await execute('UPDATE chats SET title = ?, updated_at = ? WHERE id = ?', [
      dto.title,
      now,
      chatId,
    ]);

    return Response.json({ id: chatId, title: dto.title, updatedAt: now });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

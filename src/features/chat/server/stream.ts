import { ZodError, treeifyError } from 'zod';

import { ChatCompleteRequestDtoSchema } from '@/entities/chat';
import { chatService } from '@/shared/lib/ai/chat.service';
import { buildChatContext } from '@/features/chat/server/chatMemory';

export async function handleStream(req: Request) {
  try {
    const body = await req.json();
    const dto = ChatCompleteRequestDtoSchema.parse(body);

    const messages = dto.chatId != null ? await buildChatContext(dto.chatId) : dto.messages;

    if (dto.chatId != null && (!messages || messages.length < 1)) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    if (!messages || messages.length < 1) {
      return Response.json({ error: 'No messages to stream' }, { status: 400 });
    }

    const stream = await chatService.stream({
      messages,
      model: dto.model,
      temperature: dto.temperature,
      maxTokens: dto.maxTokens,
      stream: true,
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
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

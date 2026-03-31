import { ZodError, treeifyError } from 'zod';

import { chatService } from '@/shared/lib/ai/chat.service';
import { ChatCompleteRequestDtoSchema } from '@/entities/chat';
import { getMessageContent } from '@/shared/lib/ai/messageContent';

export async function handleSend(req: Request) {
  try {
    const body = await req.json();
    const dto = ChatCompleteRequestDtoSchema.parse(body);

    const response = await chatService.complete({
      messages: dto.messages ?? [],
      model: dto.model,
      temperature: dto.temperature,
      maxTokens: dto.maxTokens,
    });

    const message = response.choices?.[0]?.message;
    const content = getMessageContent(message ?? undefined);

    return Response.json({ content, raw: response });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: 'Invalid payload', details: treeifyError(error) },
        { status: 400 },
      );
    }

    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

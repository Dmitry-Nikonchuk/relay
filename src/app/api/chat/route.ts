import { ZodError, treeifyError } from 'zod';

import { chatService } from '@/services/chat.service';
import { ChatCompleteRequestDtoSchema } from '@/dto/chat.dto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const dto = ChatCompleteRequestDtoSchema.parse(body);

    const response = await chatService.complete({
      messages: dto.messages ?? [],
      model: dto.model,
      temperature: dto.temperature,
      maxTokens: dto.maxTokens,
    });

    const content = response.choices?.[0]?.message?.content ?? '';

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

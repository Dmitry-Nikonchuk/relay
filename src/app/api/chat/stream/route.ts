import { chatService } from '@/services/chat.service';

import { ChatCompleteRequestDtoSchema } from '@/dto/chat.dto';

export async function POST(req: Request) {
  const body = await req.json();
  const dto = ChatCompleteRequestDtoSchema.parse(body);

  const stream = await chatService.stream({
    messages: dto.messages ?? [],
    model: dto.model,
    temperature: dto.temperature,
    maxTokens: dto.maxTokens,
    stream: true,
  });

  // Проксируем SSE как есть
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

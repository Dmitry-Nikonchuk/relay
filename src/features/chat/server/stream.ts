import { ChatCompleteRequestDtoSchema } from '@/entities/chat';
import { chatService } from '@/shared/lib/ai/chat.service';

export async function handleStream(req: Request) {
  const body = await req.json();
  const dto = ChatCompleteRequestDtoSchema.parse(body);

  const stream = await chatService.stream({
    messages: dto.messages ?? [],
    model: dto.model,
    temperature: dto.temperature,
    maxTokens: dto.maxTokens,
    stream: true,
  });

  // Proxy SSE as-is.
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

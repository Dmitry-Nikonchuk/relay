import { ChatMessage } from '@/domain/chat/chat.types';
import { GenerateTitleRequestDtoSchema } from '@/dto/chat.dto';
import { getMessageContent } from '@/lib/ai/messageContent';
import { chatService } from '@/services/chat.service';
import { treeifyError, ZodError } from 'zod';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const dto = GenerateTitleRequestDtoSchema.parse(body);

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an assistant that creates short, clear chat titles based on the first user message.
      Requirements:
      - Language: same as the user message.
      - Length: 3–7 words.
      - Style: neutral, descriptive, no emojis.
      - Do NOT use quotes.
      - Do NOT add explanations, commentary or numbering.
      - Return ONLY the title text.`,
      },
      {
        role: 'user',
        content: `Read the first user message: ${dto.messageText}. Come up with a concise, human‑readable title for this chat.`,
      },
    ];

    const response = await chatService.complete({
      messages,
      model: 'stepfun/step-3.5-flash:free',
    });

    const content = getMessageContent(response.choices?.[0]?.message);

    return Response.json({ chatTitle: content });
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

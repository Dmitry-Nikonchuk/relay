import { ChatMessage, GenerateTitleRequestDtoSchema } from '@/entities/chat';
import { getMessageContent } from '@/shared/lib/ai/messageContent';
import { chatService } from '@/shared/lib/ai/chat.service';
import { treeifyError, ZodError } from 'zod';

export async function handleGenerateChatTitle(req: Request) {
  try {
    const body = await req.json();
    const dto = GenerateTitleRequestDtoSchema.parse(body);

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an assistant that creates short, clear chat titles based on the first exchange (user message and assistant reply).
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
        content: `User message:\n${dto.userMessage}\n\nAssistant reply:\n${dto.assistantMessage}\n\nCome up with a concise, human‑readable title for this chat.`,
      },
    ];

    const response = await chatService.complete({
      messages,
      model: process.env.OPENROUTER_MODEL ?? 'liquid/lfm-2.5-1.2b-thinking:free',
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

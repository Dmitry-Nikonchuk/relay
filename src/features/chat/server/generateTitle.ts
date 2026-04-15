import { ChatMessage, GenerateTitleRequestDtoSchema } from '@/entities/chat';
import { chatService } from '@/shared/lib/ai/chat.service';
import {
  ApiError,
  apiErrorResponse,
  internalServerErrorResponse,
  invalidPayloadResponse,
} from '@/shared/lib/api/errors';
import { AI } from '@/shared/lib/ai/config';
import { getUserGuardrailContext } from '@/features/user/server/chatModels.service';
import {
  checkGuardrails,
  estimateTokensFromMessages,
  estimateTokensFromText,
  recordGuardrailUsage,
  toGuardrailApiError,
} from '@/shared/lib/guardrails/service';
import { treeifyError, ZodError } from 'zod';
import type { AiAssistantMessage } from '@/shared/lib/ai/types';
import { createRequestId, logChatEvent, serializeError } from '@/shared/lib/logging/chatLogger';
import { sanitizeGeneratedChatTitle } from './chatTitlePolicy';

function getTitleText(message: AiAssistantMessage | null | undefined): string {
  if (!message) {
    return '';
  }

  const content = message.content;
  if (typeof content !== 'string') {
    return '';
  }

  return content.trim();
}

function normalizeGeneratedTitle(raw: string): string {
  const singleLine = raw.replace(/\s+/g, ' ').trim();
  const withoutWrappingQuotes = singleLine.replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim();

  return withoutWrappingQuotes;
}

export async function handleGenerateChatTitle(req: Request, userId: string) {
  const requestId = createRequestId();
  try {
    const body = await req.json();
    const dto = GenerateTitleRequestDtoSchema.parse(body);
    const context = await getUserGuardrailContext(userId);
    if (!context) {
      return apiErrorResponse(
        new ApiError('User not found', {
          status: 404,
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        }),
      );
    }

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

    const promptCharCount = messages.reduce((sum, message) => sum + message.content.length, 0);
    const estimatedPromptTokens = estimateTokensFromMessages(messages);
    const guardrail = await checkGuardrails({
      userId,
      tier: context.tier,
      operation: 'title',
      model: AI.model,
      estimatedPromptTokens,
      promptCharCount,
      promptMessageCount: messages.length,
      requestedMaxTokens: 24,
    });
    if (!guardrail.allowed) {
      return apiErrorResponse(toGuardrailApiError(guardrail.denial));
    }

    const response = await chatService.complete({
      messages,
      model: AI.model,
      temperature: 0,
      maxTokens: 24,
    });

    const generatedTitle = normalizeGeneratedTitle(getTitleText(response.choices?.[0]?.message));
    const titleResolution = sanitizeGeneratedChatTitle(generatedTitle, dto.userMessage);
    const content = titleResolution.title;
    if (titleResolution.reason !== 'ok') {
      logChatEvent(
        'warn',
        {
          request_id: requestId,
          user_id: userId,
          model: AI.model,
          tier: context.tier,
        },
        {
          stage: 'title_generation',
          event: 'title_generation_fallback',
          fallback_reason: titleResolution.reason,
        },
      );
    }

    await recordGuardrailUsage({
      userId,
      tier: context.tier,
      operation: 'title',
      model: AI.model,
      promptTokens: response.usage?.prompt_tokens ?? estimatedPromptTokens,
      completionTokens: response.usage?.completion_tokens ?? estimateTokensFromText(content),
      outcome: 'success',
    });
    return Response.json({ chatTitle: content });
  } catch (error) {
    if (error instanceof ZodError) {
      return invalidPayloadResponse(treeifyError(error));
    }

    logChatEvent(
      'error',
      {
        request_id: requestId,
        user_id: userId,
        model: AI.model,
      },
      {
        stage: 'title_generation',
        event: 'title_generation_failed',
        error: serializeError(error),
      },
    );
    return internalServerErrorResponse();
  }
}

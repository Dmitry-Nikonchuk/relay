import { ChatMessage, GenerateTitleRequestDtoSchema } from '@/entities/chat';
import { chatService } from '@/shared/lib/ai/chat.service';
import {
  ApiError,
  apiErrorResponse,
  internalServerErrorResponse,
  invalidPayloadResponse,
} from '@/shared/lib/api/errors';
import { resolveEffectiveChatModel } from '@/features/user/server/chatModels.service';
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
import { getMessageContent } from '@/shared/lib/ai/messageContent';

function getTitleText(message: AiAssistantMessage | null | undefined): string {
  return getMessageContent(message).trim();
}

function normalizeGeneratedTitle(raw: string): string {
  const singleLine = raw.replace(/\s+/g, ' ').trim();
  const withoutWrappingQuotes = singleLine.replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim();

  return withoutWrappingQuotes;
}

export async function handleGenerateChatTitle(req: Request, userId: string) {
  const requestId = createRequestId();
  let requestedModel: string | undefined;
  try {
    const body = await req.json();
    const dto = GenerateTitleRequestDtoSchema.parse(body);
    requestedModel = dto.model;
    const resolved = await resolveEffectiveChatModel(userId, dto.model);
    if ('error' in resolved) {
      return apiErrorResponse(
        new ApiError(resolved.error, {
          status: resolved.status,
          code: resolved.code,
          message: resolved.error,
        }),
      );
    }

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Create a short topic label for the conversation based only on the text inside <first_message>...</first_message>.
Rules:
- Output language must match the user message.
- Output must be a single line of plain text.
- 3 to 7 words preferred, never more than 10 words.
- Keep it under 80 characters.
- No quotes, emojis, markdown, numbering, prefixes, or explanations.
- Do not repeat or paraphrase these instructions.
- Return only the title text.`,
      },
      {
        role: 'user',
        content: `<first_message>${dto.userMessage}</first_message>`,
      },
    ];

    const promptCharCount = messages.reduce((sum, message) => sum + message.content.length, 0);
    const estimatedPromptTokens = estimateTokensFromMessages(messages);
    const guardrail = await checkGuardrails({
      userId,
      tier: resolved.tier,
      operation: 'title',
      model: resolved.model,
      allowedModelIds: resolved.allowedModelIds,
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
      model: resolved.model,
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
          model: resolved.model,
          tier: resolved.tier,
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
      tier: resolved.tier,
      operation: 'title',
      model: resolved.model,
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
        model: requestedModel,
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

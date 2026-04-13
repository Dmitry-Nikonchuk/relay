import { ZodError, treeifyError } from 'zod';

import { chatService } from '@/shared/lib/ai/chat.service';
import { ChatCompleteRequestDtoSchema } from '@/entities/chat';
import {
  apiErrorResponse,
  internalServerErrorResponse,
  invalidPayloadResponse,
} from '@/shared/lib/api/errors';
import { getMessageContent } from '@/shared/lib/ai/messageContent';
import { resolveEffectiveChatModel } from '@/features/user/server/chatModels.service';
import {
  checkGuardrails,
  estimateTokensFromMessages,
  estimateTokensFromText,
  recordGuardrailUsage,
  toGuardrailApiError,
} from '@/shared/lib/guardrails/service';

function getLatestUserMessageChars(messages: Array<{ role: string; content: string }>): number {
  const lastUser = [...messages].reverse().find((message) => message.role === 'user');
  return lastUser?.content.trim().length ?? 0;
}

export async function handleSend(req: Request, userId: string) {
  try {
    const body = await req.json();
    const dto = ChatCompleteRequestDtoSchema.parse(body);

    const resolved = await resolveEffectiveChatModel(userId, dto.model);
    if ('error' in resolved) {
      return apiErrorResponse(
        toGuardrailApiError({
          status: resolved.status as 403 | 429,
          code: resolved.code as
            | 'MODEL_NOT_ALLOWED'
            | 'MESSAGE_TOO_LARGE'
            | 'PROMPT_TOO_LARGE'
            | 'TOO_MANY_MESSAGES'
            | 'MAX_TOKENS_TOO_HIGH'
            | 'RATE_LIMITED'
            | 'DAILY_QUOTA_EXCEEDED',
          message: resolved.error,
        }),
      );
    }

    const messages = dto.messages ?? [];
    const promptCharCount = messages.reduce((sum, message) => sum + message.content.length, 0);
    const estimatedPromptTokens = estimateTokensFromMessages(messages);
    const guardrail = await checkGuardrails({
      userId,
      tier: resolved.tier,
      operation: 'chat',
      model: resolved.model,
      allowedModelIds: resolved.allowedModelIds,
      estimatedPromptTokens,
      promptCharCount,
      promptMessageCount: messages.length,
      latestUserMessageChars: getLatestUserMessageChars(messages),
      requestedMaxTokens: dto.maxTokens,
    });

    if (!guardrail.allowed) {
      return apiErrorResponse(toGuardrailApiError(guardrail.denial));
    }

    const response = await chatService.complete({
      messages,
      model: resolved.model,
      temperature: dto.temperature,
      maxTokens: dto.maxTokens,
    });

    const message = response.choices?.[0]?.message;
    const content = getMessageContent(message ?? undefined);

    void recordGuardrailUsage({
      userId,
      tier: resolved.tier,
      operation: 'chat',
      model: resolved.model,
      promptTokens: response.usage?.prompt_tokens ?? estimatedPromptTokens,
      completionTokens: response.usage?.completion_tokens ?? estimateTokensFromText(content),
      outcome: 'success',
    }).catch((recordError) => {
      console.warn('[guardrails] failed to record send usage', {
        error: recordError instanceof Error ? recordError.message : 'unknown-error',
      });
    });

    return Response.json({ content, raw: response });
  } catch (error) {
    if (error instanceof ZodError) {
      return invalidPayloadResponse(treeifyError(error));
    }

    return internalServerErrorResponse();
  }
}

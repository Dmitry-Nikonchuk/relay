import { ZodError, treeifyError } from 'zod';

import { ChatCompleteRequestDtoSchema } from '@/entities/chat';
import { chatService } from '@/shared/lib/ai/chat.service';
import {
  apiErrorResponse,
  internalServerErrorResponse,
  invalidPayloadResponse,
} from '@/shared/lib/api/errors';
import { buildChatContext } from '@/features/chat/server/chatMemory';
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

function createUsageTrackingStream(params: {
  upstream: ReadableStream<Uint8Array>;
  userId: string;
  tier: 'free' | 'pro';
  model: string;
  estimatedPromptTokens: number;
}) {
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  function parseBufferedSegments() {
    const segments = buffer.split('\n\n');
    buffer = segments.pop() ?? '';

    for (const segment of segments) {
      const line = segment
        .split('\n')
        .map((item) => item.trim())
        .find((item) => item.startsWith('data:'));

      if (!line) {
        continue;
      }

      const data = line.replace(/^data:\s*/, '');
      if (data === '[DONE]') {
        continue;
      }

      try {
        const json = JSON.parse(data) as {
          choices?: Array<{
            delta?: { content?: string | Array<{ text?: string; content?: string }> };
          }>;
        };
        const delta = json.choices?.[0]?.delta?.content;
        const chunkText = Array.isArray(delta)
          ? delta.map((part) => part.text ?? part.content ?? '').join('')
          : typeof delta === 'string'
            ? delta
            : '';
        fullText += chunkText;
      } catch {
        continue;
      }
    }
  }

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = params.upstream.getReader();
      let outcome: 'success' | 'error' = 'success';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          if (value) {
            controller.enqueue(value);
            buffer += decoder.decode(value, { stream: true });
            parseBufferedSegments();
          }
        }

        buffer += decoder.decode();
        parseBufferedSegments();
        controller.close();
      } catch (error) {
        outcome = 'error';
        controller.error(error);
      } finally {
        await recordGuardrailUsage({
          userId: params.userId,
          tier: params.tier,
          operation: 'chat',
          model: params.model,
          promptTokens: params.estimatedPromptTokens,
          completionTokens: estimateTokensFromText(fullText),
          outcome,
        }).catch((recordError) => {
          console.warn('[guardrails] failed to record stream usage', {
            error: recordError instanceof Error ? recordError.message : 'unknown-error',
          });
        });
      }
    },
  });
}

export async function handleStream(req: Request, userId: string) {
  try {
    const body = await req.json();
    const dto = ChatCompleteRequestDtoSchema.parse(body);

    const messages = dto.chatId != null ? await buildChatContext(dto.chatId, userId) : dto.messages;

    if (dto.chatId != null && (!messages || messages.length < 1)) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    if (!messages || messages.length < 1) {
      return Response.json({ error: 'No messages to stream' }, { status: 400 });
    }

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

    const upstream = await chatService.stream({
      messages,
      model: resolved.model,
      temperature: dto.temperature,
      maxTokens: dto.maxTokens,
      stream: true,
    });

    const stream = createUsageTrackingStream({
      upstream,
      userId,
      tier: resolved.tier,
      model: resolved.model,
      estimatedPromptTokens,
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
      return invalidPayloadResponse(treeifyError(error));
    }

    console.error(error);
    return internalServerErrorResponse();
  }
}

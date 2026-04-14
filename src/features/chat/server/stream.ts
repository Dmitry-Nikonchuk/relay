import { ZodError, treeifyError } from 'zod';

import { ChatCompleteRequestDtoSchema } from '@/entities/chat';
import { chatService } from '@/shared/lib/ai/chat.service';
import {
  ApiError,
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
import { classifyChatFailure } from './chatFailures';
import { getUserMessageForChat, persistChatMessage } from './messages';
import { resolvePendingReply, upsertPendingReply } from './pendingReplies';
import { createRequestId, logChatEvent, serializeError } from '@/shared/lib/logging/chatLogger';

function getLatestUserMessageChars(messages: Array<{ role: string; content: string }>): number {
  const lastUser = [...messages].reverse().find((message) => message.role === 'user');
  return lastUser?.content.trim().length ?? 0;
}

function createUsageTrackingStream(params: {
  upstream: ReadableStream<Uint8Array>;
  userId: string;
  chatId: string;
  userMessageId: string | null;
  userMessageText: string | null;
  requestId: string;
  tier: 'free' | 'pro';
  model: string;
  estimatedPromptTokens: number;
  createPendingReplyOnFailure: (
    stage: 'stream_open' | 'stream_consume' | 'assistant_persist',
    error: unknown,
  ) => Promise<void>;
}) {
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let sawDone = false;
  let sawFirstToken = false;
  const startedAt = Date.now();

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
        sawDone = true;
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
        if (chunkText && !sawFirstToken) {
          sawFirstToken = true;
          logChatEvent(
            'info',
            {
              request_id: params.requestId,
              user_id: params.userId,
              chat_id: params.chatId,
              user_message_id: params.userMessageId,
              model: params.model,
              tier: params.tier,
            },
            {
              stage: 'stream_consume',
              event: 'first_token_received',
              duration_ms: Date.now() - startedAt,
            },
          );
        }
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
        if (!sawDone) {
          throw new Error('Stream ended without DONE marker');
        }

        try {
          await persistChatMessage({
            chatId: params.chatId,
            userId: params.userId,
            role: 'assistant',
            content: fullText,
            resolvePendingForUserMessageId: params.userMessageId ?? undefined,
          });
          logChatEvent(
            'info',
            {
              request_id: params.requestId,
              user_id: params.userId,
              chat_id: params.chatId,
              user_message_id: params.userMessageId,
              model: params.model,
              tier: params.tier,
            },
            {
              stage: 'assistant_persist',
              event: 'assistant_persisted',
              duration_ms: Date.now() - startedAt,
              completion_chars: fullText.length,
            },
          );
        } catch (error) {
          await params.createPendingReplyOnFailure('assistant_persist', error);
          throw error;
        }

        controller.close();
      } catch (error) {
        outcome = 'error';
        await params.createPendingReplyOnFailure('stream_consume', error);
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
  let requestId = createRequestId();
  try {
    const body = await req.json();
    const dto = ChatCompleteRequestDtoSchema.parse(body);
    requestId = dto.requestId ?? requestId;
    const chatId = dto.chatId ?? null;
    const userMessage =
      chatId && dto.userMessageId
        ? await getUserMessageForChat(chatId, dto.userMessageId, userId)
        : null;

    const recordPendingReply = async (params: {
      model?: string;
      failureStage: 'guardrail_check' | 'stream_open' | 'stream_consume' | 'assistant_persist';
      failureCode: string;
      failureMessage: string;
      retryable: boolean;
    }) => {
      if (!chatId || !userMessage) {
        return;
      }

      await upsertPendingReply({
        chatId,
        userMessageId: userMessage.id,
        userMessageText: userMessage.content,
        model: params.model,
        failureStage: params.failureStage,
        failureCode: params.failureCode,
        failureMessage: params.failureMessage,
        requestId,
      });

      logChatEvent(
        'warn',
        {
          request_id: requestId,
          user_id: userId,
          chat_id: chatId,
          user_message_id: userMessage.id,
          model: params.model,
        },
        {
          stage: params.failureStage,
          event: 'pending_reply_recorded',
          error_code: params.failureCode,
          error_message: params.failureMessage,
          retryable: params.retryable,
        },
      );
    };

    const messages = dto.chatId != null ? await buildChatContext(dto.chatId, userId) : dto.messages;

    if (dto.chatId != null && (!messages || messages.length < 1)) {
      return apiErrorResponse(
        new ApiError('Chat not found', {
          status: 404,
          code: 'CHAT_NOT_FOUND',
          message: 'Chat not found',
        }),
      );
    }

    if (!messages || messages.length < 1) {
      return invalidPayloadResponse({ error: 'No messages to stream' });
    }

    const resolved = await resolveEffectiveChatModel(userId, dto.model);
    if ('error' in resolved) {
      const apiError = toGuardrailApiError({
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
      });
      const failure = classifyChatFailure(apiError, 'guardrail_check');
      logChatEvent(
        failure.logLevel,
        {
          request_id: requestId,
          user_id: userId,
          chat_id: chatId,
          user_message_id: dto.userMessageId ?? null,
        },
        {
          stage: 'guardrail_check',
          event: 'guardrail_denied',
          error_code: failure.code,
          error_message: failure.message,
          retryable: failure.retryable,
        },
      );
      await recordPendingReply({
        model: dto.model,
        failureStage: 'guardrail_check',
        failureCode: apiError.code,
        failureMessage: apiError.message,
        retryable: failure.retryable,
      });
      return apiErrorResponse(apiError);
    }

    const createPendingReplyOnFailure = async (
      stage: 'stream_open' | 'stream_consume' | 'assistant_persist',
      error: unknown,
    ) => {
      const failure = classifyChatFailure(error, stage);
      if (!failure.shouldCreatePendingReply) {
        return;
      }
      await recordPendingReply({
        model: resolved.model,
        failureStage: stage,
        failureCode: failure.code,
        failureMessage: failure.message,
        retryable: failure.retryable,
      });
    };

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
      const apiError = toGuardrailApiError(guardrail.denial);
      const failure = classifyChatFailure(apiError, 'guardrail_check');
      logChatEvent(
        failure.logLevel,
        {
          request_id: requestId,
          user_id: userId,
          chat_id: chatId,
          user_message_id: dto.userMessageId ?? null,
          model: resolved.model,
          tier: resolved.tier,
        },
        {
          stage: 'guardrail_check',
          event: 'guardrail_denied',
          error_code: failure.code,
          error_message: failure.message,
          retryable: failure.retryable,
        },
      );
      await recordPendingReply({
        model: resolved.model,
        failureStage: 'guardrail_check',
        failureCode: apiError.code,
        failureMessage: apiError.message,
        retryable: failure.retryable,
      });
      return apiErrorResponse(apiError);
    }

    logChatEvent(
      'info',
      {
        request_id: requestId,
        user_id: userId,
        chat_id: chatId,
        user_message_id: dto.userMessageId ?? null,
        model: resolved.model,
        tier: resolved.tier,
      },
      {
        stage: 'stream_open',
        event: 'stream_requested',
        prompt_messages: messages.length,
        prompt_chars: promptCharCount,
      },
    );

    let upstream: ReadableStream<Uint8Array>;
    try {
      upstream = await chatService.stream({
        messages,
        model: resolved.model,
        temperature: dto.temperature,
        maxTokens: dto.maxTokens,
        stream: true,
      });
    } catch (error) {
      await createPendingReplyOnFailure('stream_open', error);
      const failure = classifyChatFailure(error, 'stream_open');
      logChatEvent(
        failure.logLevel,
        {
          request_id: requestId,
          user_id: userId,
          chat_id: chatId,
          user_message_id: dto.userMessageId ?? null,
          model: resolved.model,
          tier: resolved.tier,
        },
        {
          stage: 'stream_open',
          event: 'stream_open_failed',
          error_code: failure.code,
          error_message: failure.message,
          retryable: failure.retryable,
          error: serializeError(error),
        },
      );
      return apiErrorResponse(
        new ApiError(failure.message, {
          status: failure.status,
          code: failure.code,
          message: failure.message,
        }),
      );
    }

    if (userMessage) {
      await resolvePendingReply(userMessage.id);
    }

    logChatEvent(
      'info',
      {
        request_id: requestId,
        user_id: userId,
        chat_id: chatId,
        user_message_id: dto.userMessageId ?? null,
        model: resolved.model,
        tier: resolved.tier,
      },
      {
        stage: 'stream_open',
        event: 'stream_opened',
      },
    );

    const stream = createUsageTrackingStream({
      upstream,
      userId,
      chatId: chatId ?? '',
      userMessageId: userMessage?.id ?? null,
      userMessageText: userMessage?.content ?? null,
      requestId,
      tier: resolved.tier,
      model: resolved.model,
      estimatedPromptTokens,
      createPendingReplyOnFailure,
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

    logChatEvent(
      'error',
      {
        request_id: requestId,
        user_id: userId,
      },
      {
        stage: 'stream_open',
        event: 'stream_request_failed',
        error: serializeError(error),
      },
    );
    return internalServerErrorResponse();
  }
}

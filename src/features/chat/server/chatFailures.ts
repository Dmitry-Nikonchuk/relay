import { ApiError } from '@/shared/lib/api/errors';
import { AiProviderError } from '@/shared/lib/ai/errors';

export type ChatFailureCode =
  | 'UPSTREAM_UNAVAILABLE'
  | 'STREAM_INTERRUPTED'
  | 'ASSISTANT_SAVE_FAILED'
  | 'CHAT_NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'GUARDRAIL_DENIED'
  | 'INVALID_PAYLOAD'
  | 'TITLE_GENERATION_FAILED'
  | 'INTERNAL_ERROR';

export type ChatFailureStage =
  | 'chat_creation'
  | 'user_message_persist'
  | 'guardrail_check'
  | 'stream_open'
  | 'stream_consume'
  | 'assistant_persist'
  | 'title_generation';

export type ChatFailureInfo = {
  code: ChatFailureCode;
  message: string;
  status: number;
  retryable: boolean;
  shouldCreatePendingReply: boolean;
  logLevel: 'info' | 'warn' | 'error';
};

export function classifyChatFailure(error: unknown, stage: ChatFailureStage): ChatFailureInfo {
  if (error instanceof ApiError) {
    if (
      error.code === 'MODEL_NOT_ALLOWED' ||
      error.code === 'MESSAGE_TOO_LARGE' ||
      error.code === 'PROMPT_TOO_LARGE' ||
      error.code === 'TOO_MANY_MESSAGES' ||
      error.code === 'MAX_TOKENS_TOO_HIGH' ||
      error.code === 'RATE_LIMITED' ||
      error.code === 'DAILY_QUOTA_EXCEEDED'
    ) {
      return {
        code: 'GUARDRAIL_DENIED',
        message: error.message,
        status: error.status,
        retryable: error.code === 'RATE_LIMITED',
        shouldCreatePendingReply: false,
        logLevel: 'warn',
      };
    }

    if (error.code === 'INVALID_PAYLOAD') {
      return {
        code: 'INVALID_PAYLOAD',
        message: error.message,
        status: error.status,
        retryable: false,
        shouldCreatePendingReply: false,
        logLevel: 'warn',
      };
    }
  }

  if (error instanceof AiProviderError) {
    return {
      code: 'UPSTREAM_UNAVAILABLE',
      message: error.status ? `AI provider error ${error.status}` : 'AI provider unavailable',
      status: 502,
      retryable: true,
      shouldCreatePendingReply: true,
      logLevel: 'warn',
    };
  }

  if (stage === 'stream_consume') {
    return {
      code: 'STREAM_INTERRUPTED',
      message: 'The reply was interrupted before it could finish.',
      status: 502,
      retryable: true,
      shouldCreatePendingReply: true,
      logLevel: 'warn',
    };
  }

  if (stage === 'assistant_persist') {
    return {
      code: 'ASSISTANT_SAVE_FAILED',
      message: 'The reply was generated but could not be saved.',
      status: 500,
      retryable: true,
      shouldCreatePendingReply: true,
      logLevel: 'error',
    };
  }

  if (stage === 'title_generation') {
    return {
      code: 'TITLE_GENERATION_FAILED',
      message: 'Title generation failed.',
      status: 500,
      retryable: false,
      shouldCreatePendingReply: false,
      logLevel: 'warn',
    };
  }

  return {
    code: 'INTERNAL_ERROR',
    message: error instanceof Error && error.message ? error.message : 'Internal server error',
    status: 500,
    retryable: true,
    shouldCreatePendingReply: stage === 'stream_open',
    logLevel: 'error',
  };
}

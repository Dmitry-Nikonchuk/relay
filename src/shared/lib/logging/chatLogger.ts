import { AiProviderError } from '@/shared/lib/ai/errors';
import { HttpError } from '@/shared/lib/http/client';

type ChatLogLevel = 'info' | 'warn' | 'error';

export type ChatLogContext = {
  request_id: string;
  user_id?: string;
  chat_id?: string | null;
  user_message_id?: string | null;
  model?: string;
  tier?: string;
};

export function createRequestId(): string {
  return crypto.randomUUID();
}

export function serializeError(error: unknown) {
  if (error instanceof AiProviderError) {
    return {
      name: error.name,
      message: error.message,
      status: error.status,
      provider: error.provider,
    };
  }

  if (error instanceof HttpError) {
    return {
      name: error.name,
      message: error.message,
      status: error.status,
      code: error.code,
      retryAfterSeconds: error.retryAfterSeconds,
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    name: 'UnknownError',
    message: typeof error === 'string' ? error : 'unknown-error',
  };
}

export function logChatEvent(
  level: ChatLogLevel,
  context: ChatLogContext,
  payload: Record<string, unknown>,
): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    ...context,
    ...payload,
  };
  const line = JSON.stringify(entry);

  if (level === 'error') {
    console.error(line);
    return;
  }
  if (level === 'warn') {
    console.warn(line);
    return;
  }
  console.info(line);
}

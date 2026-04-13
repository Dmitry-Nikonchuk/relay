import type { ChatMessage } from '@/entities/chat';
import { HttpError } from '@/shared/lib/http/client';

export type ChatSendFailureState = {
  userText: string;
  error: string;
  canRetry: boolean;
  /** True after the user message was stored via append API. */
  userPersisted: boolean;
  /** Chat id for stream/append; null if setup did not complete. */
  chatId: string | null;
  /** First message in a new chat — generate title after a successful stream retry. */
  generateTitleAfterStream?: boolean;
};

export function trimTrailingAssistant(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length === 0) return messages;
  const last = messages[messages.length - 1];
  if (last?.role === 'assistant') {
    return messages.slice(0, -1);
  }
  return messages;
}

export function getChatSendErrorMessage(e: unknown): string {
  if (e instanceof HttpError) {
    if (e.code === 'RATE_LIMITED' && e.retryAfterSeconds != null) {
      return `${e.message} Retry in ${e.retryAfterSeconds}s.`;
    }
    if (e.code === 'DAILY_QUOTA_EXCEEDED' && e.resetAt) {
      const reset = new Date(e.resetAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `${e.message} Resets at ${reset}.`;
    }
    return e.message;
  }
  if (e instanceof Error && e.message) {
    return e.message;
  }
  return 'Something went wrong. Please try again.';
}

export function canRetrySendError(e: unknown): boolean {
  if (e instanceof HttpError) {
    if (e.status >= 500) {
      return true;
    }
    return e.code === 'RATE_LIMITED';
  }

  return e instanceof Error;
}

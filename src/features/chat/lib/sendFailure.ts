import type { ChatMessage } from '@/entities/chat';

export type ChatSendFailureState = {
  userText: string;
  error: string;
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
  if (e instanceof Error && e.message) {
    return e.message;
  }
  return 'Something went wrong. Please try again.';
}

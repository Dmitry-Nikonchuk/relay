import { ChatMemoryJsonSchema, type ChatMemory, type ChatMemoryJson } from './chat.memory.types';

export type ChatMemoryRow = {
  chat_id: string;
  summary_text: string | null;
  summary_json: string | null;
  last_summarized_message_id: string | null;
  updated_at: string;
};

export function parseChatMemoryJson(raw: string | null): ChatMemoryJson | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return ChatMemoryJsonSchema.parse(parsed);
  } catch {
    return null;
  }
}

export function mapChatMemoryRowToChatMemory(row: ChatMemoryRow): ChatMemory {
  return {
    chatId: row.chat_id,
    summaryText: row.summary_text,
    summaryJson: parseChatMemoryJson(row.summary_json),
    lastSummarizedMessageId: row.last_summarized_message_id,
    updatedAt: row.updated_at,
  };
}

export function stringifyChatMemoryJson(memory: ChatMemoryJson): string {
  return JSON.stringify(memory);
}

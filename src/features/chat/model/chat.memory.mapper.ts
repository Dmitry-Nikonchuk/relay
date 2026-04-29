import { ChatMemoryJsonSchema, type ChatMemory, type ChatMemoryJson } from './chat.memory.types';
import { createUserChatCipher } from '@/shared/lib/security/chatEncryption';

export type ChatMemoryRow = {
  chat_id: string;
  summary_text: string | null;
  summary_json: string | null;
  last_summarized_message_id: string | null;
  updated_at: string;
};

export async function parseChatMemoryJson(
  raw: string | null,
  userId: string,
  chatId: string,
): Promise<ChatMemoryJson | null> {
  if (raw == null) {
    return null;
  }

  try {
    const cipher = await createUserChatCipher(userId);
    const decrypted = await cipher.decrypt(raw, 'chat_memory_summary_json', chatId);
    const parsed = JSON.parse(decrypted);
    return ChatMemoryJsonSchema.parse(parsed);
  } catch {
    return null;
  }
}

export async function mapChatMemoryRowToChatMemory(
  row: ChatMemoryRow,
  userId: string,
): Promise<ChatMemory> {
  const cipher = await createUserChatCipher(userId);
  return {
    chatId: row.chat_id,
    summaryText: await cipher.decryptNullable(
      row.summary_text,
      'chat_memory_summary_text',
      row.chat_id,
    ),
    summaryJson: await parseChatMemoryJson(row.summary_json, userId, row.chat_id),
    lastSummarizedMessageId: row.last_summarized_message_id,
    updatedAt: row.updated_at,
  };
}

export function stringifyChatMemoryJson(memory: ChatMemoryJson): string {
  return JSON.stringify(memory);
}

import {
  ChatMemoryJsonSchema,
  createEmptyChatMemoryJson,
  mapChatMemoryRowToChatMemory,
  stringifyChatMemoryJson,
  type ChatMemory,
  type ChatMemoryJson,
  type ChatMemoryRow,
  type ChatMessage,
} from '@/entities/chat';
import {
  RECENT_CONTEXT_MESSAGES,
  SUMMARY_CHUNK_MESSAGES,
  SUMMARY_TRIGGER_MESSAGES,
  SUMMARY_TRIGGER_TOKENS,
} from '@/features/chat/lib/constants';
import { chatService } from '@/shared/lib/ai/chat.service';
import { AI } from '@/shared/lib/ai/config';
import { AiProviderError } from '@/shared/lib/ai/errors';
import { getMessageContent } from '@/shared/lib/ai/messageContent';
import { execute, queryAll, queryOne } from '@/shared/lib/db/client';
import { buildChatMemorySummaryPrompt } from './prompts/chatMemorySummaryPrompt';

const DEV_USER_ID = '1';

const BASE_CHAT_SYSTEM_PROMPT = [
  'You are Relay, a helpful assistant.',
  'Use the provided memory and recent messages as conversation context.',
  'Prefer concise, accurate responses and keep continuity with prior decisions.',
].join(' ');

type MessageRow = {
  id: string;
  role: ChatMessage['role'];
  content: string;
  created_at: string;
  token_count?: number | null;
};

type ChatSummaryRow = {
  chat_id: string;
  content: string;
  last_covered_message_id: string;
};

type MessageCursorRow = {
  id: string;
  created_at: string;
};

function estimateTokens(content: string): number {
  if (!content) {
    return 0;
  }

  return Math.max(1, Math.ceil(content.length / 4));
}

function rowToChatMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

function chunkMessages(messages: MessageRow[], chunkSize: number): MessageRow[][] {
  const chunks: MessageRow[][] = [];

  for (let i = 0; i < messages.length; i += chunkSize) {
    chunks.push(messages.slice(i, i + chunkSize));
  }

  return chunks;
}

function extractJsonCandidate(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  const firstNewline = trimmed.indexOf('\n');
  const lastFence = trimmed.lastIndexOf('```');
  if (firstNewline < 0 || lastFence <= firstNewline) {
    return trimmed;
  }

  return trimmed.slice(firstNewline + 1, lastFence).trim();
}

function normalizeExistingSummary(memory: ChatMemory | null): ChatMemoryJson {
  if (memory?.summaryJson) {
    return memory.summaryJson;
  }

  if (memory?.summaryText && memory.summaryText.trim().length > 0) {
    return {
      ...createEmptyChatMemoryJson(),
      summary_text: memory.summaryText,
    };
  }

  return createEmptyChatMemoryJson();
}

function formatMemoryForContext(memory: ChatMemory): string | null {
  if (!memory.summaryJson && !memory.summaryText) {
    return null;
  }

  const payload = memory.summaryJson
    ? memory.summaryJson
    : {
        ...createEmptyChatMemoryJson(),
        summary_text: memory.summaryText ?? '',
      };

  return [
    'Conversation working memory.',
    'Use it as compact context; do not repeat it verbatim unless user asks.',
    JSON.stringify(payload),
  ].join('\n');
}

async function assertChatOwnedByUser(chatId: string): Promise<boolean> {
  const row = await queryOne<{ id: string }>('SELECT id FROM chats WHERE id = ? AND user_id = ?', [
    chatId,
    DEV_USER_ID,
  ]);

  return row != null;
}

async function getRecentMessages(chatId: string, limit: number): Promise<ChatMessage[]> {
  const rows = await queryAll<MessageRow>(
    `SELECT id, role, content, created_at
     FROM messages
     WHERE chat_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    [chatId, limit],
  );

  return rows.reverse().map(rowToChatMessage);
}

async function getMemoryFromBackfill(chatId: string): Promise<ChatMemory | null> {
  const existing = await queryOne<ChatMemoryRow>(
    'SELECT chat_id, summary_text, summary_json, last_summarized_message_id, updated_at FROM chat_memory WHERE chat_id = ?',
    [chatId],
  );

  if (existing) {
    return mapChatMemoryRowToChatMemory(existing);
  }

  const legacySummary = await queryOne<ChatSummaryRow>(
    'SELECT chat_id, content, last_covered_message_id FROM chat_summaries WHERE chat_id = ?',
    [chatId],
  );

  if (!legacySummary) {
    return null;
  }

  const now = new Date().toISOString();
  const summaryJson = {
    ...createEmptyChatMemoryJson(),
    summary_text: legacySummary.content,
  };

  await execute(
    `INSERT OR IGNORE INTO chat_memory
      (chat_id, summary_text, summary_json, last_summarized_message_id, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [
      chatId,
      legacySummary.content,
      stringifyChatMemoryJson(summaryJson),
      legacySummary.last_covered_message_id,
      now,
    ],
  );

  const inserted = await queryOne<ChatMemoryRow>(
    'SELECT chat_id, summary_text, summary_json, last_summarized_message_id, updated_at FROM chat_memory WHERE chat_id = ?',
    [chatId],
  );

  return inserted ? mapChatMemoryRowToChatMemory(inserted) : null;
}

async function listUnsummarizedMessages(
  chatId: string,
  lastSummarizedMessageId: string | null,
): Promise<MessageRow[]> {
  if (!lastSummarizedMessageId) {
    return queryAll<MessageRow>(
      `SELECT id, role, content, created_at, token_count
       FROM messages
       WHERE chat_id = ?
       ORDER BY created_at ASC, id ASC`,
      [chatId],
    );
  }

  const cursor = await queryOne<MessageCursorRow>(
    'SELECT id, created_at FROM messages WHERE chat_id = ? AND id = ?',
    [chatId, lastSummarizedMessageId],
  );

  if (!cursor) {
    return queryAll<MessageRow>(
      `SELECT id, role, content, created_at, token_count
       FROM messages
       WHERE chat_id = ?
       ORDER BY created_at ASC, id ASC`,
      [chatId],
    );
  }

  return queryAll<MessageRow>(
    `SELECT id, role, content, created_at, token_count
     FROM messages
     WHERE chat_id = ?
       AND (created_at > ? OR (created_at = ? AND id > ?))
     ORDER BY created_at ASC, id ASC`,
    [chatId, cursor.created_at, cursor.created_at, cursor.id],
  );
}

async function summarizeDeltaChunk(
  previousSummary: ChatMemoryJson,
  deltaMessages: ChatMessage[],
): Promise<ChatMemoryJson> {
  const response = await chatService.complete({
    model: AI.summaryModel,
    temperature: 0,
    maxTokens: 1000,
    messages: buildChatMemorySummaryPrompt(previousSummary, deltaMessages),
  });

  const content = getMessageContent(response.choices?.[0]?.message);
  if (!content || content.trim().length < 2) {
    throw new Error('Summary model returned empty payload');
  }

  const parsed = JSON.parse(extractJsonCandidate(content));
  return ChatMemoryJsonSchema.parse(parsed);
}

export async function buildChatContext(
  chatId: string,
  currentUserMessage?: string,
): Promise<ChatMessage[] | null> {
  const owned = await assertChatOwnedByUser(chatId);
  if (!owned) {
    return null;
  }

  const [memory, recentMessages] = await Promise.all([
    getMemoryFromBackfill(chatId),
    getRecentMessages(chatId, RECENT_CONTEXT_MESSAGES),
  ]);

  const normalizedUserMessage = currentUserMessage?.trim();
  if (recentMessages.length < 1 && !normalizedUserMessage) {
    return [];
  }

  const context: ChatMessage[] = [{ role: 'system', content: BASE_CHAT_SYSTEM_PROMPT }];

  if (memory) {
    const memoryBlock = formatMemoryForContext(memory);
    if (memoryBlock) {
      context.push({ role: 'system', content: memoryBlock });
    }
  }

  context.push(
    ...recentMessages.map((message) => ({ role: message.role, content: message.content })),
  );

  if (normalizedUserMessage) {
    const lastMessage = context[context.length - 1];
    const isDuplicate =
      lastMessage?.role === 'user' && lastMessage.content.trim() === normalizedUserMessage;
    if (!isDuplicate) {
      context.push({ role: 'user', content: normalizedUserMessage });
    }
  }

  return context;
}

export async function maybeUpdateChatMemory(chatId: string): Promise<void> {
  const memory = await getMemoryFromBackfill(chatId);
  const unsummarized = await listUnsummarizedMessages(
    chatId,
    memory?.lastSummarizedMessageId ?? null,
  );

  if (unsummarized.length < 1) {
    console.info('[chat-memory] skip: no unsummarized messages', { chatId });
    return;
  }

  const deltaTokens = unsummarized.reduce((sum, message) => {
    return sum + (message.token_count ?? estimateTokens(message.content));
  }, 0);

  const reachedThreshold =
    unsummarized.length >= SUMMARY_TRIGGER_MESSAGES || deltaTokens >= SUMMARY_TRIGGER_TOKENS;

  if (!reachedThreshold) {
    console.info('[chat-memory] skip: threshold not reached', {
      chatId,
      unsummarizedMessages: unsummarized.length,
      unsummarizedTokens: deltaTokens,
    });
    return;
  }

  console.info('[chat-memory] summary update started', {
    chatId,
    unsummarizedMessages: unsummarized.length,
    unsummarizedTokens: deltaTokens,
  });

  let workingSummary = normalizeExistingSummary(memory);
  const chunks = chunkMessages(unsummarized, SUMMARY_CHUNK_MESSAGES);

  try {
    for (const chunk of chunks) {
      const chunkMessagesForPrompt = chunk.map(rowToChatMessage);
      workingSummary = await summarizeDeltaChunk(workingSummary, chunkMessagesForPrompt);
    }

    const lastProcessed = unsummarized[unsummarized.length - 1];
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO chat_memory (chat_id, summary_text, summary_json, last_summarized_message_id, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(chat_id) DO UPDATE SET
         summary_text = excluded.summary_text,
         summary_json = excluded.summary_json,
         last_summarized_message_id = excluded.last_summarized_message_id,
         updated_at = excluded.updated_at`,
      [
        chatId,
        workingSummary.summary_text,
        stringifyChatMemoryJson(workingSummary),
        lastProcessed.id,
        now,
      ],
    );

    console.info('[chat-memory] summary update completed', {
      chatId,
      processedChunks: chunks.length,
      lastSummarizedMessageId: lastProcessed.id,
    });
  } catch (error) {
    if (error instanceof AiProviderError && error.status != null) {
      const isTransient = [429, 502, 503].includes(error.status);
      console.warn('[chat-memory] summary update failed', {
        chatId,
        status: error.status,
        transient: isTransient,
        provider: error.provider,
      });
      return;
    }

    if (error instanceof SyntaxError) {
      console.warn('[chat-memory] summary update failed: invalid JSON output', { chatId });
      return;
    }

    console.warn('[chat-memory] summary update failed', {
      chatId,
      error: error instanceof Error ? error.message : 'unknown-error',
    });
  }
}

export function estimateMessageTokenCount(content: string): number {
  return estimateTokens(content);
}

import {
  ChatMemoryJsonSchema,
  createEmptyChatMemoryJson,
  mapChatMemoryRowToChatMemory,
  stringifyChatMemoryJson,
  type ChatMemory,
  type ChatMemoryJson,
  type ChatMemoryRow,
  type ChatMessage,
} from '@/features/chat/model';
import {
  RECENT_CONTEXT_MESSAGES,
  SUMMARY_CHUNK_MESSAGES,
  SUMMARY_TRIGGER_MESSAGES,
  SUMMARY_TRIGGER_TOKENS,
} from '@/features/chat/lib/constants';
import { createUserChatCipher } from '@/shared/lib/security/chatEncryption';
import { chatService } from '@/shared/lib/ai/chat.service';
import { AI } from '@/shared/lib/ai/config';
import { AiProviderError } from '@/shared/lib/ai/errors';
import { getMessageContent } from '@/shared/lib/ai/messageContent';
import { execute, queryAll, queryOne } from '@/shared/lib/db/client';
import { buildChatMemorySummaryPrompt } from './prompts/chatMemorySummaryPrompt';
import { getUserGuardrailContext } from '@/features/user/server/chatModels.service';
import {
  checkGuardrails,
  estimateTokensFromMessages,
  recordGuardrailUsage,
} from '@/shared/lib/guardrails/service';

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

async function decryptMessageRows(
  rows: MessageRow[],
  userId: string,
  chatId: string,
): Promise<MessageRow[]> {
  const cipher = await createUserChatCipher(userId);
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      content: await cipher.decrypt(row.content, 'message_content', chatId),
    })),
  );
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

async function assertChatOwnedByUser(chatId: string, userId: string): Promise<boolean> {
  const row = await queryOne<{ id: string }>('SELECT id FROM chats WHERE id = ? AND user_id = ?', [
    chatId,
    userId,
  ]);

  return row != null;
}

async function getRecentMessages(
  chatId: string,
  userId: string,
  limit: number,
): Promise<ChatMessage[]> {
  const rows = await queryAll<MessageRow>(
    `SELECT id, role, content, created_at
     FROM messages
     WHERE chat_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    [chatId, limit],
  );

  const decryptedRows = await decryptMessageRows(rows, userId, chatId);
  return decryptedRows.reverse().map(rowToChatMessage);
}

async function getMemoryFromBackfill(chatId: string, userId: string): Promise<ChatMemory | null> {
  const existing = await queryOne<ChatMemoryRow>(
    'SELECT chat_id, summary_text, summary_json, last_summarized_message_id, updated_at FROM chat_memory WHERE chat_id = ?',
    [chatId],
  );

  if (existing) {
    return mapChatMemoryRowToChatMemory(existing, userId);
  }

  const legacySummary = await queryOne<ChatSummaryRow>(
    'SELECT chat_id, content, last_covered_message_id FROM chat_summaries WHERE chat_id = ?',
    [chatId],
  );

  if (!legacySummary) {
    return null;
  }

  const cipher = await createUserChatCipher(userId);
  const now = new Date().toISOString();
  const summaryText = await cipher.decrypt(
    legacySummary.content,
    'chat_memory_summary_text',
    chatId,
  );
  const summaryJson = {
    ...createEmptyChatMemoryJson(),
    summary_text: summaryText,
  };
  const encryptedSummaryText = await cipher.encrypt(
    summaryText,
    'chat_memory_summary_text',
    chatId,
  );
  const encryptedSummaryJson = await cipher.encrypt(
    stringifyChatMemoryJson(summaryJson),
    'chat_memory_summary_json',
    chatId,
  );

  await execute(
    `INSERT OR IGNORE INTO chat_memory
      (chat_id, summary_text, summary_json, last_summarized_message_id, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [
      chatId,
      encryptedSummaryText,
      encryptedSummaryJson,
      legacySummary.last_covered_message_id,
      now,
    ],
  );

  const inserted = await queryOne<ChatMemoryRow>(
    'SELECT chat_id, summary_text, summary_json, last_summarized_message_id, updated_at FROM chat_memory WHERE chat_id = ?',
    [chatId],
  );

  return inserted ? mapChatMemoryRowToChatMemory(inserted, userId) : null;
}

async function listUnsummarizedMessages(
  chatId: string,
  lastSummarizedMessageId: string | null,
  userId: string,
): Promise<MessageRow[]> {
  if (!lastSummarizedMessageId) {
    const rows = await queryAll<MessageRow>(
      `SELECT id, role, content, created_at, token_count
       FROM messages
       WHERE chat_id = ?
       ORDER BY created_at ASC, id ASC`,
      [chatId],
    );
    return decryptMessageRows(rows, userId, chatId);
  }

  const cursor = await queryOne<MessageCursorRow>(
    'SELECT id, created_at FROM messages WHERE chat_id = ? AND id = ?',
    [chatId, lastSummarizedMessageId],
  );

  if (!cursor) {
    const rows = await queryAll<MessageRow>(
      `SELECT id, role, content, created_at, token_count
       FROM messages
       WHERE chat_id = ?
       ORDER BY created_at ASC, id ASC`,
      [chatId],
    );
    return decryptMessageRows(rows, userId, chatId);
  }

  const rows = await queryAll<MessageRow>(
    `SELECT id, role, content, created_at, token_count
     FROM messages
     WHERE chat_id = ?
       AND (created_at > ? OR (created_at = ? AND id > ?))
     ORDER BY created_at ASC, id ASC`,
    [chatId, cursor.created_at, cursor.created_at, cursor.id],
  );
  return decryptMessageRows(rows, userId, chatId);
}

async function summarizeDeltaChunk(
  userId: string,
  tier: 'free' | 'pro',
  previousSummary: ChatMemoryJson,
  deltaMessages: ChatMessage[],
): Promise<ChatMemoryJson> {
  const prompt = buildChatMemorySummaryPrompt(previousSummary, deltaMessages);
  const estimatedPromptTokens = estimateTokensFromMessages(prompt);
  const promptCharCount = prompt.reduce((sum, message) => sum + message.content.length, 0);
  const guardrail = await checkGuardrails({
    userId,
    tier,
    operation: 'summary',
    model: AI.summaryModel,
    estimatedPromptTokens,
    promptCharCount,
    promptMessageCount: prompt.length,
    requestedMaxTokens: 1000,
  });

  if (!guardrail.allowed) {
    throw new AiProviderError(guardrail.denial.message, guardrail.denial.status, 'guardrails');
  }

  const response = await chatService.complete({
    model: AI.summaryModel,
    temperature: 0,
    maxTokens: 1000,
    messages: prompt,
  });

  const content = getMessageContent(response.choices?.[0]?.message);
  if (!content || content.trim().length < 2) {
    throw new Error('Summary model returned empty payload');
  }

  await recordGuardrailUsage({
    userId,
    tier,
    operation: 'summary',
    model: AI.summaryModel,
    promptTokens: response.usage?.prompt_tokens ?? estimatedPromptTokens,
    completionTokens: response.usage?.completion_tokens ?? estimateTokens(content),
    outcome: 'success',
  });

  const parsed = JSON.parse(extractJsonCandidate(content));
  return ChatMemoryJsonSchema.parse(parsed);
}

export async function buildChatContext(
  chatId: string,
  userId: string,
  currentUserMessage?: string,
): Promise<ChatMessage[] | null> {
  const owned = await assertChatOwnedByUser(chatId, userId);
  if (!owned) {
    return null;
  }

  const [memory, recentMessages] = await Promise.all([
    getMemoryFromBackfill(chatId, userId),
    getRecentMessages(chatId, userId, RECENT_CONTEXT_MESSAGES),
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

export async function maybeUpdateChatMemory(chatId: string, userId: string): Promise<void> {
  const owned = await assertChatOwnedByUser(chatId, userId);
  if (!owned) {
    return;
  }

  const guardrailContext = await getUserGuardrailContext(userId);
  if (!guardrailContext) {
    return;
  }

  const memory = await getMemoryFromBackfill(chatId, userId);
  const unsummarized = await listUnsummarizedMessages(
    chatId,
    memory?.lastSummarizedMessageId ?? null,
    userId,
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
      workingSummary = await summarizeDeltaChunk(
        userId,
        guardrailContext.tier,
        workingSummary,
        chunkMessagesForPrompt,
      );
    }

    const lastProcessed = unsummarized[unsummarized.length - 1];
    const now = new Date().toISOString();
    const cipher = await createUserChatCipher(userId);
    const encryptedSummaryText = await cipher.encrypt(
      workingSummary.summary_text,
      'chat_memory_summary_text',
      chatId,
    );
    const encryptedSummaryJson = await cipher.encrypt(
      stringifyChatMemoryJson(workingSummary),
      'chat_memory_summary_json',
      chatId,
    );

    await execute(
      `INSERT INTO chat_memory (chat_id, summary_text, summary_json, last_summarized_message_id, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(chat_id) DO UPDATE SET
         summary_text = excluded.summary_text,
         summary_json = excluded.summary_json,
         last_summarized_message_id = excluded.last_summarized_message_id,
         updated_at = excluded.updated_at`,
      [chatId, encryptedSummaryText, encryptedSummaryJson, lastProcessed.id, now],
    );

    console.info('[chat-memory] summary update completed', {
      chatId,
      processedChunks: chunks.length,
      lastSummarizedMessageId: lastProcessed.id,
    });
  } catch (error) {
    if (error instanceof AiProviderError && error.status != null) {
      if (error.provider === 'guardrails') {
        console.info('[chat-memory] summary update skipped by guardrails', {
          chatId,
          status: error.status,
        });
        return;
      }

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

import type { ChatMemoryJson, ChatMessage } from '@/entities/chat';
import type { AiMessage } from '@/shared/lib/ai/types';

function clampText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return value.slice(0, maxLength) + '...';
}

function formatDeltaMessages(deltaMessages: ChatMessage[]): string {
  return deltaMessages
    .map((message) => {
      const createdAt = message.createdAt ?? 'unknown-time';
      const content = clampText(message.content.replace(/\s+/g, ' ').trim(), 1500);
      return '[' + createdAt + '] ' + message.role + ': ' + content;
    })
    .join('\n');
}

export function buildChatMemorySummaryPrompt(
  previousSummary: ChatMemoryJson,
  deltaMessages: ChatMessage[],
): AiMessage[] {
  const systemPrompt = [
    'You maintain compact working memory for a long-running chat.',
    'You receive the existing memory and only new messages (delta).',
    'Update memory for future responses.',
    '',
    'Keep only durable and useful information:',
    '- user preferences',
    '- important facts',
    '- decisions and constraints',
    '- unresolved questions',
    '- active goals/tasks',
    '',
    'Remove noise:',
    '- greetings and filler',
    '- repetitive confirmations',
    '- temporary wording and irrelevant chatter',
    '',
    'Rules:',
    '- Deduplicate aggressively.',
    '- Keep entries short and specific.',
    '- Return strict JSON only.',
    '- Do not include markdown fences.',
  ].join('\n');

  const userPrompt = [
    'PREVIOUS_MEMORY_JSON:',
    JSON.stringify(previousSummary),
    '',
    'DELTA_MESSAGES:',
    formatDeltaMessages(deltaMessages),
    '',
    'Return updated JSON with exactly these keys and value types:',
    '{',
    '  "user_preferences": string[],',
    '  "facts": string[],',
    '  "decisions": string[],',
    '  "open_questions": string[],',
    '  "active_goals": string[],',
    '  "summary_text": string',
    '}',
  ].join('\n');

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

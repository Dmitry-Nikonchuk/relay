import { z } from 'zod';

const MemoryStringListSchema = z.array(z.string().min(1)).default([]);

export const ChatMemoryJsonSchema = z
  .object({
    user_preferences: MemoryStringListSchema,
    facts: MemoryStringListSchema,
    decisions: MemoryStringListSchema,
    open_questions: MemoryStringListSchema,
    active_goals: MemoryStringListSchema,
    summary_text: z.string().default(''),
  })
  .strict();

export type ChatMemoryJson = z.infer<typeof ChatMemoryJsonSchema>;

export type ChatMemory = {
  chatId: string;
  summaryText: string | null;
  summaryJson: ChatMemoryJson | null;
  lastSummarizedMessageId: string | null;
  updatedAt: string;
};

export function createEmptyChatMemoryJson(): ChatMemoryJson {
  return {
    user_preferences: [],
    facts: [],
    decisions: [],
    open_questions: [],
    active_goals: [],
    summary_text: '',
  };
}

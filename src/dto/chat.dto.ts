import { z } from 'zod';

export const AiRoleSchema = z.enum(['system', 'user', 'assistant']);

export const ChatMessageDtoSchema = z.object({
  role: AiRoleSchema,
  content: z.string().min(1),
});

export const ChatCompleteRequestDtoSchema = z.object({
  messages: z.array(ChatMessageDtoSchema).min(1),
  model: z.string().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
});

export type ChatCompleteRequestDto = z.infer<typeof ChatCompleteRequestDtoSchema>;

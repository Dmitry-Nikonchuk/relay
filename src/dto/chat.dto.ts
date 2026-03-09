import { z } from 'zod';
import { AiChatResponse } from '@/lib/ai/types';

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

export const ChatCompleteResponseDtoSchema = z.object({
  content: z.string(),
  raw: z.custom<AiChatResponse>().optional(),
});

export const GenerateTitleRequestDtoSchema = z.object({
  messageText: z.string().min(1),
});

export const GenerateTitleResponseDtoSchema = z.object({
  chatTitle: z.string().min(1),
});

export type ChatCompleteRequestDto = z.infer<typeof ChatCompleteRequestDtoSchema>;
export type ChatCompleteResponseDto = z.infer<typeof ChatCompleteResponseDtoSchema>;
export type GenerateTitleRequestDto = z.infer<typeof GenerateTitleRequestDtoSchema>;
export type GenerateTitleResponseDto = z.infer<typeof GenerateTitleResponseDtoSchema>;

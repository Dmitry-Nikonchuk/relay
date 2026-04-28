import { z } from 'zod';
import { AiChatResponse } from '@/shared/lib/ai/types';

export const AiRoleSchema = z.enum(['system', 'user', 'assistant']);

export const ChatMessageDtoSchema = z.object({
  role: AiRoleSchema,
  content: z.string().min(1),
});

export const ChatHistoryMessageDtoSchema = z.object({
  id: z.string().min(1),
  role: AiRoleSchema,
  content: z.string(),
  createdAt: z.string().min(1),
});

export const ChatFailedReplyDtoSchema = z.object({
  userMessageId: z.string().min(1),
  userText: z.string().min(1),
  errorMessage: z.string().min(1),
  canRetry: z.boolean(),
  failedAt: z.string().min(1),
});

export const ChatHistoryPageResponseDtoSchema = z.object({
  messages: z.array(ChatHistoryMessageDtoSchema),
  hasMore: z.boolean(),
  failedReply: ChatFailedReplyDtoSchema.nullable().optional(),
});

export const ChatCompleteRequestDtoSchema = z
  .object({
    chatId: z.string().min(1).optional(),
    userMessageId: z.string().min(1).optional(),
    requestId: z.string().min(1).optional(),
    messages: z.array(ChatMessageDtoSchema).optional(),
    model: z.string().min(1).optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(),
  })
  .refine(
    (d) =>
      (d.chatId != null && d.chatId.length > 0) || (d.messages != null && d.messages.length >= 1),
    { message: 'Provide chatId or at least one message', path: ['messages'] },
  );

export const ChatCompleteResponseDtoSchema = z.object({
  content: z.string(),
  raw: z.custom<AiChatResponse>().optional(),
});

export const GenerateTitleRequestDtoSchema = z.object({
  userMessage: z.string().min(1),
  model: z.string().min(1).optional(),
});

export const GenerateTitleResponseDtoSchema = z.object({
  chatTitle: z.string().min(1),
});

export const ChatCreateRequestDtoSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .transform((value) => value.replace(/\s+/g, ' ')),
  requestId: z.string().min(1).optional(),
});

export const ChatCreateResponseDtoSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  createdAt: z.iso.date(),
});

export const ChatUpdateTitleRequestDtoSchema = z.object({
  title: z.string().min(1),
});

export const ChatAppendMessageRequestDtoSchema = z.object({
  chatId: z.string().min(1),
  role: AiRoleSchema,
  content: z.string().min(1),
  requestId: z.string().min(1).optional(),
});

export const ChatRenameRequestDtoSchema = z.object({
  title: z.string().min(1),
});

export type ChatCompleteRequestDto = z.infer<typeof ChatCompleteRequestDtoSchema>;
export type ChatHistoryPageResponseDto = z.infer<typeof ChatHistoryPageResponseDtoSchema>;
export type ChatFailedReplyDto = z.infer<typeof ChatFailedReplyDtoSchema>;
export type ChatCompleteResponseDto = z.infer<typeof ChatCompleteResponseDtoSchema>;
export type GenerateTitleRequestDto = z.infer<typeof GenerateTitleRequestDtoSchema>;
export type GenerateTitleResponseDto = z.infer<typeof GenerateTitleResponseDtoSchema>;
export type ChatCreateRequestDto = z.infer<typeof ChatCreateRequestDtoSchema>;
export type ChatCreateResponseDto = z.infer<typeof ChatCreateResponseDtoSchema>;
export type ChatUpdateTitleRequestDto = z.infer<typeof ChatUpdateTitleRequestDtoSchema>;
export type ChatAppendMessageRequestDto = z.infer<typeof ChatAppendMessageRequestDtoSchema>;
export type ChatRenameRequestDto = z.infer<typeof ChatRenameRequestDtoSchema>;

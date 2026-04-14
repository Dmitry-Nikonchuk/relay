import { httpClient } from '@/shared/lib/http/client';
import {
  ChatFailedReplyDto,
  mapChatMessagesToCompleteRequestDto,
  mapChatCompleteResponseDtoToChatMessage,
  mapChatToCreateRequestDto,
  mapChatCreateResponseDtoToChat,
  mapChatListRowToChat,
  ChatMessage,
  Chat,
  ChatListRow,
  ChatCompleteResponseDto,
  ChatCreateResponseDto,
  ChatHistoryPageResponseDto,
  GenerateTitleResponseDto,
} from '@/entities/chat';
import type { UserChatModelsResponseDto } from '@/features/user/model/userChatModels.types';

export const chatApi = {
  async fetchUserChatModels(): Promise<UserChatModelsResponseDto> {
    return httpClient.get<UserChatModelsResponseDto>('/api/user/chat-models');
  },

  async patchUserChatModel(model: string): Promise<UserChatModelsResponseDto> {
    return httpClient.patch<UserChatModelsResponseDto>('/api/user/chat-models', {
      body: JSON.stringify({ model }),
    });
  },

  async fetchChats(): Promise<Chat[]> {
    const rows = await httpClient.get<ChatListRow[]>('/api/chat');
    return rows.map(mapChatListRowToChat);
  },

  async sendMessages(messages: ChatMessage[]) {
    const dto = mapChatMessagesToCompleteRequestDto(messages);
    const response = await httpClient.post<ChatCompleteResponseDto>('/api/chat/send', {
      body: JSON.stringify(dto),
    });

    return mapChatCompleteResponseDtoToChatMessage(response);
  },

  async streamMessages(
    chatId: string,
    userMessageId: string,
    onDelta: (chunk: string) => void,
    opts?: { model?: string; requestId?: string },
  ): Promise<string> {
    const res = await httpClient.stream('/api/chat/stream', {
      method: 'POST',
      body: JSON.stringify({
        chatId,
        userMessageId,
        model: opts?.model,
        requestId: opts?.requestId,
      }),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    let fullText = '';
    let buffer = '';

    // Parse OpenAI-style SSE: "data: {...}\n\n", ending with "data: [DONE]"
    // We only care about text deltas.
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const segments = buffer.split('\n\n');
      buffer = segments.pop() ?? '';

      for (const segment of segments) {
        const line = segment
          .split('\n')
          .map((l) => l.trim())
          .find((l) => l.startsWith('data:'));

        if (!line) continue;

        const data = line.replace(/^data:\s*/, '');
        if (data === '[DONE]') {
          // End of stream
          await reader.cancel().catch(() => undefined);
          return fullText;
        }

        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta ?? {};

          let chunkText = '';

          if (typeof delta.content === 'string') {
            chunkText = delta.content;
          } else if (Array.isArray(delta.content)) {
            chunkText = delta.content
              .map((part: { text?: string; content?: string }) => part.text ?? part.content ?? '')
              .join('');
          }

          if (!chunkText) continue;

          fullText += chunkText;
          onDelta(chunkText);
        } catch {
          // Ignore malformed JSON chunks
          continue;
        }
      }
    }

    return fullText;
  },

  async generateChatTitle(userMessage: string, assistantMessage: string) {
    const response = await httpClient.post<GenerateTitleResponseDto>('/api/chat/generateTitle', {
      body: JSON.stringify({ userMessage, assistantMessage }),
    });

    return response.chatTitle;
  },

  async createChat(chat: Omit<Chat, 'id' | 'createdAt'>, opts?: { requestId?: string }) {
    const dto = mapChatToCreateRequestDto(chat);
    const response = await httpClient.post<ChatCreateResponseDto>('/api/chat', {
      body: JSON.stringify({ ...dto, requestId: opts?.requestId }),
    });

    return mapChatCreateResponseDtoToChat(response);
  },

  async fetchMessagesPage(
    chatId: string,
    opts: { limit: number; before?: { createdAt: string; id: string } },
  ): Promise<ChatHistoryPageResponseDto & { failedReply?: ChatFailedReplyDto | null }> {
    const qs = new URLSearchParams({ chatId, limit: String(opts.limit) });
    if (opts.before) {
      qs.set('beforeCreatedAt', opts.before.createdAt);
      qs.set('beforeId', opts.before.id);
    }
    return httpClient.get<ChatHistoryPageResponseDto>(`/api/chat/history?${qs.toString()}`);
  },

  async appendMessage(
    chatId: string,
    role: ChatMessage['role'],
    content: string,
    opts?: { requestId?: string },
  ) {
    return httpClient.post<{ id: string }>('/api/chat/history', {
      body: JSON.stringify({ chatId, role, content, requestId: opts?.requestId }),
    });
  },

  async updateChatTitle(chatId: string, title: string) {
    return httpClient.patch<{ id: string; title: string; updatedAt: string }>(
      `/api/chat/${encodeURIComponent(chatId)}`,
      {
        body: JSON.stringify({ title }),
      },
    );
  },

  async deleteChat(chatId: string) {
    return httpClient.delete<{ id: string }>(`/api/chat/${encodeURIComponent(chatId)}`);
  },
};

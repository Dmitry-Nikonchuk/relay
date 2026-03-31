import { httpClient } from '@/shared/lib/http/client';
import {
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
  GenerateTitleResponseDto,
} from '@/entities/chat';

export const chatApi = {
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

  async streamMessages(messages: ChatMessage[], onDelta: (chunk: string) => void): Promise<string> {
    const dto = mapChatMessagesToCompleteRequestDto(messages);

    const res = await httpClient.stream('/api/chat/stream', {
      method: 'POST',
      body: JSON.stringify(dto),
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

  async createChat(chat: Omit<Chat, 'id' | 'createdAt'>) {
    const dto = mapChatToCreateRequestDto(chat);
    const response = await httpClient.post<ChatCreateResponseDto>('/api/chat', {
      body: JSON.stringify(dto),
    });

    return mapChatCreateResponseDtoToChat(response);
  },

  async fetchMessages(chatId: string): Promise<ChatMessage[]> {
    const qs = new URLSearchParams({ chatId });
    return httpClient.get<ChatMessage[]>(`/api/chat/history?${qs.toString()}`);
  },

  async appendMessage(chatId: string, role: ChatMessage['role'], content: string) {
    return httpClient.post<{ id: string }>('/api/chat/history', {
      body: JSON.stringify({ chatId, role, content }),
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

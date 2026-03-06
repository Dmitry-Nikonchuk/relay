'use client';

import { httpClient } from '@/lib/http/client';
import {
  mapChatMessagesToCompleteRequestDto,
  mapChatCompleteResponseDtoToChatMessage,
} from '@/domain/chat/chat.mapper';
import { ChatCompleteResponseDto } from '@/dto/chat.dto';
import { ChatMessage } from '@/domain/chat/chat.types';

export const chatApi = {
  async sendMessages(messages: ChatMessage[]) {
    const dto = mapChatMessagesToCompleteRequestDto(messages);
    const response = await httpClient.post<ChatCompleteResponseDto>('/api/chat', {
      body: JSON.stringify(dto),
    });

    return mapChatCompleteResponseDtoToChatMessage(response);
  },
};

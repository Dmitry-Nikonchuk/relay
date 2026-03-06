import { ChatMessage } from './chat.types';
import { ChatCompleteRequestDto, ChatCompleteResponseDto } from '@/dto/chat.dto';

export const mapChatMessagesToCompleteRequestDto = (
  messages: ChatMessage[],
): ChatCompleteRequestDto => {
  return {
    messages: messages.map((message) => {
      return {
        role: message.role,
        content: message.content,
      };
    }),
  };
};

export const mapChatCompleteResponseDtoToChatMessage = (
  dto: ChatCompleteResponseDto,
): ChatMessage => {
  return {
    role: dto.raw?.choices?.[0]?.message?.role ?? 'assistant',
    content: dto.content,
  };
};

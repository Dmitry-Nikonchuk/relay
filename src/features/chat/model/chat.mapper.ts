import { ChatMessage, Chat } from './chat.types';
import {
  ChatCompleteRequestDto,
  ChatCompleteResponseDto,
  ChatCreateRequestDto,
  ChatCreateResponseDto,
} from './chat.dto';

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

export const mapChatToCreateRequestDto = (
  chat: Omit<Chat, 'id' | 'createdAt'> & { requestId?: string },
): ChatCreateRequestDto => {
  return {
    title: chat.title,
    requestId: chat.requestId,
  };
};

export const mapChatCreateResponseDtoToChat = (dto: ChatCreateResponseDto): Chat => {
  return {
    id: dto.id,
    title: dto.title,
    createdAt: dto.createdAt,
  };
};

/** Строка из D1 (`SELECT * FROM chats`) — snake_case. */
export type ChatListRow = {
  id: string;
  title: string;
  created_at: string;
};

export const mapChatListRowToChat = (row: ChatListRow): Chat => {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
  };
};

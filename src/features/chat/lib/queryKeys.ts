export const chatQueryKeys = {
  chats: ['chats'] as const,
  chatMessages: (chatId: string) => ['chatMessages', chatId] as const,
  userChatModels: ['userChatModels'] as const,
};

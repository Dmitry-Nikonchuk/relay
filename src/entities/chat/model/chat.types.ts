export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type Chat = {
  id: string;
  title: string;
  createdAt: string;
};

export type ChatHistory = {
  id: string;
  chatId: string;
  messages: ChatMessage[];
};

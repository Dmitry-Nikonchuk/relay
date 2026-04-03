export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
  /** Present for persisted messages loaded from API / DB. */
  id?: string;
  createdAt?: string;
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

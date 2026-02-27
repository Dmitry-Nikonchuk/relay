export type AiRole = 'system' | 'user' | 'assistant';

export type AiMessage = {
  role: AiRole;
  content: string;
};

export type AiChatRequest = {
  messages: AiMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
};

export type AiChatChoice = {
  message: { role: 'assistant'; content: string };
};

export type AiChatResponse = {
  id?: string;
  model?: string;
  choices: AiChatChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

export type AiStreamChunk =
  | { type: 'delta'; delta: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

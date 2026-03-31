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

/** Message shape from provider; may include reasoning (e.g. OpenRouter) */
export type AiAssistantMessage = {
  role: 'assistant';
  content?: string | null;
  reasoning?: string | null;
  reasoning_details?: unknown;
};

export type AiChatChoice = {
  message: AiAssistantMessage;
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

import type { ChatModelDefinition } from '@/shared/config/chatModelCatalog';

export type GuardrailOperation = 'chat' | 'title' | 'summary';
export type GuardrailUsageScope = 'user_visible' | 'system';
export type GuardrailTier = 'free' | 'pro';

export type GuardrailDenialCode =
  | 'MODEL_NOT_ALLOWED'
  | 'MESSAGE_TOO_LARGE'
  | 'PROMPT_TOO_LARGE'
  | 'TOO_MANY_MESSAGES'
  | 'MAX_TOKENS_TOO_HIGH'
  | 'RATE_LIMITED'
  | 'DAILY_QUOTA_EXCEEDED';

export type GuardrailOperationPolicy = {
  maxPromptChars: number;
  maxPromptMessages: number;
  maxRequestedTokens: number;
  defaultReservedCompletionTokens: number;
  rateLimitWindowSeconds: number;
  rateLimitMaxRequests: number;
};

export type GuardrailTierPolicy = {
  allowedModels: ChatModelDefinition[];
  maxUserMessageChars: number;
  dailyUserVisibleTokens: number;
  dailySystemTokens: number;
  operations: Record<GuardrailOperation, GuardrailOperationPolicy>;
};

export type GuardrailCheckInput = {
  userId: string;
  tier: GuardrailTier;
  operation: GuardrailOperation;
  model?: string;
  allowedModelIds?: string[];
  estimatedPromptTokens: number;
  promptCharCount: number;
  promptMessageCount: number;
  latestUserMessageChars?: number;
  requestedMaxTokens?: number;
};

export type GuardrailDenial = {
  status: 403 | 429;
  code: GuardrailDenialCode;
  message: string;
  resetAt?: string;
  retryAfterSeconds?: number;
};

export type GuardrailCheckResult =
  | {
      allowed: true;
      scope: GuardrailUsageScope;
      reservedCompletionTokens: number;
    }
  | {
      allowed: false;
      scope: GuardrailUsageScope;
      denial: GuardrailDenial;
    };

export type GuardrailUsageRecord = {
  userId: string;
  tier: GuardrailTier;
  operation: GuardrailOperation;
  model?: string;
  promptTokens: number;
  completionTokens: number;
  outcome: 'success' | 'error' | 'skipped';
};

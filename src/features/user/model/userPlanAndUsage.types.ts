import type {
  ChatSubscriptionTier,
  GuardrailOperationPolicyDefinition,
} from '@/shared/config/chatModelCatalog';

export type UserPlanUsageScopeDto = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  remainingTokens: number;
};

export type UserPlanGuardrailsDto = {
  maxUserMessageChars: number;
  dailyUserVisibleTokens: number;
  dailySystemTokens: number;
  operations: {
    chat: GuardrailOperationPolicyDefinition;
    title: GuardrailOperationPolicyDefinition;
    summary: GuardrailOperationPolicyDefinition;
  };
};

export type UserPlanAndUsageResponseDto = {
  tier: ChatSubscriptionTier;
  deploymentDefault: string;
  selectedModel: string | null;
  availableModels: { id: string; label: string }[];
  guardrails: UserPlanGuardrailsDto;
  usageToday: {
    date: string;
    resetAt: string;
    userVisible: UserPlanUsageScopeDto;
    system: UserPlanUsageScopeDto;
  };
};

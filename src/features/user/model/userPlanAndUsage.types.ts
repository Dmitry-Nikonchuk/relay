import type {
  ChatSubscriptionTier,
  GuardrailOperationPolicyDefinition,
} from '@/shared/config/chatModelCatalog';

export type UserPlanUsageScopeDto = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  remainingTokens: number | null;
};

export type UserPlanGuardrailsDto = {
  maxUserMessageChars: number;
  dailyUserVisibleTokens: number | null;
  dailySystemTokens: number | null;
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

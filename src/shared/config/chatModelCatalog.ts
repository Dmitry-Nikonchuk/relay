/**
 * Server-side catalog of OpenRouter models. Filtered by subscription tier in
 * {@link getAvailableChatModelsForUser}.
 */
export type ChatModelDefinition = {
  id: string;
  label: string;
  /** If set, model is only listed for this tier and above (future use). */
  minTier?: 'free' | 'pro';
};

export type ChatSubscriptionTier = 'free' | 'pro';

export type GuardrailOperationPolicyDefinition = {
  maxPromptChars: number;
  maxPromptMessages: number;
  maxRequestedTokens: number;
  defaultReservedCompletionTokens: number;
  rateLimitWindowSeconds: number;
  rateLimitMaxRequests: number;
};

export type GuardrailTierPolicyDefinition = {
  maxUserMessageChars: number;
  dailyUserVisibleTokens: number | null;
  dailySystemTokens: number | null;
  operations: {
    chat: GuardrailOperationPolicyDefinition;
    title: GuardrailOperationPolicyDefinition;
    summary: GuardrailOperationPolicyDefinition;
  };
};

const FALLBACK_DEPLOYMENT_MODEL = 'liquid/lfm-2.5-1.2b-thinking:free';

export const CHAT_MODEL_CATALOG: ChatModelDefinition[] = [
  {
    id: 'liquid/lfm-2.5-1.2b-thinking:free',
    label: 'Liquid LFM 2.5 1.2B (thinking, free)',
    minTier: 'free',
  },
  {
    id: 'nvidia/nemotron-3-super-120b-a12b:free',
    label: 'NVIDIA: Nemotron 3 Super (free)',
    minTier: 'free',
  },
  {
    id: 'minimax/minimax-m2.5:free',
    label: 'MiniMax: MiniMax M2.5 (free)',
    minTier: 'free',
  },
  {
    id: 'z-ai/glm-4.5-air:free',
    label: 'Z.ai: GLM 4.5 Air (free)',
    minTier: 'free',
  },
  {
    id: 'openai/gpt-oss-20b:free',
    label: 'OpenAI: gpt-oss-20b (free)',
    minTier: 'free',
  },
];

const FREE_GUARDRAIL_POLICY: GuardrailTierPolicyDefinition = {
  maxUserMessageChars: 8_000,
  dailyUserVisibleTokens: null,
  dailySystemTokens: null,
  operations: {
    chat: {
      maxPromptChars: 24_000,
      maxPromptMessages: 48,
      maxRequestedTokens: 4_096,
      defaultReservedCompletionTokens: 2_048,
      rateLimitWindowSeconds: 60,
      rateLimitMaxRequests: 10,
    },
    title: {
      maxPromptChars: 6_000,
      maxPromptMessages: 4,
      maxRequestedTokens: 64,
      defaultReservedCompletionTokens: 24,
      rateLimitWindowSeconds: 300,
      rateLimitMaxRequests: 20,
    },
    summary: {
      maxPromptChars: 18_000,
      maxPromptMessages: 24,
      maxRequestedTokens: 1_000,
      defaultReservedCompletionTokens: 600,
      rateLimitWindowSeconds: 300,
      rateLimitMaxRequests: 8,
    },
  },
};

const PRO_GUARDRAIL_POLICY: GuardrailTierPolicyDefinition = {
  maxUserMessageChars: 20_000,
  dailyUserVisibleTokens: 500_000,
  dailySystemTokens: 40_000,
  operations: {
    chat: {
      maxPromptChars: 60_000,
      maxPromptMessages: 80,
      maxRequestedTokens: 8_192,
      defaultReservedCompletionTokens: 4_096,
      rateLimitWindowSeconds: 60,
      rateLimitMaxRequests: 30,
    },
    title: {
      maxPromptChars: 8_000,
      maxPromptMessages: 4,
      maxRequestedTokens: 64,
      defaultReservedCompletionTokens: 24,
      rateLimitWindowSeconds: 300,
      rateLimitMaxRequests: 40,
    },
    summary: {
      maxPromptChars: 30_000,
      maxPromptMessages: 32,
      maxRequestedTokens: 1_500,
      defaultReservedCompletionTokens: 800,
      rateLimitWindowSeconds: 300,
      rateLimitMaxRequests: 20,
    },
  },
};

export function getDeploymentDefaultModelId(): string {
  return process.env.OPENROUTER_MODEL?.trim() || FALLBACK_DEPLOYMENT_MODEL;
}

export function normalizeSubscriptionTier(tier: string | undefined | null): ChatSubscriptionTier {
  return tier === 'pro' ? 'pro' : 'free';
}

export function getGuardrailTierPolicy(
  tier: string | undefined | null,
): GuardrailTierPolicyDefinition {
  return normalizeSubscriptionTier(tier) === 'pro' ? PRO_GUARDRAIL_POLICY : FREE_GUARDRAIL_POLICY;
}

/** Include deployment default in the list if missing (custom OPENROUTER_MODEL). */
export function withDeploymentDefaultIfMissing(
  models: ChatModelDefinition[],
  deploymentId: string,
): ChatModelDefinition[] {
  if (models.some((m) => m.id === deploymentId)) {
    return models;
  }
  return [
    {
      id: deploymentId,
      label: `${deploymentId} (deployment default)`,
      minTier: 'free',
    },
    ...models,
  ];
}

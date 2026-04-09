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

export function getDeploymentDefaultModelId(): string {
  return process.env.OPENROUTER_MODEL?.trim() || FALLBACK_DEPLOYMENT_MODEL;
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

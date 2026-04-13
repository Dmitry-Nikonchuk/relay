import { execute, queryOne } from '@/shared/lib/db/client';
import {
  CHAT_MODEL_CATALOG,
  normalizeSubscriptionTier,
  type ChatSubscriptionTier,
  type ChatModelDefinition,
  getDeploymentDefaultModelId,
  withDeploymentDefaultIfMissing,
} from '@/shared/config/chatModelCatalog';
import {
  getGuardrailPolicySummary,
  getGuardrailUsageSummary,
} from '@/shared/lib/guardrails/service';
import type { UserPlanAndUsageResponseDto } from '@/features/user/model/userPlanAndUsage.types';

export type UserChatModelRow = {
  preferred_chat_model: string | null;
  subscription_tier: ChatSubscriptionTier | string;
};

function catalogForTier(tier: string): ChatModelDefinition[] {
  if (normalizeSubscriptionTier(tier) === 'pro') {
    return [...CHAT_MODEL_CATALOG];
  }
  return CHAT_MODEL_CATALOG.filter((m) => !m.minTier || m.minTier === 'free');
}

/** Models the user may select and use in chat (server-side source of truth). */
export function getAvailableChatModelsForUser(row: UserChatModelRow | null): {
  id: string;
  label: string;
}[] {
  const tier = normalizeSubscriptionTier(row?.subscription_tier);
  const deploymentId = getDeploymentDefaultModelId();
  let list = catalogForTier(tier);
  list = withDeploymentDefaultIfMissing(list, deploymentId);
  return list.map(({ id, label }) => ({ id, label }));
}

export function getChatModelsApiPayload(row: UserChatModelRow | null) {
  const deploymentDefault = getDeploymentDefaultModelId();
  const availableModels = getAvailableChatModelsForUser(row);
  const allowedIds = new Set(availableModels.map((m) => m.id));

  let selectedModel = row?.preferred_chat_model ?? null;
  if (selectedModel && !allowedIds.has(selectedModel)) {
    selectedModel = null;
  }

  return {
    availableModels,
    selectedModel,
    deploymentDefault,
  };
}

export function getUserPlanAndUsagePayload(
  row: UserChatModelRow,
  usageToday: UserPlanAndUsageResponseDto['usageToday'],
): UserPlanAndUsageResponseDto {
  const tier = normalizeSubscriptionTier(row.subscription_tier);
  const modelsPayload = getChatModelsApiPayload(row);
  const guardrails = getGuardrailPolicySummary(tier);

  return {
    tier,
    deploymentDefault: modelsPayload.deploymentDefault,
    selectedModel: modelsPayload.selectedModel,
    availableModels: modelsPayload.availableModels,
    guardrails: {
      maxUserMessageChars: guardrails.maxUserMessageChars,
      dailyUserVisibleTokens: guardrails.dailyUserVisibleTokens,
      dailySystemTokens: guardrails.dailySystemTokens,
      operations: guardrails.operations,
    },
    usageToday,
  };
}

export async function getUserChatModelRow(userId: string): Promise<UserChatModelRow | null> {
  return queryOne<UserChatModelRow>(
    'SELECT preferred_chat_model, subscription_tier FROM users WHERE id = ?',
    [userId],
  );
}

export async function setUserPreferredChatModel(userId: string, modelId: string): Promise<void> {
  await execute('UPDATE users SET preferred_chat_model = ? WHERE id = ?', [modelId, userId]);
}

export async function getUserGuardrailContext(userId: string): Promise<{
  tier: ChatSubscriptionTier;
  allowedModels: { id: string; label: string }[];
} | null> {
  const row = await getUserChatModelRow(userId);
  if (!row) {
    return null;
  }

  return {
    tier: normalizeSubscriptionTier(row.subscription_tier),
    allowedModels: getAvailableChatModelsForUser(row),
  };
}

export async function getUserPlanAndUsageSummary(
  userId: string,
): Promise<UserPlanAndUsageResponseDto | null> {
  const row = await getUserChatModelRow(userId);
  if (!row) {
    return null;
  }

  const tier = normalizeSubscriptionTier(row.subscription_tier);
  const usageToday = await getGuardrailUsageSummary(userId, tier);

  return getUserPlanAndUsagePayload(row, usageToday);
}

/**
 * Resolves which model id to send to OpenRouter. Validates optional client `requestedModel`
 * against the user's allowed set; otherwise uses preference, then deployment default, then first allowed.
 */
export async function resolveEffectiveChatModel(
  userId: string,
  requestedModel: string | undefined,
): Promise<
  | { model: string; tier: ChatSubscriptionTier; allowedModelIds: string[] }
  | {
      error: string;
      status: number;
      code: string;
    }
> {
  const row = await getUserChatModelRow(userId);
  const available = getAvailableChatModelsForUser(row);
  const allowedIds = new Set(available.map((m) => m.id));
  const deploymentDefault = getDeploymentDefaultModelId();
  const tier = normalizeSubscriptionTier(row?.subscription_tier);

  if (requestedModel != null && requestedModel.length > 0) {
    if (!allowedIds.has(requestedModel)) {
      return {
        error: 'This model is not available for your account.',
        status: 403,
        code: 'MODEL_NOT_ALLOWED',
      };
    }
    return { model: requestedModel, tier, allowedModelIds: [...allowedIds] };
  }

  const pref = row?.preferred_chat_model;
  if (pref && allowedIds.has(pref)) {
    return { model: pref, tier, allowedModelIds: [...allowedIds] };
  }
  if (allowedIds.has(deploymentDefault)) {
    return { model: deploymentDefault, tier, allowedModelIds: [...allowedIds] };
  }
  if (available.length > 0) {
    return { model: available[0].id, tier, allowedModelIds: [...allowedIds] };
  }

  return { model: deploymentDefault, tier, allowedModelIds: [deploymentDefault] };
}

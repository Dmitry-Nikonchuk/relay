import { execute, queryOne } from '@/shared/lib/db/client';
import {
  CHAT_MODEL_CATALOG,
  type ChatModelDefinition,
  getDeploymentDefaultModelId,
  withDeploymentDefaultIfMissing,
} from '@/shared/config/chatModelCatalog';

export type UserChatModelRow = {
  preferred_chat_model: string | null;
  subscription_tier: string;
};

function catalogForTier(tier: string): ChatModelDefinition[] {
  if (tier === 'pro') {
    return [...CHAT_MODEL_CATALOG];
  }
  return CHAT_MODEL_CATALOG.filter((m) => !m.minTier || m.minTier === 'free');
}

/** Models the user may select and use in chat (server-side source of truth). */
export function getAvailableChatModelsForUser(row: UserChatModelRow | null): {
  id: string;
  label: string;
}[] {
  const tier = row?.subscription_tier?.trim() || 'free';
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

export async function getUserChatModelRow(userId: string): Promise<UserChatModelRow | null> {
  return queryOne<UserChatModelRow>(
    'SELECT preferred_chat_model, subscription_tier FROM users WHERE id = ?',
    [userId],
  );
}

export async function setUserPreferredChatModel(userId: string, modelId: string): Promise<void> {
  await execute('UPDATE users SET preferred_chat_model = ? WHERE id = ?', [modelId, userId]);
}

/**
 * Resolves which model id to send to OpenRouter. Validates optional client `requestedModel`
 * against the user's allowed set; otherwise uses preference, then deployment default, then first allowed.
 */
export async function resolveEffectiveChatModel(
  userId: string,
  requestedModel: string | undefined,
): Promise<{ model: string } | { error: string; status: number }> {
  const row = await getUserChatModelRow(userId);
  const available = getAvailableChatModelsForUser(row);
  const allowedIds = new Set(available.map((m) => m.id));
  const deploymentDefault = getDeploymentDefaultModelId();

  if (requestedModel != null && requestedModel.length > 0) {
    if (!allowedIds.has(requestedModel)) {
      return { error: 'Model not allowed for your account', status: 400 };
    }
    return { model: requestedModel };
  }

  const pref = row?.preferred_chat_model;
  if (pref && allowedIds.has(pref)) {
    return { model: pref };
  }
  if (allowedIds.has(deploymentDefault)) {
    return { model: deploymentDefault };
  }
  if (available.length > 0) {
    return { model: available[0].id };
  }

  return { model: deploymentDefault };
}

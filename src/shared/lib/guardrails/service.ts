import {
  CHAT_MODEL_CATALOG,
  getGuardrailTierPolicy,
  normalizeSubscriptionTier,
} from '@/shared/config/chatModelCatalog';
import { ApiError } from '@/shared/lib/api/errors';
import { execute, queryOne } from '@/shared/lib/db/client';
import type {
  GuardrailCheckInput,
  GuardrailCheckResult,
  GuardrailDenial,
  GuardrailOperation,
  GuardrailTier,
  GuardrailUsageRecord,
  GuardrailUsageScope,
} from './types';

type DailyUsageRow = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

type RateLimitRow = {
  request_count: number;
};

function nowIso(): string {
  return new Date().toISOString();
}

function getUtcDateKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function getNextUtcDateIso(now = new Date()): string {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return next.toISOString();
}

export function getCurrentUtcUsageDate(now = new Date()): string {
  return getUtcDateKey(now);
}

export function getCurrentUtcResetAt(now = new Date()): string {
  return getNextUtcDateIso(now);
}

function getBucketStartIso(windowSeconds: number, now = new Date()): string {
  const bucketMs = windowSeconds * 1000;
  const startMs = Math.floor(now.getTime() / bucketMs) * bucketMs;
  return new Date(startMs).toISOString();
}

function getBucketResetIso(windowSeconds: number, now = new Date()): string {
  const bucketMs = windowSeconds * 1000;
  const resetMs = Math.floor(now.getTime() / bucketMs) * bucketMs + bucketMs;
  return new Date(resetMs).toISOString();
}

function secondsUntil(resetAt: string): number {
  const diffMs = Date.parse(resetAt) - Date.now();
  return Math.max(1, Math.ceil(diffMs / 1000));
}

export function estimateTokensFromText(content: string): number {
  if (!content) {
    return 0;
  }
  return Math.max(1, Math.ceil(content.length / 4));
}

export function estimateTokensFromMessages(messages: Array<{ content: string }>): number {
  return messages.reduce((sum, message) => sum + estimateTokensFromText(message.content), 0);
}

export function scopeForOperation(operation: GuardrailOperation): GuardrailUsageScope {
  return operation === 'chat' ? 'user_visible' : 'system';
}

function quotaForScope(tier: GuardrailTier, scope: GuardrailUsageScope): number | null {
  const policy = getGuardrailTierPolicy(tier);
  return scope === 'user_visible' ? policy.dailyUserVisibleTokens : policy.dailySystemTokens;
}

async function getCurrentDailyUsage(
  userId: string,
  usageScope: GuardrailUsageScope,
  usageDate: string,
): Promise<number> {
  const row = await queryOne<DailyUsageRow>(
    `SELECT total_tokens
     FROM user_ai_usage_daily
     WHERE user_id = ? AND usage_date = ? AND usage_scope = ?`,
    [userId, usageDate, usageScope],
  );
  return row?.total_tokens ?? 0;
}

export async function getDailyUsageRow(
  userId: string,
  usageScope: GuardrailUsageScope,
  usageDate = getCurrentUtcUsageDate(),
): Promise<DailyUsageRow> {
  const row = await queryOne<DailyUsageRow>(
    `SELECT prompt_tokens, completion_tokens, total_tokens
     FROM user_ai_usage_daily
     WHERE user_id = ? AND usage_date = ? AND usage_scope = ?`,
    [userId, usageDate, usageScope],
  );

  return {
    prompt_tokens: row?.prompt_tokens ?? 0,
    completion_tokens: row?.completion_tokens ?? 0,
    total_tokens: row?.total_tokens ?? 0,
  };
}

export function getGuardrailPolicySummary(tier: GuardrailTier) {
  const policy = getGuardrailTierPolicy(tier);
  return {
    maxUserMessageChars: policy.maxUserMessageChars,
    dailyUserVisibleTokens: policy.dailyUserVisibleTokens,
    dailySystemTokens: policy.dailySystemTokens,
    operations: policy.operations,
  };
}

export async function getGuardrailUsageSummary(userId: string, tier: GuardrailTier) {
  const usageDate = getCurrentUtcUsageDate();
  const resetAt = getCurrentUtcResetAt();
  const policy = getGuardrailTierPolicy(tier);

  const [userVisible, system] = await Promise.all([
    getDailyUsageRow(userId, 'user_visible', usageDate),
    getDailyUsageRow(userId, 'system', usageDate),
  ]);

  return {
    date: usageDate,
    resetAt,
    userVisible: {
      promptTokens: userVisible.prompt_tokens,
      completionTokens: userVisible.completion_tokens,
      totalTokens: userVisible.total_tokens,
      remainingTokens:
        policy.dailyUserVisibleTokens == null
          ? null
          : Math.max(0, policy.dailyUserVisibleTokens - userVisible.total_tokens),
    },
    system: {
      promptTokens: system.prompt_tokens,
      completionTokens: system.completion_tokens,
      totalTokens: system.total_tokens,
      remainingTokens:
        policy.dailySystemTokens == null
          ? null
          : Math.max(0, policy.dailySystemTokens - system.total_tokens),
    },
  };
}

async function getCurrentRateCount(
  userId: string,
  operation: GuardrailOperation,
  bucketStart: string,
): Promise<number> {
  const row = await queryOne<RateLimitRow>(
    `SELECT request_count
     FROM user_ai_rate_limits
     WHERE user_id = ? AND operation = ? AND bucket_start = ?`,
    [userId, operation, bucketStart],
  );
  return row?.request_count ?? 0;
}

async function incrementRateBucket(
  userId: string,
  operation: GuardrailOperation,
  bucketStart: string,
  estimatedTokens: number,
): Promise<void> {
  const updatedAt = nowIso();
  await execute(
    `INSERT INTO user_ai_rate_limits
      (user_id, operation, bucket_start, request_count, estimated_tokens, updated_at)
     VALUES (?, ?, ?, 1, ?, ?)
     ON CONFLICT(user_id, operation, bucket_start) DO UPDATE SET
       request_count = user_ai_rate_limits.request_count + 1,
       estimated_tokens = user_ai_rate_limits.estimated_tokens + excluded.estimated_tokens,
       updated_at = excluded.updated_at`,
    [userId, operation, bucketStart, estimatedTokens, updatedAt],
  );
}

async function insertGuardrailEvent(params: {
  userId: string;
  operation: GuardrailOperation;
  scope: GuardrailUsageScope;
  tier: GuardrailTier;
  model?: string;
  outcome: GuardrailUsageRecord['outcome'] | 'denied';
  code?: string;
  message?: string;
  resetAt?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const createdAt = nowIso();
  await execute(
    `INSERT INTO guardrail_events
      (id, user_id, operation, usage_scope, tier, model, outcome, code, message, reset_at, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      crypto.randomUUID(),
      params.userId,
      params.operation,
      params.scope,
      params.tier,
      params.model ?? null,
      params.outcome,
      params.code ?? null,
      params.message ?? null,
      params.resetAt ?? null,
      params.metadata ? JSON.stringify(params.metadata) : null,
      createdAt,
    ],
  );
}

function createDenial(scope: GuardrailUsageScope, denial: GuardrailDenial): GuardrailCheckResult {
  return {
    allowed: false,
    scope,
    denial,
  };
}

export async function checkGuardrails(input: GuardrailCheckInput): Promise<GuardrailCheckResult> {
  const tier = normalizeSubscriptionTier(input.tier);
  const tierPolicy = getGuardrailTierPolicy(tier);
  const opPolicy = tierPolicy.operations[input.operation];
  const scope = scopeForOperation(input.operation);

  if (
    scope === 'user_visible' &&
    input.model &&
    input.allowedModelIds &&
    !input.allowedModelIds.includes(input.model)
  ) {
    const denial: GuardrailDenial = {
      status: 403,
      code: 'MODEL_NOT_ALLOWED',
      message: 'This model is not available for your account.',
    };
    await insertGuardrailEvent({
      userId: input.userId,
      operation: input.operation,
      scope,
      tier,
      model: input.model,
      outcome: 'denied',
      code: denial.code,
      message: denial.message,
    });
    return createDenial(scope, denial);
  }

  if (
    input.operation === 'chat' &&
    input.latestUserMessageChars != null &&
    input.latestUserMessageChars > tierPolicy.maxUserMessageChars
  ) {
    const denial: GuardrailDenial = {
      status: 403,
      code: 'MESSAGE_TOO_LARGE',
      message: `Your message is too large. Limit: ${tierPolicy.maxUserMessageChars} characters.`,
    };
    await insertGuardrailEvent({
      userId: input.userId,
      operation: input.operation,
      scope,
      tier,
      model: input.model,
      outcome: 'denied',
      code: denial.code,
      message: denial.message,
    });
    return createDenial(scope, denial);
  }

  if (input.promptCharCount > opPolicy.maxPromptChars) {
    const denial: GuardrailDenial = {
      status: 403,
      code: 'PROMPT_TOO_LARGE',
      message: 'This conversation is too large for one request.',
    };
    await insertGuardrailEvent({
      userId: input.userId,
      operation: input.operation,
      scope,
      tier,
      model: input.model,
      outcome: 'denied',
      code: denial.code,
      message: denial.message,
    });
    return createDenial(scope, denial);
  }

  if (input.promptMessageCount > opPolicy.maxPromptMessages) {
    const denial: GuardrailDenial = {
      status: 403,
      code: 'TOO_MANY_MESSAGES',
      message: 'This request includes too many messages.',
    };
    await insertGuardrailEvent({
      userId: input.userId,
      operation: input.operation,
      scope,
      tier,
      model: input.model,
      outcome: 'denied',
      code: denial.code,
      message: denial.message,
    });
    return createDenial(scope, denial);
  }

  if (input.requestedMaxTokens != null && input.requestedMaxTokens > opPolicy.maxRequestedTokens) {
    const denial: GuardrailDenial = {
      status: 403,
      code: 'MAX_TOKENS_TOO_HIGH',
      message: `Requested max tokens exceed the ${tier} plan limit.`,
    };
    await insertGuardrailEvent({
      userId: input.userId,
      operation: input.operation,
      scope,
      tier,
      model: input.model,
      outcome: 'denied',
      code: denial.code,
      message: denial.message,
    });
    return createDenial(scope, denial);
  }

  const reservedCompletionTokens = Math.min(
    input.requestedMaxTokens ?? opPolicy.defaultReservedCompletionTokens,
    opPolicy.maxRequestedTokens,
  );

  const usageDate = getUtcDateKey();
  const currentDailyUsage = await getCurrentDailyUsage(input.userId, scope, usageDate);
  const projectedTotal = currentDailyUsage + input.estimatedPromptTokens + reservedCompletionTokens;
  const dailyQuota = quotaForScope(tier, scope);

  if (dailyQuota != null && projectedTotal > dailyQuota) {
    const resetAt = getNextUtcDateIso();
    const denial: GuardrailDenial = {
      status: 403,
      code: 'DAILY_QUOTA_EXCEEDED',
      message:
        scope === 'user_visible'
          ? 'Daily chat quota reached. Try again after reset.'
          : 'Relay is temporarily skipping background AI tasks to preserve capacity.',
      resetAt,
      retryAfterSeconds: secondsUntil(resetAt),
    };
    await insertGuardrailEvent({
      userId: input.userId,
      operation: input.operation,
      scope,
      tier,
      model: input.model,
      outcome: 'denied',
      code: denial.code,
      message: denial.message,
      resetAt,
      metadata: {
        currentDailyUsage,
        projectedTotal,
        dailyQuota,
      },
    });
    return createDenial(scope, denial);
  }

  const bucketStart = getBucketStartIso(opPolicy.rateLimitWindowSeconds);
  const currentRateCount = await getCurrentRateCount(input.userId, input.operation, bucketStart);
  if (currentRateCount >= opPolicy.rateLimitMaxRequests) {
    const resetAt = getBucketResetIso(opPolicy.rateLimitWindowSeconds);
    const denial: GuardrailDenial = {
      status: 429,
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please wait before sending another one.',
      resetAt,
      retryAfterSeconds: secondsUntil(resetAt),
    };
    await insertGuardrailEvent({
      userId: input.userId,
      operation: input.operation,
      scope,
      tier,
      model: input.model,
      outcome: 'denied',
      code: denial.code,
      message: denial.message,
      resetAt,
      metadata: {
        currentRateCount,
        maxRequests: opPolicy.rateLimitMaxRequests,
      },
    });
    return createDenial(scope, denial);
  }

  await incrementRateBucket(
    input.userId,
    input.operation,
    bucketStart,
    input.estimatedPromptTokens,
  );

  return {
    allowed: true,
    scope,
    reservedCompletionTokens,
  };
}

export async function recordGuardrailUsage(input: GuardrailUsageRecord): Promise<void> {
  const tier = normalizeSubscriptionTier(input.tier);
  const scope = scopeForOperation(input.operation);
  const usageDate = getUtcDateKey();
  const promptTokens = Math.max(0, Math.floor(input.promptTokens));
  const completionTokens = Math.max(0, Math.floor(input.completionTokens));
  const totalTokens = promptTokens + completionTokens;
  const updatedAt = nowIso();

  await execute(
    `INSERT INTO user_ai_usage_daily
      (user_id, usage_date, usage_scope, prompt_tokens, completion_tokens, total_tokens, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, usage_date, usage_scope) DO UPDATE SET
       prompt_tokens = user_ai_usage_daily.prompt_tokens + excluded.prompt_tokens,
       completion_tokens = user_ai_usage_daily.completion_tokens + excluded.completion_tokens,
       total_tokens = user_ai_usage_daily.total_tokens + excluded.total_tokens,
       updated_at = excluded.updated_at`,
    [input.userId, usageDate, scope, promptTokens, completionTokens, totalTokens, updatedAt],
  );

  await insertGuardrailEvent({
    userId: input.userId,
    operation: input.operation,
    scope,
    tier,
    model: input.model,
    outcome: input.outcome,
    metadata: {
      promptTokens,
      completionTokens,
      totalTokens,
    },
  });
}

export function toGuardrailApiError(denial: GuardrailDenial): ApiError {
  return new ApiError(denial.message, {
    status: denial.status,
    code: denial.code,
    message: denial.message,
    resetAt: denial.resetAt,
    retryAfterSeconds: denial.retryAfterSeconds,
  });
}

export function getAllKnownChatModelIds(): string[] {
  return CHAT_MODEL_CATALOG.map((model) => model.id);
}

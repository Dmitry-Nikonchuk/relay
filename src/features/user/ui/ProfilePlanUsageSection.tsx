import {
  CHAT_MODEL_CATALOG,
  getGuardrailTierPolicy,
  type ChatSubscriptionTier,
} from '@/shared/config/chatModelCatalog';
import type { UserPlanAndUsageResponseDto } from '@/features/user/model/userPlanAndUsage.types';

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: value >= 10_000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatResetTime(resetAt: string): string {
  return new Date(resetAt).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function formatPercent(used: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((used / total) * 100)));
}

function formatQuota(value: number | null): string {
  if (value == null) {
    return 'No daily cap';
  }
  return `${formatCompact(value)} tokens`;
}

function getPlanModelCount(tier: ChatSubscriptionTier): number {
  if (tier === 'pro') {
    return CHAT_MODEL_CATALOG.length;
  }
  return CHAT_MODEL_CATALOG.filter((model) => !model.minTier || model.minTier === 'free').length;
}

function getOtherTier(tier: ChatSubscriptionTier): ChatSubscriptionTier {
  return tier === 'pro' ? 'free' : 'pro';
}

type ScopeCardProps = {
  title: string;
  description: string;
  helper: string;
  data: UserPlanAndUsageResponseDto['usageToday']['userVisible'];
  total: number | null;
};

function ScopeCard({ title, description, helper, data, total }: ScopeCardProps) {
  const percent = total == null ? 0 : formatPercent(data.totalTokens, total);

  return (
    <div className="rounded-xl border border-border bg-white/70 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-text">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>
        </div>
        <div className="text-right">
          {total == null ? (
            <>
              <p className="text-sm font-semibold text-text">{formatCompact(data.totalTokens)}</p>
              <p className="text-xs text-muted">used today</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-text">
                {formatCompact(data.totalTokens)} / {formatCompact(total)}
              </p>
              <p className="text-xs text-muted">
                {formatCompact(data.remainingTokens ?? 0)} left today
              </p>
            </>
          )}
        </div>
      </div>

      {total == null ? (
        <div className="mt-4 rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-3 py-3">
          <p className="text-xs leading-relaxed text-emerald-900">
            This plan does not have a daily token cap. The number above is only a usage counter for
            today.
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted">
            <span>{percent}% used</span>
            <span>Resets daily</span>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-border/80 bg-surface/70 px-3 py-3">
        <p className="text-xs leading-relaxed text-muted">{helper}</p>
      </div>
    </div>
  );
}

type Props = {
  data: UserPlanAndUsageResponseDto;
};

export function ProfilePlanUsageSection({ data }: Props) {
  const effectiveModel = data.selectedModel ?? data.deploymentDefault;
  const otherTier = getOtherTier(data.tier);
  const currentPlanPolicy = getGuardrailTierPolicy(data.tier);
  const otherPlanPolicy = getGuardrailTierPolicy(otherTier);
  const currentModelCount = getPlanModelCount(data.tier);
  const otherModelCount = getPlanModelCount(otherTier);
  const hasDailyChatCap = data.guardrails.dailyUserVisibleTokens != null;

  return (
    <section className="border-t border-border pt-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-text">Plan &amp; limits</h2>
          <p className="mt-1 text-sm text-muted">
            A simpler view of what your plan includes, what affects chatting, and what you have left
            today.
          </p>
        </div>
        <div className="rounded-full border border-border bg-surface/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-text">
          {data.tier}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-border bg-white/80 p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Current plan
          </p>
          <h3 className="mt-3 text-xl font-semibold tracking-tight text-text">
            {data.tier === 'pro' ? 'Pro plan' : 'Free plan'}
          </h3>
          <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-muted">
            {data.tier === 'pro'
              ? 'You have the larger daily allowance and more generous message and rate limits for heavier chat use.'
              : 'You can use free chat models without a daily token cap. The profile keeps usage visible, while message and speed limits still protect the app.'}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/80 bg-surface/70 p-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                {hasDailyChatCap ? 'Daily chat use' : 'Usage tracking'}
              </p>
              <p className="mt-1 text-base font-semibold text-text">
                {hasDailyChatCap
                  ? formatQuota(data.guardrails.dailyUserVisibleTokens)
                  : `${formatCompact(data.usageToday.userVisible.totalTokens)} used today`}
              </p>
              <p className="mt-1 text-xs text-muted">
                {hasDailyChatCap
                  ? 'How much chatting you can do today.'
                  : 'No daily token limit. This is only a counter so you can see today’s usage.'}
              </p>
            </div>
            <div className="rounded-xl border border-border/80 bg-surface/70 p-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Message size</p>
              <p className="mt-1 text-base font-semibold text-text">
                {formatNumber(data.guardrails.maxUserMessageChars)} chars
              </p>
              <p className="mt-1 text-xs text-muted">How long a single message can be.</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-surface/70 p-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Send speed</p>
              <p className="mt-1 text-base font-semibold text-text">
                {currentPlanPolicy.operations.chat.rateLimitMaxRequests}/min
              </p>
              <p className="mt-1 text-xs text-muted">How quickly you can send back-to-back.</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-border/80 bg-surface/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-text">Model access</h4>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Choose a model in chat right before you send a message.
                </p>
              </div>
              <span className="rounded-full border border-border bg-white px-2.5 py-1 text-xs font-medium text-text">
                Current default: {effectiveModel}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.availableModels.map((model) => (
                <span
                  key={model.id}
                  className="rounded-full border border-border bg-white px-2.5 py-1 text-xs text-text"
                >
                  {model.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white/70 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                Plan comparison
              </p>
              <h3 className="mt-3 text-base font-semibold text-text">
                {data.tier === 'pro' ? 'What Pro gives you' : 'What changes on Pro'}
              </h3>
            </div>
            <div className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text">
              Comparing {data.tier} vs {otherTier}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-border/80 bg-surface/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-text">Daily token policy</span>
                <span className="text-sm font-semibold text-text">
                  {formatQuota(data.guardrails.dailyUserVisibleTokens)} vs{' '}
                  {formatQuota(otherPlanPolicy.dailyUserVisibleTokens)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {data.guardrails.dailyUserVisibleTokens == null ||
                otherPlanPolicy.dailyUserVisibleTokens == null
                  ? 'Free usage can stay uncapped when only free models are available, while other plans may use a daily allowance model.'
                  : 'More allowance means more replies and longer sessions before the daily reset.'}
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-surface/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-text">Single message length</span>
                <span className="text-sm font-semibold text-text">
                  {formatNumber(data.guardrails.maxUserMessageChars)} vs{' '}
                  {formatNumber(otherPlanPolicy.maxUserMessageChars)} chars
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                Higher limits make it easier to send larger prompts, drafts, or documents.
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-surface/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-text">Send speed</span>
                <span className="text-sm font-semibold text-text">
                  {currentPlanPolicy.operations.chat.rateLimitMaxRequests}/min vs{' '}
                  {otherPlanPolicy.operations.chat.rateLimitMaxRequests}/min
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                This affects how quickly you can send many messages in a short burst.
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-surface/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-text">Model selection</span>
                <span className="text-sm font-semibold text-text">
                  {currentModelCount} vs {otherModelCount} models
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                Model choice affects style and quality. You can switch models directly in chat.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-white/70 p-4">
          <h3 className="text-sm font-semibold text-text">How to read this</h3>
          <div className="mt-3 space-y-3 text-sm text-muted">
            <p>
              Tokens are the app&apos;s way of measuring AI usage. More tokens usually means longer
              prompts, longer replies, or both.
            </p>
            <p>
              Limits reset at{' '}
              <span className="font-medium text-text">
                {formatResetTime(data.usageToday.resetAt)}
              </span>
              . On the free plan, this reset time matters for burst limits, but not for a daily chat
              cap.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white/70 p-4">
          <h3 className="text-sm font-semibold text-text">What affects your experience</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border/80 bg-surface/70 p-3">
              <p className="text-sm font-medium text-text">Longer messages</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Controlled by the single-message limit and the total conversation size per send.
              </p>
            </div>
            <div className="rounded-lg border border-border/80 bg-surface/70 p-3">
              <p className="text-sm font-medium text-text">Faster back-and-forth</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Controlled by the per-minute request cap on your current plan.
              </p>
            </div>
            <div className="rounded-lg border border-border/80 bg-surface/70 p-3">
              <p className="text-sm font-medium text-text">Longer replies</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Controlled by the maximum reply size allowed for each chat request.
              </p>
            </div>
            <div className="rounded-lg border border-border/80 bg-surface/70 p-3">
              <p className="text-sm font-medium text-text">Background helpers</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Titles and memory run in the background. They should stay out of your way during
                normal chat use.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <ScopeCard
          title="Today's chat usage"
          description="This is the part that affects sending new prompts and getting replies."
          helper={
            data.guardrails.dailyUserVisibleTokens == null
              ? 'This is usage tracking only. On the free plan, it does not stop you when it grows.'
              : 'If this fills up, you will need to wait until the daily reset before continuing to chat.'
          }
          data={data.usageToday.userVisible}
          total={data.guardrails.dailyUserVisibleTokens}
        />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-white/70 p-4">
        <h3 className="text-sm font-semibold text-text">Practical limits</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          These are the limits that most directly change how chat feels in daily use.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border/80 bg-surface/70 p-3">
            <h4 className="text-sm font-medium text-text">Per message</h4>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              A single message can be up to{' '}
              <span className="font-medium text-text">
                {formatNumber(data.guardrails.maxUserMessageChars)} characters
              </span>
              .
            </p>
          </div>

          <div className="rounded-lg border border-border/80 bg-surface/70 p-3">
            <h4 className="text-sm font-medium text-text">Per send</h4>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Relay can process up to{' '}
              <span className="font-medium text-text">
                {formatNumber(data.guardrails.operations.chat.maxPromptMessages)}
              </span>{' '}
              recent messages and about{' '}
              <span className="font-medium text-text">
                {formatNumber(data.guardrails.operations.chat.maxPromptChars)}
              </span>{' '}
              prompt characters in one request.
            </p>
          </div>

          <div className="rounded-lg border border-border/80 bg-surface/70 p-3">
            <h4 className="text-sm font-medium text-text">Reply size</h4>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              A single chat reply can use up to{' '}
              <span className="font-medium text-text">
                {formatNumber(data.guardrails.operations.chat.maxRequestedTokens)}
              </span>{' '}
              tokens.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

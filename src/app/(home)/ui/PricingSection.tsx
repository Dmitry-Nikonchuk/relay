import { Button } from '@/shared/ui/Button';

const freePlanPoints = [
  'Access to free models only',
  'Great for quick chats, drafts, and everyday prompts',
  'Clean chat experience with history, context, and model switching',
  'A good starting point before you need premium reasoning or flagship quality',
];

const proPlanPoints = [
  'Unlock many top paid models in one workspace',
  'Better model quality for coding, research, analysis, and long-form writing',
  'More room for heavier daily use and faster back-to-back workflows',
  'Best fit if Relay is part of your daily professional stack',
];

const proModels = [
  'OpenAI GPT-5.4',
  'Anthropic Claude Opus 4.6',
  'Anthropic Claude Sonnet 4',
  'Google Gemini 2.5 Pro',
];

const compareRows = [
  {
    label: 'Model access',
    free: 'Free models only',
    pro: 'Popular premium frontier models',
  },
  {
    label: 'Best for',
    free: 'Daily chat, drafts, quick ideas',
    pro: 'Coding, deep analysis, high-quality writing',
  },
  {
    label: 'Output quality',
    free: 'Solid for everyday tasks',
    pro: 'Stronger reasoning and more reliable results',
  },
  {
    label: 'Who it fits',
    free: 'Exploring Relay or using it casually',
    pro: 'Using Relay as part of real work',
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto w-full max-w-6xl">
        <div className="max-w-3xl">
          <span className="inline-flex rounded-full border border-[var(--color-border)] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
            Pricing
          </span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--color-text)] sm:text-4xl">
            Start free. Upgrade when model quality becomes the bottleneck.
          </h2>
          <p className="mt-3 text-base leading-7 text-[var(--color-muted)] sm:text-lg">
            Relay keeps the product simple: the free plan gives you access to free models, while Pro
            opens the door to premium frontier models for more serious work.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:mt-10 lg:grid-cols-[0.92fr_1.08fr]">
          <article className="landing-glass-card p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Free
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-text)]">
                  Get moving with free models
                </h3>
              </div>
              <span className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs font-medium text-[var(--color-text)]">
                $0
              </span>
            </div>

            <div className="mt-4 inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-3 py-1 text-xs font-medium text-[var(--color-text)]">
              Best for trying Relay and staying on free inference
            </div>

            <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
              Best for trying Relay, running everyday conversations, and keeping a fast AI chat
              workspace without paying for premium inference.
            </p>

            <ul className="mt-5 space-y-3 text-sm text-[var(--color-text)]">
              {freePlanPoints.map((point) => (
                <li key={point} className="landing-benefit-item py-3">
                  <span className="landing-benefit-dot" aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="landing-cta-panel overflow-hidden rounded-[1.75rem] p-6 text-white sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/72">
                  Pro
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                  Unlock premium models for higher-stakes work
                </h3>
              </div>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white">
                Premium
              </span>
            </div>

            <div className="mt-4 inline-flex rounded-full border border-white/16 bg-white/10 px-3 py-1 text-xs font-medium text-white">
              Best for serious work where model quality changes the outcome
            </div>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/80">
              Pro is for people who want access to many of the most popular paid models in one
              place. Think stronger coding, better reasoning, sharper writing, and more reliable
              outputs when quality matters.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {proModels.map((model) => (
                <span
                  key={model}
                  className="rounded-full border border-white/18 bg-white/10 px-3 py-1 text-xs font-medium text-white"
                >
                  {model}
                </span>
              ))}
            </div>

            <ul className="mt-6 grid gap-3 md:grid-cols-2">
              {proPlanPoints.map((point) => (
                <li
                  key={point}
                  className="rounded-2xl border border-white/16 bg-white/8 px-4 py-4 text-sm leading-6 text-white/88"
                >
                  {point}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button href="/auth" variant="light" size="md">
                Upgrade to Pro
              </Button>
              <p className="text-sm text-white/72">
                Free keeps things accessible. Pro is where the flagship models live.
              </p>
            </div>
          </article>
        </div>

        <div className="mt-6 rounded-[1.75rem] border border-[var(--color-border)] bg-white/70 p-5 shadow-[0_18px_50px_rgba(18,18,40,0.08)] sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
                Free vs Pro
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-text)]">
                The difference is mostly about model access and output quality
              </h3>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[var(--color-muted)]">
              Free gives you a strong product experience with free models. Pro is for the moment
              when you want the best available model for the task in front of you.
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--color-border)]">
            <div className="grid grid-cols-[1.1fr_0.95fr_1fr] bg-[var(--color-surface)]/80 text-sm font-semibold text-[var(--color-text)]">
              <div className="border-b border-[var(--color-border)] px-4 py-3">What changes</div>
              <div className="border-b border-l border-[var(--color-border)] px-4 py-3">Free</div>
              <div className="border-b border-l border-[var(--color-border)] bg-[var(--color-primary)]/6 px-4 py-3">
                Pro
              </div>
            </div>

            {compareRows.map((row, index) => (
              <div
                key={row.label}
                className="grid grid-cols-[1.1fr_0.95fr_1fr] text-sm text-[var(--color-muted)]"
              >
                <div
                  className={`px-4 py-3 text-[var(--color-text)] ${
                    index !== compareRows.length - 1 ? 'border-b border-[var(--color-border)]' : ''
                  }`}
                >
                  {row.label}
                </div>
                <div
                  className={`border-l border-[var(--color-border)] px-4 py-3 ${
                    index !== compareRows.length - 1 ? 'border-b border-[var(--color-border)]' : ''
                  }`}
                >
                  {row.free}
                </div>
                <div
                  className={`border-l border-[var(--color-border)] bg-[var(--color-primary)]/4 px-4 py-3 text-[var(--color-text)] ${
                    index !== compareRows.length - 1 ? 'border-b border-[var(--color-border)]' : ''
                  }`}
                >
                  {row.pro}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

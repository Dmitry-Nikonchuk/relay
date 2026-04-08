import { Button } from '@/shared/ui/Button';

const quickMessages = [
  {
    role: 'You',
    content: 'Summarize user feedback from this week and draft product priorities.',
  },
  {
    role: 'Relay',
    content:
      '3 priority themes: onboarding clarity, mobile speed, and export quality. I can turn this into a roadmap.',
  },
  {
    role: 'You',
    content: 'Create the roadmap with milestones and risks.',
  },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-14 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pb-20 lg:pt-20">
      <div className="landing-hero-glow" aria-hidden="true" />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14">
        <div className="space-y-6 lg:space-y-8">
          <p className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)] sm:text-xs">
            AI Chat Platform
          </p>

          <h1 className="max-w-2xl text-balance text-4xl font-semibold leading-[1.04] tracking-tight text-[var(--color-text)] sm:text-5xl lg:text-6xl">
            Your AI chat.
            <br />
            Your rules.
          </h1>

          <p className="max-w-xl text-base leading-7 text-[var(--color-muted)] sm:text-lg">
            Relay is fast, clean, and context-aware. Switch models instantly. Keep every
            conversation sharp.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button href="/auth" variant="primary" size="lg">
              Start chatting
            </Button>
            <Button href="#demo" variant="secondary" size="lg">
              Watch preview
            </Button>
          </div>
        </div>

        <aside className="landing-glass-card p-4 sm:p-5" aria-label="Relay chat preview">
          <div className="mb-4 flex items-center justify-between border-b border-[var(--color-border)]/80 pb-3">
            <p className="text-sm font-semibold text-[var(--color-text)]">Relay Workspace</p>
            <span className="rounded-full bg-[var(--color-primary)]/15 px-2.5 py-1 text-xs font-medium text-[var(--color-primary)]">
              Live
            </span>
          </div>

          <div className="space-y-3">
            {quickMessages.map((item) => (
              <article
                key={`${item.role}-${item.content}`}
                className="group rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-surface)]/85 p-3.5 transition duration-300 hover:-translate-y-0.5 hover:border-[var(--color-primary)]/40"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  {item.role}
                </p>
                <p className="mt-1.5 text-sm leading-6 text-[var(--color-text)]">{item.content}</p>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

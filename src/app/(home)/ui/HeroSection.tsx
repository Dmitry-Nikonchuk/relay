import Image from 'next/image';
import { ArrowRight, Bot, Layers3, ShieldCheck, Sparkles } from 'lucide-react';

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
      <div className="landing-grid-overlay" aria-hidden="true" />
      <div className="landing-hero-orb landing-hero-orb--one" aria-hidden="true" />
      <div className="landing-hero-orb landing-hero-orb--two" aria-hidden="true" />
      <div className="landing-hero-orb landing-hero-orb--three" aria-hidden="true" />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14">
        <div className="space-y-6 lg:space-y-8">
          <p className="landing-kicker">
            <span className="landing-dot" aria-hidden="true" />
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

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="landing-stat-card">
              <div className="flex items-center gap-2 text-[var(--color-text)]">
                <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
                <span className="text-sm font-semibold">Model flexible</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                Move between free and premium models based on the task.
              </p>
            </div>
            <div className="landing-stat-card">
              <div className="flex items-center gap-2 text-[var(--color-text)]">
                <ShieldCheck className="h-4 w-4 text-[var(--color-primary)]" />
                <span className="text-sm font-semibold">Guardrailed</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                Rate limits, plan rules, and recovery flows are built in.
              </p>
            </div>
            <div className="landing-stat-card">
              <div className="flex items-center gap-2 text-[var(--color-text)]">
                <Layers3 className="h-4 w-4 text-[var(--color-primary)]" />
                <span className="text-sm font-semibold">Context aware</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                Persistent threads and memory keep long conversations usable.
              </p>
            </div>
          </div>
        </div>

        <aside className="landing-product-panel p-4 sm:p-5" aria-label="Relay chat preview">
          <div className="landing-product-noise" aria-hidden="true" />
          <div className="relative">
            <div className="mb-4 flex items-center justify-between border-b border-[var(--color-border)]/80 pb-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-white shadow-sm">
                  <Image src="/logo.png" alt="Relay logo" width={26} height={24} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">Relay Workspace</p>
                  <p className="text-xs text-[var(--color-muted)]">Fast context-aware AI chat</p>
                </div>
              </div>
              <span className="rounded-full bg-[var(--color-primary)]/15 px-2.5 py-1 text-xs font-medium text-[var(--color-primary)]">
                Live
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1.25fr_0.75fr]">
              <div className="space-y-3">
                {quickMessages.map((item) => (
                  <article
                    key={`${item.role}-${item.content}`}
                    className="group rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-surface)]/85 p-3.5 transition duration-300 hover:-translate-y-0.5 hover:border-[var(--color-primary)]/40"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                      {item.role}
                    </p>
                    <p className="mt-1.5 text-sm leading-6 text-[var(--color-text)]">
                      {item.content}
                    </p>
                  </article>
                ))}
              </div>

              <div className="space-y-3">
                <div className="landing-dashboard-card p-4">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-[var(--color-primary)]" />
                    <p className="text-sm font-semibold text-[var(--color-text)]">Active model</p>
                  </div>
                  <p className="mt-3 rounded-xl bg-[var(--color-primary)]/10 px-3 py-2 text-sm font-medium text-[var(--color-text)]">
                    GPT-5.4
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[var(--color-muted)]">
                    Switch instantly when the task changes.
                  </p>
                </div>

                <div className="landing-dashboard-card p-4">
                  <p className="text-sm font-semibold text-[var(--color-text)]">Reliability</p>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between rounded-xl bg-[var(--color-surface)] px-3 py-2 text-sm">
                      <span className="text-[var(--color-muted)]">Streaming</span>
                      <span className="font-semibold text-[var(--color-text)]">Recovered</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-[var(--color-surface)] px-3 py-2 text-sm">
                      <span className="text-[var(--color-muted)]">Guardrails</span>
                      <span className="font-semibold text-[var(--color-text)]">On</span>
                    </div>
                  </div>
                </div>

                <a
                  href="#pricing"
                  className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-white/85 px-4 py-3 text-sm font-medium text-[var(--color-text)] shadow-sm transition hover:-translate-y-0.5"
                >
                  <span>See Free vs Pro</span>
                  <ArrowRight className="h-4 w-4 text-[var(--color-primary)]" />
                </a>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

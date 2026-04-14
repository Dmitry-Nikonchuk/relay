import { ArrowRight, BadgeCheck, Star } from 'lucide-react';

import { Button } from '@/shared/ui/Button';

export function CTASection() {
  return (
    <section className="px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pb-24 lg:pt-14">
      <div className="mx-auto w-full max-w-6xl">
        <div className="landing-cta-panel overflow-hidden rounded-3xl p-7 sm:p-10 lg:p-12">
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
              Launch-ready chat UX
            </span>
            <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
              Free and Pro plans
            </span>
          </div>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Start chatting now
          </h2>
          <p className="mt-3 max-w-xl text-base text-white/80 sm:text-lg">
            Bring your prompts, your context, and your workflow. Relay is ready.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button href="/auth" variant="light" size="lg">
              Open Relay
            </Button>
            <Button
              href="/#pricing"
              variant="secondary"
              size="lg"
              className="border-white/18 bg-white/10 text-white"
            >
              See plans
            </Button>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/14 bg-white/8 px-4 py-4 text-white/88">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <BadgeCheck className="h-4 w-4" />
                Persistent chats
              </div>
              <p className="mt-2 text-sm leading-6 text-white/70">
                Keep context, history, and titles in one focused workspace.
              </p>
            </div>
            <div className="rounded-2xl border border-white/14 bg-white/8 px-4 py-4 text-white/88">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Star className="h-4 w-4" />
                Premium models
              </div>
              <p className="mt-2 text-sm leading-6 text-white/70">
                Move up to flagship reasoning and writing models when needed.
              </p>
            </div>
            <div className="rounded-2xl border border-white/14 bg-white/8 px-4 py-4 text-white/88">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ArrowRight className="h-4 w-4" />
                Built to keep moving
              </div>
              <p className="mt-2 text-sm leading-6 text-white/70">
                Streaming, retries, and better failure handling are already built in.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

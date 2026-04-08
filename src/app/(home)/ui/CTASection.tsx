import { Button } from '@/shared/ui/Button';

export function CTASection() {
  return (
    <section className="px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pb-24 lg:pt-14">
      <div className="mx-auto w-full max-w-6xl">
        <div className="landing-cta-panel overflow-hidden rounded-3xl p-7 sm:p-10 lg:p-12">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Start chatting now
          </h2>
          <p className="mt-3 max-w-xl text-base text-white/80 sm:text-lg">
            Bring your prompts, your context, and your workflow. Relay is ready.
          </p>
          <div className="mt-7">
            <Button href="/auth" variant="light" size="lg">
              Open Relay
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

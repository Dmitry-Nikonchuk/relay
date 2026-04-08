const steps = [
  {
    title: 'Create chat',
    description: 'Start a new thread with a clear goal and structured prompt.',
  },
  {
    title: 'Choose model',
    description: 'Select the model that fits your task in one click.',
  },
  {
    title: 'Start talking',
    description: 'Iterate quickly with context-preserving responses.',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto w-full max-w-6xl rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-6 backdrop-blur-sm sm:p-8 lg:p-10">
        <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-text)] sm:text-4xl">
          How Relay works
        </h2>

        <ol className="mt-8 grid gap-4 lg:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="landing-step-card">
              <span className="landing-step-badge">0{i + 1}</span>
              <h3 className="mt-4 text-xl font-semibold tracking-tight text-[var(--color-text)]">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

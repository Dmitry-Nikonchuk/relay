const features = [
  {
    title: 'Fast responses',
    description: 'Minimal latency. High signal replies. Keep momentum in every thread.',
  },
  {
    title: 'Multiple models',
    description: 'Pick the right model for writing, coding, analysis, or quick drafts.',
  },
  {
    title: 'Context aware',
    description: 'Relay keeps your thread state clear, so follow-ups stay accurate.',
  },
  {
    title: 'Beautiful UI',
    description: 'Focused layout, readable messages, and polished interactions by default.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto w-full max-w-6xl">
        <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-text)] sm:text-4xl">
          Built for focused AI work
        </h2>
        <p className="mt-3 max-w-2xl text-base text-[var(--color-muted)] sm:text-lg">
          Fast. Clean. Context-aware.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:mt-10 lg:grid-cols-4">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className="landing-glass-card group p-5 transition duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <h3 className="text-lg font-semibold tracking-tight text-[var(--color-text)]">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const benefits = [
  'Clean UI that stays out of your way',
  'Smart context handling across long threads',
  'Model flexibility for different tasks',
  'Developer friendly from first prompt',
];

export function BenefitsSection() {
  return (
    <section className="px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-text)] sm:text-4xl">
            Why teams choose Relay
          </h2>
          <p className="mt-3 max-w-md text-base text-[var(--color-muted)] sm:text-lg">
            One workspace for clarity, speed, and control.
          </p>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
          {benefits.map((benefit) => (
            <li key={benefit} className="landing-benefit-item">
              <span className="landing-benefit-dot" aria-hidden="true" />
              <span className="text-sm leading-6 text-[var(--color-text)]">{benefit}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

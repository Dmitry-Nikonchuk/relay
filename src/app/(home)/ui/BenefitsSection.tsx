import { BrainCircuit, LockKeyhole, Rocket, WandSparkles } from 'lucide-react';

const benefits = [
  {
    icon: WandSparkles,
    title: 'Clean UI that stays out of your way',
    description: 'The workspace feels productized, not experimental.',
  },
  {
    icon: BrainCircuit,
    title: 'Smart context handling across long threads',
    description: 'Longer conversations stay legible and easier to continue.',
  },
  {
    icon: Rocket,
    title: 'Model flexibility for different tasks',
    description: 'Switch from quick free models to stronger premium ones.',
  },
  {
    icon: LockKeyhole,
    title: 'Developer friendly from first prompt',
    description: 'Built with auth, persistence, guardrails, and recovery in mind.',
  },
];

export function BenefitsSection() {
  return (
    <section className="px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
      <div className="landing-section-shell mx-auto grid w-full max-w-6xl gap-8 p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:p-10">
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
            <li key={benefit.title} className="landing-benefit-item">
              <span className="landing-icon-chip shrink-0" aria-hidden="true">
                <benefit.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold leading-6 text-[var(--color-text)]">
                  {benefit.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
                  {benefit.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

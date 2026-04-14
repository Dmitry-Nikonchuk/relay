import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@/shared/ui/Button';

type LegalSectionProps = {
  title: string;
  children: ReactNode;
};

export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section className="space-y-3 border-t border-border pt-6 first:border-t-0 first:pt-0">
      <h2 className="text-lg font-semibold tracking-tight text-text">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}

type LegalPageProps = {
  title: string;
  eyebrow: string;
  description: string;
  effectiveDate: string;
  children: ReactNode;
};

export function LegalPage({
  title,
  eyebrow,
  description,
  effectiveDate,
  children,
}: LegalPageProps) {
  return (
    <main className="landing-bg min-h-screen px-5 py-10 md:px-8">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-text">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
            <p className="mt-2 text-xs text-muted">Last updated {effectiveDate}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button href="/" variant="secondary" size="sm">
              Back to home
            </Button>
            <Button href="/auth" variant="secondary" size="sm">
              Sign in
            </Button>
          </div>
        </div>

        <div className="landing-glass-card space-y-6 p-6 md:p-8">{children}</div>

        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted">
          <Link href="/privacy" className="font-medium text-primary underline underline-offset-2">
            Privacy Policy
          </Link>
          <Link
            href="/data-policy"
            className="font-medium text-primary underline underline-offset-2"
          >
            Data Policy
          </Link>
          <Link href="/terms" className="font-medium text-primary underline underline-offset-2">
            Terms of Use
          </Link>
        </div>
      </div>
    </main>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';

import { Button } from '@/shared/ui/Button';

export const metadata: Metadata = {
  title: 'Relay | Privacy & cookies',
  description: 'How Relay uses cookies and session data for sign-in.',
};

export default function PrivacyPage() {
  return (
    <main className="landing-bg min-h-screen px-5 py-10 md:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-text">Privacy &amp; cookies</h1>
          <Button href="/auth" variant="secondary" size="sm">
            Sign in
          </Button>
        </div>

        <div className="landing-glass-card space-y-4 p-6 text-sm leading-relaxed text-muted">
          <p>
            Relay uses <strong className="text-text">HTTP-only cookies</strong> to keep you signed
            in after you authenticate (for example with Google). We do not store access tokens in{' '}
            <code className="rounded bg-surface px-1 py-0.5 text-text">localStorage</code> or{' '}
            <code className="rounded bg-surface px-1 py-0.5 text-text">sessionStorage</code>.
          </p>
          <p>
            Session cookies are scoped to our site and are required for the chat workspace to know
            who you are. You can end your session by signing out (when available) or by clearing
            site cookies for Relay in your browser.
          </p>
          <p>
            For questions, contact the operator of your Relay deployment.{' '}
            <Link href="/" className="font-medium text-primary underline underline-offset-2">
              Back to home
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

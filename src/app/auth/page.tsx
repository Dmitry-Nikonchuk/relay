import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Sora } from 'next/font/google';

import { Button } from '@/shared/ui/Button';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Relay | Log In or Sign Up',
  description: 'Access Relay to continue into your AI chat workspace.',
};

export default function AuthPage() {
  return (
    <main
      className={`${sora.className} landing-bg relative min-h-screen overflow-hidden px-5 py-10 md:px-8`}
    >
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-xl font-semibold tracking-tight">
            <Image src="/logo.png" alt="Relay logo" width={42} height={42} className="rounded-md" />
            <span className="text-text">Relay</span>
          </Link>
          <Button href="/chat" variant="secondary" size="sm">
            Skip to chat
          </Button>
        </header>

        <section className="landing-glass-card p-7 md:p-10">
          <p className="inline-flex rounded-full border border-white/60 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Authentication Entry
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">Welcome to Relay</h1>
          <p className="mt-3 max-w-2xl text-muted">
            Choose how you want to continue. In the next iteration, these actions will connect to a
            real auth provider and then redirect to your chat workspace.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <article className="landing-glass-card p-5">
              <h2 className="text-2xl font-semibold">Log in</h2>
              <p className="mt-2 text-sm text-muted">
                Return to your existing Relay account and continue your previous conversations.
              </p>
              <div className="mt-5">
                <Button
                  href="/chat"
                  variant="primary"
                  className="w-full px-4 py-3 text-center text-sm"
                >
                  Continue to chat
                </Button>
              </div>
            </article>

            <article className="landing-glass-card p-5">
              <h2 className="text-2xl font-semibold">Sign up</h2>
              <p className="mt-2 text-sm text-muted">
                Create your Relay account and start organizing your AI conversations from day one.
              </p>
              <div className="mt-5">
                <Button
                  href="/chat"
                  variant="secondary"
                  className="w-full px-4 py-3 text-center text-sm"
                >
                  Create account
                </Button>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}

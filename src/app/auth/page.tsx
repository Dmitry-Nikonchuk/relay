import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Sora } from 'next/font/google';

import { SignInWithGoogle } from '@/features/auth/ui/SignInWithGoogle';
import { auth } from '@/auth';
import { AuthDivider } from '@/shared/ui/AuthDivider';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Relay | Log In or Sign Up',
  description: 'Access Relay to continue into your AI chat workspace.',
};

function safeCallbackUrl(raw: string | undefined): string {
  if (raw == null || raw === '' || !raw.startsWith('/') || raw.startsWith('//')) {
    return '/chat';
  }
  return raw;
}

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl: rawCallback } = await searchParams;
  const callbackUrl = safeCallbackUrl(rawCallback);

  const session = await auth();
  if (session?.user) {
    redirect(callbackUrl);
  }

  return (
    <main
      className={`${sora.className} landing-bg relative min-h-screen overflow-hidden px-5 py-10 md:px-8`}
    >
      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-xl font-semibold tracking-tight">
            <Image src="/logo.png" alt="Relay logo" width={42} height={42} className="rounded-md" />
            <span className="text-text">Relay</span>
          </Link>
          <Button href="/" variant="secondary" size="sm">
            Back to home
          </Button>
        </header>

        <section className="landing-glass-card p-7 md:p-10">
          <p className="inline-flex rounded-full border border-white/60 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Sign in
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">Welcome to Relay</h1>
          <p className="mt-3 text-muted">
            One step with Google: first time creates your account; next time you are signed back in.
            No separate registration form.
          </p>

          <div className="mt-8">
            <SignInWithGoogle callbackUrl={callbackUrl} />
          </div>

          <AuthDivider label="Why one button" />

          <Field
            label="Log in and sign up"
            hint="We use Google only for now so you can start quickly. Email and password may be added later."
          >
            <p className="rounded-md border border-border bg-surface/80 px-3 py-2 text-sm text-text">
              Your chats stay tied to your Relay account. Sessions use secure cookies (see{' '}
              <Link
                href="/privacy"
                className="font-medium text-primary underline underline-offset-2"
              >
                privacy policy
              </Link>
              ).
            </p>
          </Field>

          <p className="mt-8 text-center text-xs text-muted">
            By continuing you agree to the use of essential session cookies and to the{' '}
            <Link href="/terms" className="font-medium text-primary underline underline-offset-2">
              Terms of Use
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}

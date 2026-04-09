import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SignOutButton } from '@/features/auth/ui/SignOutButton';
import { ProfileChatModelSection } from '@/features/user/ui/ProfileChatModelSection';
import { auth } from '@/auth';
import { Button } from '@/shared/ui/Button';
import { UserAvatar } from '@/shared/ui/UserAvatar';

export const metadata: Metadata = {
  title: 'Relay | Profile',
  description: 'Your Relay account and sign-in details.',
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/auth');
  }

  const { name, email, image } = session.user;
  const displayName = name?.trim() || 'Account';

  return (
    <main className="landing-bg min-h-screen px-5 py-10 md:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-text">Profile</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Button href="/chat" variant="secondary" size="sm">
              Back to chat
            </Button>
            <SignOutButton />
          </div>
        </div>

        <div className="landing-glass-card space-y-6 p-6 md:p-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <UserAvatar name={name} email={email} src={image} size="lg" />
            <div className="min-w-0 flex-1 space-y-1 text-center sm:text-left">
              <p className="text-lg font-semibold text-text">{displayName}</p>
              {email ? (
                <p className="text-sm text-muted" title={email}>
                  {email}
                </p>
              ) : null}
            </div>
          </div>

          <ProfileChatModelSection />

          <div className="border-t border-border pt-6 text-sm leading-relaxed text-muted">
            <p>
              Account details (name, email, profile photo) are provided by your sign-in provider. To
              change them, update your Google account; Relay will reflect changes on your next sign
              in.
            </p>
            <p className="mt-4">
              <Link
                href="/privacy"
                className="font-medium text-primary underline underline-offset-2"
              >
                Privacy &amp; cookies
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

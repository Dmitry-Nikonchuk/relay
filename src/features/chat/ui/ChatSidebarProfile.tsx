'use client';

import Link from 'next/link';

import { UserAvatar } from '@/shared/ui/UserAvatar';

export type ChatSidebarUser = {
  name: string | null;
  email: string | null;
  image: string | null;
};

type Props = {
  user: ChatSidebarUser;
};

export function ChatSidebarProfile({ user }: Props) {
  const displayName = user.name?.trim() || 'Account';
  const email = user.email?.trim() || '';

  return (
    <Link
      href="/profile"
      className="mt-auto flex min-w-0 items-center gap-2.5 rounded-lg border border-border/80 bg-surface/70 px-2.5 py-2 transition-colors hover:bg-surface hover:border-border"
    >
      <UserAvatar name={user.name} email={user.email} src={user.image} size="sm" />
      <div className="min-w-0 flex-1 text-left">
        <div className="truncate text-sm font-medium text-text">{displayName}</div>
        {email ? (
          <div className="truncate text-[11px] text-muted" title={email}>
            {email}
          </div>
        ) : null}
      </div>
    </Link>
  );
}

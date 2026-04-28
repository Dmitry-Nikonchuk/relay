'use client';

import { signOut } from 'next-auth/react';

import { ClientButton } from '@/shared/ui/Button';

export function SignOutButton() {
  return (
    <ClientButton
      type="button"
      variant="danger"
      size="sm"
      onClick={() => signOut({ callbackUrl: '/' })}
    >
      Sign out
    </ClientButton>
  );
}

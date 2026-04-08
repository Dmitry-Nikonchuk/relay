'use client';

import { signOut } from 'next-auth/react';

import { Button } from '@/shared/ui/Button';

export function SignOutButton() {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => signOut({ callbackUrl: '/' })}
    >
      Sign out
    </Button>
  );
}

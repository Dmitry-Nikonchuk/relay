'use client';

import Image from 'next/image';

import { cn } from '@/shared/lib/cn';

const sizePixels = { sm: 36, md: 56, lg: 96 } as const;

const sizeClass = {
  sm: 'h-9 w-9 min-h-9 min-w-9 text-xs',
  md: 'h-14 w-14 min-h-14 min-w-14 text-lg',
  lg: 'h-24 w-24 min-h-24 min-w-24 text-2xl',
} as const;

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  const n = name?.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase().slice(0, 2);
    }
    return n.slice(0, 2).toUpperCase();
  }
  const e = email?.trim();
  if (e) {
    return e.slice(0, 2).toUpperCase();
  }
  return '?';
}

export type UserAvatarProps = {
  name?: string | null;
  email?: string | null;
  src?: string | null;
  size?: keyof typeof sizePixels;
  className?: string;
};

export function UserAvatar({ name, email, src, size = 'sm', className }: UserAvatarProps) {
  const px = sizePixels[size];
  const initials = getInitials(name, email);
  const label = name?.trim() || email?.trim() || 'User';

  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={px}
        height={px}
        className={cn('rounded-full object-cover', sizeClass[size], className)}
      />
    );
  }

  return (
    <div
      aria-label={label}
      className={cn(
        'flex items-center justify-center rounded-full bg-primary/15 font-semibold text-primary',
        sizeClass[size],
        className,
      )}
      role="img"
    >
      <span aria-hidden className="select-none">
        {initials}
      </span>
    </div>
  );
}

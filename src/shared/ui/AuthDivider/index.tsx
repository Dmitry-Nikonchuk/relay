'use client';

import { cn } from '@/shared/lib/cn';

export type AuthDividerProps = {
  /** Center label, e.g. "or". */
  label?: string;
  className?: string;
};

export function AuthDivider({ label = 'or', className }: AuthDividerProps) {
  return (
    <div
      className={cn('relative my-6 flex items-center gap-3', className)}
      role="separator"
      aria-label={label}
    >
      <span className="h-px flex-1 bg-border" />
      <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

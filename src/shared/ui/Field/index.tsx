'use client';

import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

import { Label } from '@/shared/ui/Label';

export type FieldProps = {
  id?: string;
  label: string;
  /** Shown below the control; use for validation messages. */
  error?: string;
  /** Subtle helper under the label. */
  hint?: string;
  className?: string;
  children: ReactNode;
};

export function Field({ id, label, error, hint, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      {children}
      {error ? (
        <p className="text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

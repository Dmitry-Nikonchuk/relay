'use client';

import { LabelHTMLAttributes, forwardRef } from 'react';

import { cn } from '@/shared/lib/cn';

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  /** When set, clicking the label toggles this control (use with `Input id`). */
  htmlFor?: string;
};

export const Label = forwardRef<HTMLLabelElement, LabelProps>(function Label(
  { className, children, ...props },
  ref,
) {
  return (
    <label ref={ref} className={cn('block text-sm font-medium text-text', className)} {...props}>
      {children}
    </label>
  );
});

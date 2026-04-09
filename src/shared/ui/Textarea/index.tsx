'use client';

import { forwardRef, TextareaHTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

const textareaClasses =
  'block w-full px-3 py-2 rounded-md border border-border bg-surface text-text outline-none focus:border-primary';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return <textarea ref={ref} className={cn(textareaClasses, className)} {...props} />;
});
Textarea.displayName = 'Textarea';

export { Textarea };

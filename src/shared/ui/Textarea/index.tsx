'use client';

import { forwardRef, TextareaHTMLAttributes } from 'react';

const textareaClasses =
  'block w-full px-3 py-2 rounded-md border border-border bg-surface text-text outline-none focus:border-primary';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  const classNames = [textareaClasses, className].filter(Boolean).join(' ');

  return <textarea ref={ref} className={classNames} {...props} />;
});
Textarea.displayName = 'Textarea';

export { Textarea };

'use client';

import { forwardRef, InputHTMLAttributes } from 'react';

const inputClasses =
  'w-full px-3 py-2 rounded-md border border-border bg-surface text-text focus:outline-none focus:border-primary';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  const classNames = [inputClasses, className].filter(Boolean).join(' ');

  return <input ref={ref} className={classNames} {...props} />;
});
Input.displayName = 'Input';

export { Input };

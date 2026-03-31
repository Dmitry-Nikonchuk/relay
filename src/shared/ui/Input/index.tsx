'use client';

import { forwardRef, InputHTMLAttributes, KeyboardEvent } from 'react';

const inputClasses =
  'w-full px-3 py-2 rounded-md border border-border bg-surface text-text focus:outline-none focus:border-primary';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  onPressEnter?: (e: KeyboardEvent<HTMLInputElement>) => void;
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, onKeyDown, onPressEnter, ...props }, ref) => {
    const classNames = [inputClasses, className].filter(Boolean).join(' ');

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(e);
      if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
        onPressEnter?.(e);
      }
    };

    return <input ref={ref} className={classNames} {...props} onKeyDown={handleKeyDown} />;
  },
);
Input.displayName = 'Input';

export { Input };

'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

import { getButtonClassName, type ButtonSize, type ButtonVariant } from './buttonClasses';

export type ClientButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const ClientButton = forwardRef<HTMLButtonElement, ClientButtonProps>(function ClientButton(
  { className, variant = 'primary', size = 'md', children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        getButtonClassName({ variant, size, className }),
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60',
      )}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
});

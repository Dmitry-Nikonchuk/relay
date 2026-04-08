'use client';

import Link from 'next/link';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'light' | 'nav' | 'footer' | 'danger';

const variantClass: Record<ButtonVariant, string> = {
  primary: 'landing-btn-primary',
  secondary: 'landing-btn-secondary',
  light: 'landing-btn-light',
  nav: 'landing-nav-link',
  footer: 'landing-footer-link',
  danger:
    'inline-flex items-center justify-center rounded-xl border border-red-600 bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-px hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:cursor-not-allowed disabled:opacity-60',
};

const sizeClass = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-5 py-3 text-sm',
  lg: 'px-5 py-3 text-sm sm:px-6 sm:text-base',
} as const;

export type ButtonSize = keyof typeof sizeClass;

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'href'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders `next/link` with the same surface styles as a button. */
  href?: string;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', href, children, disabled, ...rest },
  ref,
) {
  const isTextVariant = variant === 'nav' || variant === 'footer';
  const usesSizePadding = !isTextVariant && variant !== 'danger';
  const classes = cn(variantClass[variant], usesSizePadding && sizeClass[size], className);

  if (href !== undefined) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button
      ref={ref}
      className={cn(
        classes,
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60',
      )}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
});

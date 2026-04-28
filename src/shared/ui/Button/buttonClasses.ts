import { cn } from '@/shared/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'light' | 'nav' | 'footer' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variantClass: Record<ButtonVariant, string> = {
  primary: 'landing-btn-primary',
  secondary: 'landing-btn-secondary',
  light: 'landing-btn-light',
  nav: 'landing-nav-link',
  footer: 'landing-footer-link',
  danger:
    'inline-flex items-center justify-center rounded-xl border border-red-600 bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-px hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:cursor-not-allowed disabled:opacity-60',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-5 py-3 text-sm',
  lg: 'px-5 py-3 text-sm sm:px-6 sm:text-base',
};

export function getButtonClassName(params: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const variant = params.variant ?? 'primary';
  const size = params.size ?? 'md';
  const isTextVariant = variant === 'nav' || variant === 'footer';
  const usesSizePadding = !isTextVariant && variant !== 'danger';

  return cn(variantClass[variant], usesSizePadding && sizeClass[size], params.className);
}

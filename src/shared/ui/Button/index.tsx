'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

const buttonClasses =
  'inline-flex items-center justify-center px-4 py-2 rounded-md border border-border bg-primary text-white font-medium transition-all duration-150 ease-out hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, ...props }, ref) => {
  const classNames = [buttonClasses, className].filter(Boolean).join(' ');

  return <button ref={ref} className={classNames} {...props} />;
});
Button.displayName = 'Button';

import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

import { getButtonClassName, type ButtonSize, type ButtonVariant } from './buttonClasses';

export type ButtonProps = Omit<ComponentProps<typeof Link>, 'className'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
};

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...rest
}: ButtonProps) {
  // Keep navigational buttons server-friendly so public pages do not inherit a client boundary.
  return (
    <Link {...rest} className={getButtonClassName({ variant, size, className })}>
      {children}
    </Link>
  );
}

export type { ButtonSize, ButtonVariant } from './buttonClasses';
export { ClientButton } from './ClientButton';

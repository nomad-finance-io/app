import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './button.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'ghost';
  size?: 'md' | 'lg';
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: ButtonProps) {
  const composedClass = `btn btn--${variant} btn--${size}${
    className ? ' ' + className : ''
  }`;
  return (
    <button {...rest} className={composedClass}>
      {children}
    </button>
  );
}

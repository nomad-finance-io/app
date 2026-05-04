import type { HTMLAttributes, ReactNode } from 'react';
import './surface.css';

interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'glass' | 'flat';
}

export function Surface({
  children,
  variant = 'glass',
  className,
  ...rest
}: SurfaceProps) {
  return (
    <div
      className={`surface surface--${variant}${className ? ' ' + className : ''}`}
      {...rest}
    >
      {children}
    </div>
  );
}

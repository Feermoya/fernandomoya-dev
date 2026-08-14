import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/panel/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 min-h-11 px-4',
  {
    variants: {
      variant: {
        default: 'bg-[var(--panel-accent)] text-[var(--panel-accent-fg)]',
        outline:
          'border border-[var(--panel-border)] bg-[var(--panel-surface)] text-[var(--panel-text)]',
        ghost: 'bg-transparent text-[var(--panel-text)]',
        secondary: 'bg-[var(--muted)] text-[var(--panel-text)]',
      },
      size: {
        default: 'min-h-11 px-4',
        sm: 'min-h-9 px-3 text-xs',
        icon: 'h-11 w-11 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
  ),
);
Button.displayName = 'Button';

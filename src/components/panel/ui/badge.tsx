import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/panel/cn';

const badgeVariants = cva('panel-badge', {
  variants: {
    variant: {
      default: 'panel-badge--muted',
      upcoming: 'panel-badge--upcoming',
      due_today: 'panel-badge--due_today',
      overdue: 'panel-badge--overdue',
      paid: 'panel-badge--paid',
      muted: 'panel-badge--muted',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

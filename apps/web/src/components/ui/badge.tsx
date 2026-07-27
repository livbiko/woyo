import { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', {
  variants: {
    variant: {
      verified: 'bg-primary-light text-primary-dark',
      open: 'bg-primary-light text-primary-dark',
      closed: 'bg-gray-100 text-gray-500',
      neutral: 'bg-secondary-light text-secondary-dark',
    },
  },
  defaultVariants: { variant: 'neutral' },
});

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

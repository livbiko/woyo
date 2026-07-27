import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 placeholder:text-gray-400',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

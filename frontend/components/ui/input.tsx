import { forwardRef, InputHTMLAttributes } from 'react';

import { cn } from '@/components/ui/cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-400',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

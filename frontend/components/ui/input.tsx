import { forwardRef, InputHTMLAttributes } from 'react';

import { cn } from '@/components/ui/cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'theme-field h-11 w-full rounded-xl border px-4 text-sm outline-none focus:border-[rgba(47,111,237,0.4)] focus:ring-2 focus:ring-[rgba(47,111,237,0.14)]',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

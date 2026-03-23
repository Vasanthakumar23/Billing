import { forwardRef, InputHTMLAttributes } from 'react';

import { cn } from '@/components/ui/cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'h-12 w-full rounded-2xl border border-[rgba(151,164,187,0.14)] bg-[rgba(255,255,255,0.04)] px-4 text-sm text-white outline-none placeholder:text-[#6f7b92] focus:border-[rgba(79,124,255,0.45)] focus:ring-2 focus:ring-[rgba(79,124,255,0.18)]',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

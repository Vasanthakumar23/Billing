import { HTMLAttributes } from 'react';

import { cn } from '@/components/ui/cn';

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-[rgba(151,164,187,0.14)] bg-[rgba(255,255,255,0.04)] px-3 py-1 text-xs font-semibold text-[#d7deee]',
        className
      )}
      {...props}
    />
  );
}

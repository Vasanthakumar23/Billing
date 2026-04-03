import { HTMLAttributes } from 'react';

import { cn } from '@/components/ui/cn';

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-[var(--panel-line)] bg-[var(--surface-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--text)]',
        className
      )}
      {...props}
    />
  );
}

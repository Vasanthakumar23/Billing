import { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/components/ui/cn';

export function Table({ className, ...props }: ComponentPropsWithoutRef<'table'>) {
  return <table className={cn('w-full text-sm text-[var(--text)]', className)} {...props} />;
}

export function THead({ className, ...props }: ComponentPropsWithoutRef<'thead'>) {
  return <thead className={cn('sticky top-0 z-10 bg-[var(--table-head-bg)] backdrop-blur', className)} {...props} />;
}

export function TH({ className, ...props }: ComponentPropsWithoutRef<'th'>) {
  return (
    <th
      className={cn(
        'border-b border-[rgba(148,163,184,0.12)] px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]',
        className
      )}
      {...props}
    />
  );
}

export function TBody({ className, ...props }: ComponentPropsWithoutRef<'tbody'>) {
  return <tbody className={cn('', className)} {...props} />;
}

export function TD({ className, ...props }: ComponentPropsWithoutRef<'td'>) {
  return <td className={cn('border-b border-[rgba(148,163,184,0.08)] px-5 py-3.5 align-top text-[var(--text)]', className)} {...props} />;
}

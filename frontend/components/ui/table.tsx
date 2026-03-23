import { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/components/ui/cn';

export function Table({ className, ...props }: ComponentPropsWithoutRef<'table'>) {
  return <table className={cn('w-full text-sm text-[#e7edf9]', className)} {...props} />;
}

export function THead({ className, ...props }: ComponentPropsWithoutRef<'thead'>) {
  return <thead className={cn('sticky top-0 z-10 bg-[rgba(8,11,18,0.96)] backdrop-blur', className)} {...props} />;
}

export function TH({ className, ...props }: ComponentPropsWithoutRef<'th'>) {
  return (
    <th
      className={cn(
        'border-b border-[rgba(151,164,187,0.1)] px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[#7f8da9]',
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
  return <td className={cn('border-b border-[rgba(151,164,187,0.08)] px-5 py-4 align-top text-[#e7edf9]', className)} {...props} />;
}

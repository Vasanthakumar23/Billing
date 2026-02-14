import { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/components/ui/cn';

export function Table({ className, ...props }: ComponentPropsWithoutRef<'table'>) {
  return <table className={cn('w-full text-sm', className)} {...props} />;
}

export function THead({ className, ...props }: ComponentPropsWithoutRef<'thead'>) {
  return <thead className={cn('sticky top-0 bg-white z-10', className)} {...props} />;
}

export function TH({ className, ...props }: ComponentPropsWithoutRef<'th'>) {
  return <th className={cn('text-left font-medium text-slate-600 p-2 border-b border-slate-100', className)} {...props} />;
}

export function TBody({ className, ...props }: ComponentPropsWithoutRef<'tbody'>) {
  return <tbody className={cn('', className)} {...props} />;
}

export function TD({ className, ...props }: ComponentPropsWithoutRef<'td'>) {
  return <td className={cn('p-2 border-b border-slate-50 align-top', className)} {...props} />;
}

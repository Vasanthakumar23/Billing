import { ButtonHTMLAttributes } from 'react';

import { cn } from '@/components/ui/cn';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
  size?: 'sm' | 'md';
};

export function Button({ className, variant = 'default', size = 'md', ...props }: Props) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50 disabled:pointer-events-none',
        size === 'sm' ? 'h-8 px-3' : 'h-9 px-4',
        variant === 'default' && 'bg-slate-900 text-white hover:bg-slate-800',
        variant === 'secondary' && 'bg-slate-100 text-slate-900 hover:bg-slate-200',
        variant === 'outline' && 'border border-slate-200 bg-white hover:bg-slate-50',
        variant === 'destructive' && 'bg-red-600 text-white hover:bg-red-500',
        className
      )}
      {...props}
    />
  );
}


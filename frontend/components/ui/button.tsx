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
        'inline-flex items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[rgba(47,111,237,0.28)] disabled:pointer-events-none disabled:opacity-65',
        size === 'sm' ? 'h-9 px-3.5' : 'h-11 px-4',
        variant === 'default' &&
          'border-transparent bg-[#2f6fed] text-white shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:bg-[#255ed1]',
        variant === 'secondary' &&
          'border-[rgba(47,111,237,0.14)] bg-[rgba(47,111,237,0.1)] text-[var(--heading)] hover:bg-[rgba(47,111,237,0.16)]',
        variant === 'outline' &&
          'border-[var(--field-border)] bg-[var(--field-bg)] text-[var(--text)] hover:border-[var(--panel-line)] hover:bg-[var(--surface-subtle)]',
        variant === 'destructive' &&
          'border-transparent bg-[#c24157] text-white shadow-[0_8px_18px_rgba(15,23,42,0.16)] hover:bg-[#a93449]',
        className
      )}
      {...props}
    />
  );
}

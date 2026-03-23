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
        'inline-flex items-center justify-center gap-2 rounded-2xl border text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[rgba(79,124,255,0.45)] disabled:pointer-events-none disabled:opacity-65',
        size === 'sm' ? 'h-10 px-4' : 'h-12 px-5',
        variant === 'default' &&
          'border-transparent bg-[linear-gradient(135deg,#4f7cff_0%,#315bd3_100%)] text-white shadow-[0_18px_44px_rgba(49,91,211,0.35)] hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(49,91,211,0.42)]',
        variant === 'secondary' &&
          'border-[rgba(79,124,255,0.16)] bg-[rgba(79,124,255,0.12)] text-[#dbe6ff] hover:bg-[rgba(79,124,255,0.2)]',
        variant === 'outline' &&
          'border-[rgba(151,164,187,0.16)] bg-[rgba(255,255,255,0.02)] text-[#f4f7fb] hover:border-[rgba(79,124,255,0.28)] hover:bg-[rgba(79,124,255,0.1)]',
        variant === 'destructive' &&
          'border-transparent bg-[linear-gradient(135deg,#ff6c7f_0%,#d93a56_100%)] text-white shadow-[0_18px_40px_rgba(217,58,86,0.28)] hover:-translate-y-0.5',
        className
      )}
      {...props}
    />
  );
}

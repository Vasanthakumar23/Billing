import { cn } from '@/components/ui/cn';

export function Spinner({ className }: { className?: string }) {
  return <div className={cn('h-4 w-4 animate-spin rounded-full border-2 border-[var(--panel-line)] border-t-[var(--accent)]', className)} />;
}

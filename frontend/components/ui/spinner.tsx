import { cn } from '@/components/ui/cn';

export function Spinner({ className }: { className?: string }) {
  return <div className={cn('h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900', className)} />;
}


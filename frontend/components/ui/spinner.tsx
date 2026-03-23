import { cn } from '@/components/ui/cn';

export function Spinner({ className }: { className?: string }) {
  return <div className={cn('h-4 w-4 animate-spin rounded-full border-2 border-[rgba(151,164,187,0.18)] border-t-[#4f7cff]', className)} />;
}

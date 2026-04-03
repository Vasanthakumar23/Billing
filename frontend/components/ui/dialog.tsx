'use client';

import { ReactNode } from 'react';

import { cn } from '@/components/ui/cn';

export function Dialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (v: boolean) => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-[rgba(3,6,11,0.72)] backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className="absolute inset-0 overflow-y-auto p-4">
        <div className="flex min-h-full items-start justify-center py-6">{children}</div>
      </div>
    </div>
  );
}

export function DialogContent({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('glass-panel my-auto w-full max-w-xl rounded-[28px]', className)}>{children}</div>;
}

export function DialogHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('border-b border-[rgba(151,164,187,0.1)] px-6 py-5', className)}>{children}</div>;
}

export function DialogTitle({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('text-xl font-semibold text-white', className)}>{children}</div>;
}

export function DialogBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('px-6 py-5', className)}>{children}</div>;
}

export function DialogFooter({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('flex justify-end gap-3 border-t border-[rgba(151,164,187,0.1)] px-6 py-5', className)}>{children}</div>;
}

'use client';

import { ReactNode } from 'react';

import { cn } from '@/components/ui/cn';

export function Dialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (v: boolean) => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/30" onClick={() => onOpenChange(false)} />
      <div className="absolute inset-0 flex items-center justify-center p-4">{children}</div>
    </div>
  );
}

export function DialogContent({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-sm', className)}>{children}</div>;
}

export function DialogHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('p-4 border-b border-slate-100', className)}>{children}</div>;
}

export function DialogTitle({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('text-sm font-semibold text-slate-900', className)}>{children}</div>;
}

export function DialogBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('p-4', className)}>{children}</div>;
}

export function DialogFooter({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('p-4 border-t border-slate-100 flex justify-end gap-2', className)}>{children}</div>;
}


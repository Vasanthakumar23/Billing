'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

import { cn } from '@/components/ui/cn';

const nav = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/students', label: 'Students' },
  { href: '/collect', label: 'Collect' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/reports', label: 'Reports' },
  { href: '/settings', label: 'Settings' }
];

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="text-sm font-semibold text-slate-900">Billing Admin</div>
          <div className="flex items-center gap-4">
            <nav className="flex gap-4">
              {nav.map((item) => (
                <Link key={item.href} href={item.href} className={cn('text-sm text-slate-600 hover:text-slate-900')}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.assign('/login');
              }}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 text-lg font-semibold text-slate-900">{title}</div>
        {children}
      </main>
    </div>
  );
}

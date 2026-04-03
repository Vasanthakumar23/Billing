'use client';

import {
  Banknote,
  BarChart3,
  CreditCard,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Moon,
  ReceiptText,
  Settings,
  SunMedium,
  UsersRound
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/students', label: 'Students', icon: UsersRound },
  { href: '/collect', label: 'Collect', icon: Banknote },
  { href: '/expenses', label: 'Expenses', icon: HandCoins },
  { href: '/transactions', label: 'Transactions', icon: ReceiptText },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings }
];

export function AppShell({
  children,
  title,
  subtitle,
  action
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = window.localStorage.getItem('billing-theme');
    const nextTheme = saved === 'light' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    window.localStorage.setItem('billing-theme', nextTheme);
  }

  return (
    <div className="min-h-screen lg:grid lg:h-screen lg:grid-cols-[290px_minmax(0,1fr)] lg:overflow-hidden">
      <aside className="flex flex-col border-b border-[rgba(151,164,187,0.1)] bg-[rgba(8,11,18,0.75)] px-5 py-5 backdrop-blur lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-4 px-2 py-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#4f7cff_0%,#315bd3_100%)] shadow-[0_16px_40px_rgba(49,91,211,0.3)]">
            <CreditCard className="h-7 w-7 text-white" />
          </div>
          <div>
            <div className="font-[var(--font-display)] text-2xl font-bold text-white">BillFlow</div>
            <div className="text-sm text-[#8ea0bf]">Institution Billing Suite</div>
          </div>
        </div>

        <nav className="mt-8 grid gap-2">
          {nav.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200',
                  active
                    ? 'bg-[linear-gradient(135deg,rgba(79,124,255,0.88)_0%,rgba(49,91,211,0.76)_100%)] text-white shadow-[0_18px_40px_rgba(49,91,211,0.18)]'
                    : 'text-[#a5b3cc] hover:bg-[rgba(255,255,255,0.03)] hover:text-white'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 border-t border-[rgba(151,164,187,0.1)] pt-5 lg:mt-auto lg:pt-6">
          <Button variant="outline" className="mb-3 w-full justify-start" onClick={toggleTheme}>
            {theme === 'dark' ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.assign('/login');
            }}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      <main className="px-4 py-5 sm:px-6 lg:h-screen lg:overflow-y-auto lg:px-8 lg:py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="section-label">Operations</div>
              <h1 className="mt-2 text-4xl font-bold tracking-[-0.04em] text-white sm:text-5xl">{title}</h1>
              {subtitle ? <p className="mt-3 max-w-2xl text-lg text-[#91a1bc]">{subtitle}</p> : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>

          <div>{children}</div>
        </div>
      </main>
    </div>
  );
}

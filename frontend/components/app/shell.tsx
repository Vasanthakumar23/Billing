'use client';

import {
  Banknote,
  BarChart3,
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
      <aside className="theme-sidebar flex flex-col border-b px-5 py-5 backdrop-blur lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="px-2 py-3">
          <div>
            <div className="theme-sidebar-brand font-[var(--font-display)] text-xl font-semibold">MYACADEMY</div>
            <div className="theme-sidebar-subtitle text-sm">Institution Billing Suite</div>
          </div>
        </div>

        <nav className="mt-8 grid gap-1.5">
          {nav.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'theme-nav-item flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors duration-150',
                  active
                    ? 'theme-nav-item-active shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                    : 'border-transparent'
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 border-t border-[var(--sidebar-border)] pt-5 lg:mt-auto lg:pt-6">
          <Button variant="secondary" className="mb-3 w-full justify-start text-white [&_svg]:text-[#dbe6ff]" onClick={toggleTheme}>
            {theme === 'dark' ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-[#172033] [&_svg]:text-[#172033]"
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
              <h1 className="theme-heading text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{title}</h1>
              {subtitle ? <p className="mt-3 max-w-2xl text-base text-[#91a1bc]">{subtitle}</p> : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>

          <div>{children}</div>
        </div>
      </main>
    </div>
  );
}

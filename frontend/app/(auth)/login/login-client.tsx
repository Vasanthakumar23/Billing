'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toaster';

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

type FormValues = z.infer<typeof schema>;

export function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: 'admin', password: 'admin123' }
  });

  const login = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail ?? 'Login failed');
      }
      return res.json();
    },
    onSuccess: () => {
      const next = params.get('next') || '/dashboard';
      router.replace(next);
    },
    onError: (e) => toast({ title: 'Login failed', description: String(e) })
  });

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,124,255,0.26),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(57,194,255,0.16),transparent_20%)]" />
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="glass-panel rounded-[32px] p-8 lg:p-10">
          <div className="section-label">Institution Billing</div>
          <h1 className="mt-4 text-5xl font-bold text-white">Professional fee operations, without the spreadsheet chaos.</h1>
          <p className="mt-5 max-w-xl text-lg text-[#91a1bc]">
            Manage student dues, cycle-based collections, receipts, and reporting from one secure admin workspace.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-[rgba(151,164,187,0.12)] bg-[rgba(255,255,255,0.03)] p-5">
              <div className="text-sm font-semibold text-white">Cycle-aware billing</div>
              <div className="mt-2 text-sm text-[#91a1bc]">Monthly, bi-monthly, or tri-monthly collection rules with one-off overrides.</div>
            </div>
            <div className="rounded-[24px] border border-[rgba(151,164,187,0.12)] bg-[rgba(255,255,255,0.03)] p-5">
              <div className="text-sm font-semibold text-white">Receipt-driven workflow</div>
              <div className="mt-2 text-sm text-[#91a1bc]">Print, download, and revisit receipts from dashboard, students, and transactions.</div>
            </div>
          </div>
        </div>

        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-[rgba(79,124,255,0.16)] bg-[rgba(79,124,255,0.12)] p-3">
                <ShieldCheck className="h-5 w-5 text-[#9cb4ff]" />
              </div>
              <div>
                <CardTitle>Admin Sign In</CardTitle>
                <div className="mt-1 text-sm text-[#91a1bc]">Use your institution billing credentials</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={form.handleSubmit((v) => login.mutate(v))}>
              <div>
                <div className="mb-2 text-sm font-medium text-[#dbe6ff]">Username</div>
                <Input {...form.register('username')} />
              </div>
              <div>
                <div className="mb-2 text-sm font-medium text-[#dbe6ff]">Password</div>
                <Input type="password" {...form.register('password')} />
              </div>
              <Button className="w-full" type="submit" disabled={login.isPending}>
                {login.isPending ? <Spinner className="mr-2" /> : null}
                Sign in
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
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

export default function LoginPage() {
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
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={form.handleSubmit((v) => login.mutate(v))}>
            <div>
              <div className="mb-1 text-sm text-slate-600">Username</div>
              <Input {...form.register('username')} />
              {form.formState.errors.username ? (
                <div className="mt-1 text-xs text-red-600">{form.formState.errors.username.message}</div>
              ) : null}
            </div>
            <div>
              <div className="mb-1 text-sm text-slate-600">Password</div>
              <Input type="password" {...form.register('password')} />
              {form.formState.errors.password ? (
                <div className="mt-1 text-xs text-red-600">{form.formState.errors.password.message}</div>
              ) : null}
            </div>
            <Button className="w-full" type="submit" disabled={login.isPending}>
              {login.isPending ? <Spinner className="mr-2" /> : null}
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


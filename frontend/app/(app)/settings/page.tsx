'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AppShell } from '@/components/app/shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toaster';
import { apiFetch } from '@/lib/api';

type BillingSettings = {
  cycle_mode: 'monthly' | 'bi_monthly' | 'tri_monthly';
  cycle_months: number;
  updated_at: string;
};

const choices: Array<{ value: BillingSettings['cycle_mode']; label: string; description: string }> = [
  { value: 'monthly', label: 'Monthly', description: 'Collect one month of the stored monthly fee.' },
  { value: 'bi_monthly', label: 'Bi-Monthly', description: 'Collect two months at a time.' },
  { value: 'tri_monthly', label: 'Tri-Monthly', description: 'Collect three months at a time. Default mode.' }
];

export default function SettingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ['billingSettings'],
    queryFn: () => apiFetch<BillingSettings>('/settings/billing')
  });

  const update = useMutation({
    mutationFn: (cycle_mode: BillingSettings['cycle_mode']) =>
      apiFetch<BillingSettings>('/settings/billing', { method: 'PATCH', body: JSON.stringify({ cycle_mode }) }),
    onSuccess: () => {
      toast({ title: 'Billing cycle updated' });
      qc.invalidateQueries({ queryKey: ['billingSettings'] });
    },
    onError: (e) => toast({ title: 'Update failed', description: String(e) })
  });

  return (
    <AppShell title="Settings">
      <Card>
        <CardHeader>
          <CardTitle>Payment Cycle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Spinner /> Loading
            </div>
          ) : settings.isError ? (
            <div className="text-sm text-red-600">Failed to load billing settings</div>
          ) : (
            <>
              <div className="text-sm text-slate-600">
                Student fees remain stored as a single-month amount. The selected cycle controls how many months are billed in one transaction.
              </div>
              <div className="grid gap-3">
                {choices.map((choice) => {
                  const active = settings.data?.cycle_mode === choice.value;
                  return (
                    <button
                      key={choice.value}
                      type="button"
                      className={`rounded-md border p-4 text-left ${
                        active ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
                      }`}
                      onClick={() => update.mutate(choice.value)}
                      disabled={update.isPending}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">{choice.label}</div>
                          <div className="text-sm text-slate-600">{choice.description}</div>
                        </div>
                        {active ? <div className="text-xs font-medium text-slate-900">Active</div> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between rounded-md border border-slate-200 p-3">
                <div className="text-sm text-slate-600">
                  Last updated: {settings.data ? new Date(settings.data.updated_at).toLocaleString() : '-'}
                </div>
                <Button
                  variant="outline"
                  onClick={() => settings.refetch()}
                  disabled={settings.isFetching || update.isPending}
                >
                  Refresh
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

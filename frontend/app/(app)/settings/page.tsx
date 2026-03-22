'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AppShell } from '@/components/app/shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'upsert' | 'create_only'>('upsert');
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

  const importStudents = useMutation({
    mutationFn: async () => {
      if (!importFile) throw new Error('Please choose an .xlsx file');
      const fd = new FormData();
      fd.append('file', importFile);

      const res = await fetch(`/api/backend/students/import?mode=${encodeURIComponent(importMode)}`, {
        method: 'POST',
        body: fd
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail ? JSON.stringify(data.detail) : 'Import failed');
      return data as { created: number; updated: number; fee_updated: number };
    },
    onSuccess: (data) => {
      toast({
        title: 'Import completed',
        description: `Created: ${data.created}, Updated: ${data.updated}, Fee updated: ${data.fee_updated}`
      });
      setImportOpen(false);
      setImportFile(null);
      qc.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (e) => toast({ title: 'Import failed', description: String(e) })
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

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Student Import</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-slate-600">
            Upload student Excel sheets from the admin settings area only.
          </div>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            Upload Student Excel
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={importOpen}
        onOpenChange={(v) => {
          setImportOpen(v);
          if (!v) {
            setImportFile(null);
            setImportMode('upsert');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Students (Excel)</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-3">
              <div className="text-sm text-slate-600">
                Upload an <span className="font-medium text-slate-900">.xlsx</span> with columns like{' '}
                <span className="font-medium text-slate-900">rollno/student_code</span>,{' '}
                <span className="font-medium text-slate-900">name</span>,{' '}
                <span className="font-medium text-slate-900">std/class</span>,{' '}
                <span className="font-medium text-slate-900">section</span>, and{' '}
                <span className="font-medium text-slate-900">fees</span>.
              </div>

              <div>
                <div className="mb-1 text-sm text-slate-600">Mode</div>
                <select
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value as 'upsert' | 'create_only')}
                >
                  <option value="upsert">Upsert (create or update)</option>
                  <option value="create_only">Create only (error if exists)</option>
                </select>
              </div>

              <div>
                <div className="mb-1 text-sm text-slate-600">Excel file</div>
                <input
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => importStudents.mutate()} disabled={importStudents.isPending || !importFile}>
              {importStudents.isPending ? <Spinner className="mr-2" /> : null}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

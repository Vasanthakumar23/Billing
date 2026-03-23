'use client';

import { useState } from 'react';
import { AlertTriangle, Settings2, Upload } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AppShell } from '@/components/app/shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toaster';
import { apiFetch } from '@/lib/api';

type BillingSettings = {
  cycle_mode: 'monthly' | 'bi_monthly' | 'tri_monthly';
  cycle_months: number;
  updated_at: string;
};

type DatabaseResetResult = {
  students_deleted: number;
  payments_deleted: number;
  billing_periods_deleted: number;
  fee_records_deleted: number;
  receipt_sequence_reset: boolean;
  billing_cycle_reset_to_default: boolean;
};

const RESET_CONFIRMATION_TEXT = 'DELETE ALL DATA';

const choices: Array<{ value: BillingSettings['cycle_mode']; label: string; description: string }> = [
  { value: 'monthly', label: 'Monthly', description: 'Collect one month of the stored monthly fee.' },
  { value: 'bi_monthly', label: 'Bi-Monthly', description: 'Collect two months at a time.' },
  { value: 'tri_monthly', label: 'Tri-Monthly', description: 'Collect three months at a time. Default mode.' }
];

export default function SettingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [importOpen, setImportOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'upsert' | 'create_only'>('upsert');
  const [resetText, setResetText] = useState('');
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

  const resetDatabase = useMutation({
    mutationFn: () =>
      apiFetch<DatabaseResetResult>('/settings/database/reset', {
        method: 'POST',
        body: JSON.stringify({ confirmation_text: resetText })
      }),
    onSuccess: (data) => {
      toast({
        title: 'Operational data deleted',
        description: `Students: ${data.students_deleted}, Payments: ${data.payments_deleted}, Billing periods: ${data.billing_periods_deleted}`
      });
      setResetOpen(false);
      setResetText('');
      qc.invalidateQueries();
    },
    onError: (e) => toast({ title: 'Delete failed', description: String(e) })
  });

  return (
    <AppShell title="Admin Settings" subtitle="Configure institution-wide billing defaults and manage secure operational imports.">
      <Card>
        <CardHeader>
          <CardTitle>Payment Cycle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-[#91a1bc]">
              <Spinner /> Loading
            </div>
          ) : settings.isError ? (
            <div className="text-sm text-rose-300">Failed to load billing settings</div>
          ) : (
            <>
              <div className="text-sm text-[#91a1bc]">
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
                        active
                          ? 'border-[rgba(79,124,255,0.28)] bg-[rgba(79,124,255,0.14)]'
                          : 'border-[rgba(151,164,187,0.12)] bg-[rgba(255,255,255,0.03)]'
                      }`}
                      onClick={() => update.mutate(choice.value)}
                      disabled={update.isPending}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 font-semibold text-white">
                            <Settings2 className="h-4 w-4 text-[#4f7cff]" />
                            {choice.label}
                          </div>
                          <div className="mt-1 text-sm text-[#91a1bc]">{choice.description}</div>
                        </div>
                        {active ? <div className="text-xs font-medium text-[#c8d8ff]">Active</div> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-[rgba(151,164,187,0.12)] bg-[rgba(255,255,255,0.03)] p-4">
                <div className="text-sm text-[#91a1bc]">
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
          <div className="rounded-2xl border border-[rgba(151,164,187,0.12)] bg-[rgba(255,255,255,0.03)] p-4">
            <div className="text-sm font-semibold text-white">Where to import students</div>
            <div className="mt-2 text-sm text-[#91a1bc]">
              Student list import is available here in <span className="font-medium text-white">Admin Settings - Student Import</span>.
              Use the button below to upload the Excel file.
            </div>
          </div>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Upload Student Excel
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-[rgba(255,108,127,0.24)] bg-[rgba(217,58,86,0.08)] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <AlertTriangle className="h-4 w-4 text-[#ff8a9c]" />
              Delete all operational data
            </div>
            <div className="mt-2 text-sm text-[#91a1bc]">
              This clears all students, fees, payments, and month-tracking records from the database. The admin login is preserved,
              the receipt sequence is reset, and the billing cycle is returned to Tri-Monthly.
            </div>
            <div className="mt-2 text-sm text-[#91a1bc]">
              After deletion, use <span className="font-medium text-white">Student Import</span> above to insert a fresh student list.
            </div>
          </div>
          <Button variant="destructive" onClick={() => setResetOpen(true)}>
            <AlertTriangle className="h-4 w-4" />
            Delete Entire Database Data
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
              <div className="text-sm text-[#91a1bc]">
                Upload an <span className="font-medium text-white">.xlsx</span> with columns like{' '}
                <span className="font-medium text-white">rollno/student_code</span>,{' '}
                <span className="font-medium text-white">name</span>,{' '}
                <span className="font-medium text-white">std/class</span>,{' '}
                <span className="font-medium text-white">section</span>, and{' '}
                <span className="font-medium text-white">fees</span>.
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-[#dbe6ff]">Mode</div>
                <select
                  className="h-12 w-full rounded-2xl border border-[rgba(151,164,187,0.14)] bg-[rgba(255,255,255,0.04)] px-4 text-sm text-white outline-none"
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value as 'upsert' | 'create_only')}
                >
                  <option value="upsert">Upsert (create or update)</option>
                  <option value="create_only">Create only (error if exists)</option>
                </select>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-[#dbe6ff]">Excel file</div>
                <input
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="block w-full text-sm text-[#91a1bc] file:mr-4 file:rounded-2xl file:border-0 file:bg-[rgba(79,124,255,0.16)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
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

      <Dialog
        open={resetOpen}
        onOpenChange={(v) => {
          setResetOpen(v);
          if (!v) {
            setResetText('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Entire Operational Dataset</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-3">
              <div className="rounded-2xl border border-[rgba(255,108,127,0.24)] bg-[rgba(217,58,86,0.08)] p-4 text-sm text-[#ffd9df]">
                This action permanently removes students, fees, payments, and billing periods. It cannot be undone.
              </div>
              <div className="text-sm text-[#91a1bc]">
                To confirm, type <span className="font-semibold text-white">{RESET_CONFIRMATION_TEXT}</span>.
              </div>
              <Input
                value={resetText}
                onChange={(e) => setResetText(e.target.value)}
                placeholder={RESET_CONFIRMATION_TEXT}
                autoComplete="off"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => resetDatabase.mutate()}
              disabled={resetDatabase.isPending || resetText.trim() !== RESET_CONFIRMATION_TEXT}
            >
              {resetDatabase.isPending ? <Spinner className="mr-2" /> : null}
              Delete Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

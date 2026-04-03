'use client';

import { useState } from 'react';
import { AlertTriangle, Upload } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { AppShell } from '@/components/app/shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toaster';
import { apiFetch } from '@/lib/api';

type ImportFieldKey =
  | 'serial_no'
  | 'student_code'
  | 'name'
  | 'class_name'
  | 'expected_fee'
  | 'payment_period'
  | 'joined_date';

type StudentImportMapping = Record<ImportFieldKey, string>;

type ImportPreview = {
  headers: string[];
  suggested_mapping: Partial<Record<ImportFieldKey, string | null>>;
  sample_rows: Array<Record<string, string | null>>;
  required_fields: ImportFieldKey[];
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
const IMPORT_FIELD_META: Array<{ key: ImportFieldKey; label: string; hint: string }> = [
  { key: 'serial_no', label: 'Serial No', hint: 'Map the source serial / row number column.' },
  { key: 'student_code', label: 'Roll No', hint: 'Student roll number or student code.' },
  { key: 'name', label: 'Student Name', hint: 'Full student name.' },
  { key: 'class_name', label: 'Class', hint: 'Class or standard. Values like 10-A will be split automatically.' },
  { key: 'expected_fee', label: 'Fee', hint: 'Single-month fee amount.' },
  { key: 'payment_period', label: 'Period', hint: 'Monthly, Quarterly, Half Yearly, or source label.' },
  { key: 'joined_date', label: 'Joined Date', hint: 'Student joining/admission date.' }
];
const MONTH_OPTIONS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
] as const;

export default function SettingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [importOpen, setImportOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'upsert' | 'create_only'>('upsert');
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importMapping, setImportMapping] = useState<StudentImportMapping>({
    serial_no: '',
    student_code: '',
    name: '',
    class_name: '',
    expected_fee: '',
    payment_period: '',
    joined_date: ''
  });
  const [importBatch, setImportBatch] = useState('');
  const [importBatchStartMonth, setImportBatchStartMonth] = useState('');
  const [resetText, setResetText] = useState('');
  const importStudents = useMutation({
    mutationFn: async () => {
      if (!importFile) throw new Error('Please choose an .xlsx file');
      if (!importBatch.trim()) throw new Error('Please enter the batch value');
      if (!importBatchStartMonth) throw new Error('Please choose the batch start month');
      const fd = new FormData();
      fd.append('file', importFile);
      fd.append('mapping_json', JSON.stringify(importMapping));
      fd.append('batch', importBatch.trim());
      fd.append('batch_start_month', importBatchStartMonth);

      const res = await fetch(`/api/backend/students/import?mode=${encodeURIComponent(importMode)}`, {
        method: 'POST',
        body: fd,
        credentials: 'include'
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
      setImportPreview(null);
      setImportBatch('');
      setImportBatchStartMonth('');
      setImportMapping({
        serial_no: '',
        student_code: '',
        name: '',
        class_name: '',
        expected_fee: '',
        payment_period: '',
        joined_date: ''
      });
      qc.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (e) => toast({ title: 'Import failed', description: String(e) })
  });

  const previewImport = useMutation({
    mutationFn: async () => {
      if (!importFile) throw new Error('Please choose an .xlsx file');
      const fd = new FormData();
      fd.append('file', importFile);
      const res = await fetch('/api/backend/students/import/preview', {
        method: 'POST',
        body: fd,
        credentials: 'include'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail ? JSON.stringify(data.detail) : 'Preview failed');
      return data as ImportPreview;
    },
    onSuccess: (data) => {
      setImportPreview(data);
      setImportMapping({
        serial_no: data.suggested_mapping.serial_no ?? '',
        student_code: data.suggested_mapping.student_code ?? '',
        name: data.suggested_mapping.name ?? '',
        class_name: data.suggested_mapping.class_name ?? '',
        expected_fee: data.suggested_mapping.expected_fee ?? '',
        payment_period: data.suggested_mapping.payment_period ?? '',
        joined_date: data.suggested_mapping.joined_date ?? ''
      });
    },
    onError: (e) => toast({ title: 'Preview failed', description: String(e) })
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

  const isImportReady =
    importPreview !== null &&
    IMPORT_FIELD_META.every((field) => importMapping[field.key].trim() !== '') &&
    /^\d{4}\s*-\s*\d{4}$/.test(importBatch.trim()) &&
    Boolean(importBatchStartMonth);

  return (
    <AppShell title="Admin Settings" subtitle="Manage student imports and controlled maintenance actions.">
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Student Import</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-[rgba(151,164,187,0.12)] bg-[rgba(255,255,255,0.03)] p-4">
            <div className="text-sm font-semibold text-white">Where to import students</div>
            <div className="mt-2 text-sm text-[#91a1bc]">
              Student list import is available here in <span className="font-medium text-white">Admin Settings - Student Import</span>.
              Each student's billing months are now derived from the imported <span className="font-medium text-white">Period</span> column.
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
              This clears all students, fees, payments, and month-tracking records from the database. The admin login is preserved
              and the receipt sequence is reset.
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
            setImportPreview(null);
            setImportBatch('');
            setImportBatchStartMonth('');
            setImportMapping({
              serial_no: '',
              student_code: '',
              name: '',
              class_name: '',
              expected_fee: '',
              payment_period: '',
              joined_date: ''
            });
          }
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Import Students (Excel)</DialogTitle>
          </DialogHeader>
          <DialogBody className="max-h-[78vh] overflow-y-auto">
            <div className="space-y-3">
              <div className="text-sm text-[#91a1bc]">
                Upload an <span className="font-medium text-white">.xlsx</span>, load its headers, map the required fields,
                enter the academic <span className="font-medium text-white">batch</span> and batch start month, then import into the database.
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
                  onChange={(e) => {
                    setImportFile(e.target.files?.[0] ?? null);
                    setImportPreview(null);
                  }}
                />
              </div>

              <div className="rounded-2xl border border-[rgba(151,164,187,0.12)] bg-[rgba(255,255,255,0.03)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">Column Mapping</div>
                    <div className="mt-1 text-sm text-[#91a1bc]">
                      Load the file headers first, then confirm which source column maps to each required app field.
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => previewImport.mutate()}
                    disabled={previewImport.isPending || !importFile}
                  >
                    {previewImport.isPending ? <Spinner className="mr-2" /> : null}
                    Load Headers
                  </Button>
                </div>

                {importPreview ? (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {IMPORT_FIELD_META.map((field) => (
                        <div key={field.key}>
                          <div className="mb-2 text-sm font-medium text-[#dbe6ff]">{field.label}</div>
                          <select
                            className="h-12 w-full rounded-2xl border border-[rgba(151,164,187,0.14)] bg-[rgba(255,255,255,0.04)] px-4 text-sm text-white outline-none"
                            value={importMapping[field.key]}
                            onChange={(e) =>
                              setImportMapping((current) => ({
                                ...current,
                                [field.key]: e.target.value
                              }))
                            }
                          >
                            <option value="">Select a column</option>
                            {importPreview.headers.map((header) => (
                              <option key={`${field.key}-${header}`} value={header}>
                                {header}
                              </option>
                            ))}
                          </select>
                          <div className="mt-1 text-xs text-[#91a1bc]">{field.hint}</div>
                        </div>
                      ))}
                    </div>

                    <div>
                      <div className="mb-2 text-sm font-medium text-[#dbe6ff]">Batch</div>
                      <Input
                        value={importBatch}
                        onChange={(e) => setImportBatch(e.target.value)}
                        placeholder="2026-2027"
                      />
                      <div className="mt-1 text-xs text-[#91a1bc]">
                        Enter the academic batch for all imported rows, for example <span className="text-white">2026-2027</span>.
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-sm font-medium text-[#dbe6ff]">Batch Start Month</div>
                      <select
                        className="h-12 w-full rounded-2xl border border-[rgba(151,164,187,0.14)] bg-[rgba(255,255,255,0.04)] px-4 text-sm text-white outline-none"
                        value={importBatchStartMonth}
                        onChange={(e) => setImportBatchStartMonth(e.target.value)}
                      >
                        <option value="">Select batch start month</option>
                        {MONTH_OPTIONS.map((month) => (
                          <option key={month} value={month}>
                            {month}
                          </option>
                        ))}
                      </select>
                      <div className="mt-1 text-xs text-[#91a1bc]">
                        Example: choose <span className="text-white">May</span> for an academic year running from May 2026 to April 2027.
                      </div>
                    </div>

                    {importPreview.sample_rows.length ? (
                      <div>
                        <div className="mb-2 text-sm font-medium text-[#dbe6ff]">Sample Preview</div>
                        <div className="max-h-72 overflow-auto rounded-2xl border border-[rgba(151,164,187,0.12)]">
                          <table className="min-w-full text-left text-sm text-[#dbe6ff]">
                            <thead className="bg-[rgba(255,255,255,0.03)] text-xs uppercase tracking-[0.18em] text-[#91a1bc]">
                              <tr>
                                {importPreview.headers.map((header) => (
                                  <th key={header} className="px-3 py-3 font-medium">
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {importPreview.sample_rows.map((row, rowIndex) => (
                                <tr key={rowIndex} className="border-t border-[rgba(151,164,187,0.08)]">
                                  {importPreview.headers.map((header) => (
                                    <td key={`${rowIndex}-${header}`} className="px-3 py-3 text-[#91a1bc]">
                                      {row[header] ?? '-'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => importStudents.mutate()} disabled={importStudents.isPending || !isImportReady}>
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

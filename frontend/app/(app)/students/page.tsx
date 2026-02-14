'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AppShell } from '@/components/app/shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Table, TBody, TD, TH, THead } from '@/components/ui/table';
import { useToast } from '@/components/ui/toaster';
import { apiFetch } from '@/lib/api';
import { debounce } from '@/lib/debounce';

type StudentListItem = {
  id: string;
  student_code: string;
  name: string;
  class_name: string | null;
  section: string | null;
  status: 'active' | 'inactive';
  expected_fee: string;
  paid_total: string;
  pending: string;
};

type ListResp = { items: StudentListItem[]; total: number };

const createSchema = z.object({
  student_code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  class_name: z.string().max(100).optional(),
  section: z.string().max(50).optional()
});
type CreateValues = z.infer<typeof createSchema>;

export default function StudentsPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'upsert' | 'create_only'>('upsert');

  const { toast } = useToast();
  const qc = useQueryClient();
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { student_code: '', name: '', class_name: '', section: '' }
  });

  const setDebouncedFn = useMemo(() => debounce((v: string) => setDebounced(v), 250), []);
  useEffect(() => setDebouncedFn(search), [search, setDebouncedFn]);

  const query = useQuery({
    queryKey: ['students', debounced, page, status],
    queryFn: () =>
      apiFetch<ListResp>(
        `/students/balances?search=${encodeURIComponent(debounced)}&status=${status === 'all' ? '' : status}&page=${page}&page_size=25`
      )
  });

  const createStudent = useMutation({
    mutationFn: (values: CreateValues) => apiFetch<StudentListItem>(`/students`, { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: () => {
      toast({ title: 'Student created' });
      setCreateOpen(false);
      form.reset();
      qc.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (e) => toast({ title: 'Create failed', description: String(e) })
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

  const totalPages = query.data ? Math.max(1, Math.ceil(query.data.total / 25)) : 1;

  return (
    <AppShell title="Students">
      <Card>
        <CardContent>
          <div className="flex items-center justify-between gap-3">
            <div className="w-full max-w-md">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID or name" />
            </div>
            <div className="flex items-center gap-2">
              <select
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as any);
                  setPage(1);
                }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="all">All</option>
              </select>
              <Button variant="outline" onClick={() => setCreateOpen(true)}>
                Add Student
              </Button>
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                Import Excel
              </Button>
              <Button variant="outline" onClick={() => window.location.assign('/api/backend/export/students.csv')}>
                Export CSV
              </Button>
            </div>
          </div>

          <div className="mt-4 overflow-auto rounded-md border border-slate-200">
            <Table>
              <THead>
                <tr>
                  <TH>Student ID</TH>
                  <TH>Name</TH>
                  <TH>Class</TH>
                  <TH>Expected</TH>
                  <TH>Paid</TH>
                  <TH>Pending</TH>
                  <TH>Status</TH>
                  <TH>Actions</TH>
                </tr>
              </THead>
              <TBody>
                {query.isLoading ? (
                  <tr>
                    <TD colSpan={8}>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Spinner /> Loading
                      </div>
                    </TD>
                  </tr>
                ) : query.isError ? (
                  <tr>
                    <TD colSpan={8} className="text-sm text-red-600">
                      Failed to load students
                    </TD>
                  </tr>
                ) : query.data?.items.length ? (
                  query.data.items.map((s) => (
                    <tr key={s.id}>
                      <TD>{s.student_code}</TD>
                      <TD>{s.name}</TD>
                      <TD>
                        {s.class_name ?? '-'} {s.section ?? ''}
                      </TD>
                      <TD>{s.expected_fee}</TD>
                      <TD>{s.paid_total}</TD>
                      <TD className={Number(s.pending) > 0 ? 'font-semibold' : ''}>{s.pending}</TD>
                      <TD>
                        <Badge className={s.status === 'active' ? '' : 'bg-slate-100 text-slate-500'}>{s.status}</Badge>
                      </TD>
                      <TD>
                        <Link href={`/students/${s.id}`} className="text-sm text-slate-900 underline">
                          View
                        </Link>
                      </TD>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <TD colSpan={8} className="text-sm text-slate-600">
                      No students
                    </TD>
                  </tr>
                )}
              </TBody>
            </Table>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Page {page} / {totalPages}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Prev
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Student</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => createStudent.mutate(v))}>
            <DialogBody>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <div className="mb-1 text-sm text-slate-600">Student ID</div>
                  <Input {...form.register('student_code')} />
                  {form.formState.errors.student_code ? (
                    <div className="mt-1 text-xs text-red-600">{form.formState.errors.student_code.message}</div>
                  ) : null}
                </div>
                <div>
                  <div className="mb-1 text-sm text-slate-600">Name</div>
                  <Input {...form.register('name')} />
                  {form.formState.errors.name ? (
                    <div className="mt-1 text-xs text-red-600">{form.formState.errors.name.message}</div>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="mb-1 text-sm text-slate-600">Class</div>
                    <Input {...form.register('class_name')} />
                  </div>
                  <div>
                    <div className="mb-1 text-sm text-slate-600">Section</div>
                    <Input {...form.register('section')} />
                  </div>
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createStudent.isPending}>
                {createStudent.isPending ? <Spinner className="mr-2" /> : null}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                Upload an <span className="font-medium text-slate-900">.xlsx</span> with columns like:{' '}
                <span className="font-medium text-slate-900">rollno/student_code</span>,{' '}
                <span className="font-medium text-slate-900">name</span>,{' '}
                <span className="font-medium text-slate-900">std/class</span>,{' '}
                <span className="font-medium text-slate-900">section</span>,{' '}
                <span className="font-medium text-slate-900">fees</span>.
              </div>

              <div>
                <div className="mb-1 text-sm text-slate-600">Mode</div>
                <select
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value as any)}
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

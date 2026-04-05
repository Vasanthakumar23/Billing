'use client';

import Link from 'next/link';
import { Download, Eye, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  last_paid_label: string | null;
  next_due_label: string | null;
  next_due_state: 'pending' | 'upcoming' | null;
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
  const [classCode, setClassCode] = useState('');
  const [debounced, setDebounced] = useState('');
  const [debouncedClassCode, setDebouncedClassCode] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [createOpen, setCreateOpen] = useState(false);

  const { toast } = useToast();
  const qc = useQueryClient();
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { student_code: '', name: '', class_name: '', section: '' }
  });

  const setDebouncedFn = useMemo(() => debounce((v: string) => setDebounced(v), 250), []);
  const setDebouncedClassFn = useMemo(() => debounce((v: string) => setDebouncedClassCode(v), 250), []);
  useEffect(() => setDebouncedFn(search), [search, setDebouncedFn]);
  useEffect(() => setDebouncedClassFn(classCode), [classCode, setDebouncedClassFn]);

  const query = useQuery({
    queryKey: ['students', debounced, debouncedClassCode, page, status],
    queryFn: () =>
      apiFetch<ListResp>(
        `/students/balances?search=${encodeURIComponent(debounced)}&class_code=${encodeURIComponent(
          debouncedClassCode
        )}&status=${status === 'all' ? '' : status}&page=${page}&page_size=25`
      )
  });

  const createStudent = useMutation({
    mutationFn: (values: CreateValues) => apiFetch<StudentListItem>('/students', { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: () => {
      toast({ title: 'Student created' });
      setCreateOpen(false);
      form.reset();
      qc.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (e) => toast({ title: 'Create failed', description: String(e) })
  });

  const totalPages = query.data ? Math.max(1, Math.ceil(query.data.total / 25)) : 1;

  return (
    <AppShell
      title="Student Management"
      subtitle="View, add, and manage student records, balances, and payment health from one place."
      action={
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => window.location.assign('/api/backend/export/students.csv')}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Student
          </Button>
        </div>
      }
    >
      <div className="page-grid">
        <div className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_150px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7484a1]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student name or roll number"
                className="h-11 rounded-xl border-[var(--panel-line)] bg-transparent pl-11"
              />
            </div>
            <Input
              value={classCode}
              onChange={(e) => {
                const next = e.target.value.replace(/\D/g, '').slice(0, 2);
                setClassCode(next);
                setPage(1);
              }}
              placeholder="Class code"
              className="h-11 rounded-xl border-[var(--panel-line)] bg-transparent"
            />
            <select
              className="theme-select h-11 rounded-xl px-4 text-sm outline-none"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as 'all' | 'active' | 'inactive');
                setPage(1);
              }}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>

        <Card className="shadow-none">
          <CardContent className="p-0">
            <div className="overflow-auto">
              <Table>
                <THead>
                  <tr>
                    <TH>Student</TH>
                    <TH>Class</TH>
                    <TH>Monthly Fee</TH>
                    <TH>Last Paid</TH>
                    <TH>Next Due</TH>
                    <TH>Pending</TH>
                    <TH>Status</TH>
                    <TH>Profile</TH>
                  </tr>
                </THead>
                <TBody>
                  {query.isLoading ? (
                    <tr>
                      <TD colSpan={8}>
                        <div className="flex items-center gap-2 text-sm text-[#91a1bc]">
                          <Spinner /> Loading
                        </div>
                      </TD>
                    </tr>
                  ) : query.isError ? (
                    <tr>
                      <TD colSpan={8} className="text-sm text-rose-300">
                        Failed to load students
                      </TD>
                    </tr>
                  ) : query.data?.items.length ? (
                    query.data.items.map((s) => (
                      <tr key={s.id}>
                        <TD>
                          <div className="theme-heading font-semibold">{s.name}</div>
                          <div className="mt-1 text-sm text-[#91a1bc]">{s.student_code}</div>
                        </TD>
                        <TD>{s.class_name ?? '-'} {s.section ?? ''}</TD>
                        <TD>{s.expected_fee}</TD>
                        <TD>
                          <div className="theme-heading text-sm font-medium">{s.last_paid_label ?? '-'}</div>
                        </TD>
                        <TD>
                          {s.next_due_label ? (
                            <div
                              className={
                                s.next_due_state === 'pending'
                                  ? 'theme-chip-warn inline-flex rounded-full px-3 py-1 text-sm font-medium'
                                  : 'theme-chip-neutral inline-flex rounded-full px-3 py-1 text-sm font-medium'
                              }
                            >
                              {s.next_due_label}
                            </div>
                          ) : (
                            <span className="text-sm text-[#91a1bc]">Fully paid</span>
                          )}
                        </TD>
                        <TD className={Number(s.pending) > 0 ? 'theme-heading font-semibold' : ''}>{s.pending}</TD>
                        <TD>
                          <Badge className={s.status === 'active' ? 'theme-chip-success' : 'theme-chip-neutral'}>
                            {s.status}
                          </Badge>
                        </TD>
                        <TD>
                          <Link
                            href={`/students/${s.id}`}
                            className="theme-chip-neutral inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--heading)]"
                            aria-label={`View profile for ${s.name}`}
                            title={`View profile for ${s.name}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </TD>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <TD colSpan={8} className="text-sm text-[#91a1bc]">
                        No students found
                      </TD>
                    </tr>
                  )}
                </TBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <div className="text-sm text-[#91a1bc]">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </Button>
            <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Student</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => createStudent.mutate(v))}>
            <DialogBody>
              <div className="grid gap-4">
                <div>
                  <div className="theme-heading mb-2 text-sm font-medium">Roll Number</div>
                  <Input {...form.register('student_code')} />
                </div>
                <div>
                  <div className="theme-heading mb-2 text-sm font-medium">Student Name</div>
                  <Input {...form.register('name')} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="theme-heading mb-2 text-sm font-medium">Class</div>
                    <Input {...form.register('class_name')} />
                  </div>
                  <div>
                    <div className="theme-heading mb-2 text-sm font-medium">Section</div>
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
                Create Student
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

'use client';

import Link from 'next/link';
import { Download, Plus, Search } from 'lucide-react';
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
        <Card>
          <CardContent className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_160px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7484a1]" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by roll number or student name"
                  className="pl-11"
                />
              </div>
              <select
                className="h-12 rounded-2xl border border-[rgba(151,164,187,0.14)] bg-[rgba(255,255,255,0.04)] px-4 text-sm text-white outline-none"
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
            <div className="text-sm text-[#91a1bc]">
              Showing <span className="font-semibold text-white">{query.data?.total ?? 0}</span> student records
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="overflow-auto rounded-[24px] border border-[rgba(151,164,187,0.08)] bg-[rgba(255,255,255,0.02)]">
              <Table>
                <THead>
                  <tr>
                    <TH>Student</TH>
                    <TH>Class</TH>
                    <TH>Monthly Fee</TH>
                    <TH>Paid</TH>
                    <TH>Pending</TH>
                    <TH>Status</TH>
                    <TH></TH>
                  </tr>
                </THead>
                <TBody>
                  {query.isLoading ? (
                    <tr>
                      <TD colSpan={7}>
                        <div className="flex items-center gap-2 text-sm text-[#91a1bc]">
                          <Spinner /> Loading
                        </div>
                      </TD>
                    </tr>
                  ) : query.isError ? (
                    <tr>
                      <TD colSpan={7} className="text-sm text-rose-300">
                        Failed to load students
                      </TD>
                    </tr>
                  ) : query.data?.items.length ? (
                    query.data.items.map((s) => (
                      <tr key={s.id}>
                        <TD>
                          <div className="font-semibold text-white">{s.name}</div>
                          <div className="mt-1 text-sm text-[#91a1bc]">{s.student_code}</div>
                        </TD>
                        <TD>{s.class_name ?? '-'} {s.section ?? ''}</TD>
                        <TD>{s.expected_fee}</TD>
                        <TD>{s.paid_total}</TD>
                        <TD className={Number(s.pending) > 0 ? 'font-semibold text-white' : ''}>{s.pending}</TD>
                        <TD>
                          <Badge className={s.status === 'active' ? 'bg-[rgba(46,216,143,0.16)] text-[#48e69b]' : 'bg-[rgba(151,164,187,0.08)] text-[#9aa8c2]'}>
                            {s.status}
                          </Badge>
                        </TD>
                        <TD>
                          <Link href={`/students/${s.id}`} className="font-semibold text-[#a7c1ff] transition-colors hover:text-white">
                            View profile
                          </Link>
                        </TD>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <TD colSpan={7} className="text-sm text-[#91a1bc]">
                        No students found
                      </TD>
                    </tr>
                  )}
                </TBody>
              </Table>
            </div>

            <div className="mt-5 flex items-center justify-between">
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
          </CardContent>
        </Card>
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
                  <div className="mb-2 text-sm font-medium text-[#dbe6ff]">Roll Number</div>
                  <Input {...form.register('student_code')} />
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium text-[#dbe6ff]">Student Name</div>
                  <Input {...form.register('name')} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="mb-2 text-sm font-medium text-[#dbe6ff]">Class</div>
                    <Input {...form.register('class_name')} />
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-medium text-[#dbe6ff]">Section</div>
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

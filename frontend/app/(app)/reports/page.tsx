'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, Filter, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { AppShell } from '@/components/app/shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Table, TBody, TD, TH, THead } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';
import { debounce } from '@/lib/debounce';

type MonthlyStudent = {
  student_id: string;
  student_code: string;
  name: string;
  class_name: string | null;
  section: string | null;
  payment_period: string;
  monthly_fee: string;
  month: string;
  month_label: string;
  is_paid: boolean;
  receipt_no?: string | null;
};

function toMonthDate(value: string) {
  return `${value}-01`;
}

function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export default function ReportsPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [paymentState, setPaymentState] = useState<'paid' | 'unpaid' | 'all'>('unpaid');
  const [search, setSearch] = useState('');
  const [classCode, setClassCode] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debouncedClassCode, setDebouncedClassCode] = useState('');

  const setDebounced = useMemo(() => debounce((value: string) => setDebouncedSearch(value), 250), []);
  const setDebouncedClass = useMemo(() => debounce((value: string) => setDebouncedClassCode(value), 250), []);
  useEffect(() => {
    setDebounced(search);
  }, [search, setDebounced]);
  useEffect(() => {
    setDebouncedClass(classCode);
  }, [classCode, setDebouncedClass]);

  const students = useQuery({
    queryKey: ['monthlyStudentReport', month, paymentState, debouncedSearch, debouncedClassCode],
    queryFn: () =>
      apiFetch<MonthlyStudent[]>(
        `/reports/monthly-students?month=${encodeURIComponent(toMonthDate(month))}&payment_state=${paymentState}&search=${encodeURIComponent(
          debouncedSearch
        )}&class_code=${encodeURIComponent(debouncedClassCode)}`
      )
  });

  const paidCount = students.data?.filter((item) => item.is_paid).length ?? 0;
  const unpaidCount = students.data?.filter((item) => !item.is_paid).length ?? 0;
  const exportHref = `/api/backend/export/monthly-students.csv?month=${encodeURIComponent(toMonthDate(month))}&payment_state=${encodeURIComponent(
    paymentState
  )}&search=${encodeURIComponent(debouncedSearch)}&class_code=${encodeURIComponent(debouncedClassCode)}`;

  return (
    <AppShell
      title="Reports & Analytics"
      subtitle="Track which students paid and which students are still unpaid for a selected month."
      action={
        <Button onClick={() => window.location.assign(exportHref)}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      }
    >
      <div className="page-grid">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Report Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-[220px_220px_180px_minmax(0,1fr)_150px_150px]">
            <div className="theme-subtle-surface rounded-2xl px-4 py-3">
              <div className="theme-heading mb-2 flex items-center gap-2 text-sm font-semibold">
                <Filter className="h-4 w-4 text-[#4f7cff]" />
                Month
              </div>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
            <div className="theme-subtle-surface rounded-2xl px-4 py-3">
              <div className="theme-heading mb-2 text-sm font-semibold">Status</div>
              <select
                className="theme-select h-12 w-full rounded-2xl px-4 text-sm outline-none"
                value={paymentState}
                onChange={(e) => setPaymentState(e.target.value as 'paid' | 'unpaid' | 'all')}
              >
                <option value="unpaid">Not Paid</option>
                <option value="paid">Paid</option>
                <option value="all">All</option>
              </select>
            </div>
            <div className="theme-subtle-surface rounded-2xl px-4 py-3">
              <div className="theme-heading mb-2 text-sm font-semibold">Class ID</div>
              <Input
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.replace(/\D/g, '').slice(0, 2))}
                placeholder="05"
              />
            </div>
            <div className="theme-subtle-surface rounded-2xl px-4 py-3">
              <div className="theme-heading mb-2 text-sm font-semibold">Search</div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7484a1]" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Student name, roll no, class"
                  className="pl-11"
                />
              </div>
            </div>
            <div className="theme-subtle-surface rounded-2xl px-4 py-3">
              <div className="theme-heading mb-2 text-sm font-semibold">Paid</div>
              <div className="theme-heading text-3xl font-bold">{paidCount}</div>
            </div>
            <div className="theme-subtle-surface rounded-2xl px-4 py-3">
              <div className="theme-heading mb-2 text-sm font-semibold">Not Paid</div>
              <div className="theme-heading text-3xl font-bold">{unpaidCount}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Student Month Status</CardTitle>
              <div className="mt-1 text-sm text-[#91a1bc]">
                Showing {paymentState === 'all' ? 'all students' : paymentState === 'paid' ? 'paid students' : 'students not paid'} for {monthLabel(month)}
              </div>
            </div>
            <Badge className="theme-chip-neutral">{monthLabel(month)}</Badge>
          </CardHeader>
          <CardContent>
            <div className="theme-table-wrap overflow-auto rounded-[24px]">
              <Table>
                <THead>
                  <tr>
                    <TH>Student ID</TH>
                    <TH>Name</TH>
                    <TH>Class</TH>
                    <TH>Period</TH>
                    <TH>Monthly Fee</TH>
                    <TH>Month</TH>
                    <TH>Status</TH>
                    <TH>Receipt</TH>
                  </tr>
                </THead>
                <TBody>
                  {students.isLoading ? (
                    <tr>
                      <TD colSpan={8}>
                        <div className="flex items-center gap-2 text-sm text-[#91a1bc]">
                          <Spinner /> Loading
                        </div>
                      </TD>
                    </tr>
                  ) : students.isError ? (
                    <tr>
                      <TD colSpan={8} className="text-sm text-rose-300">
                        Failed to load monthly report
                      </TD>
                    </tr>
                  ) : students.data?.length ? (
                    students.data.map((student) => (
                      <tr key={student.student_id}>
                        <TD>{student.student_code}</TD>
                        <TD className="theme-heading font-semibold">{student.name}</TD>
                        <TD>{student.class_name ?? '-'}{student.section ? ` ${student.section}` : ''}</TD>
                        <TD>{student.payment_period}</TD>
                        <TD>{student.monthly_fee}</TD>
                        <TD>{student.month_label}</TD>
                        <TD>
                          <Badge
                            className={
                              student.is_paid
                                ? 'theme-chip-success'
                                : 'theme-chip-warn'
                            }
                          >
                            {student.is_paid ? 'Paid' : 'Not Paid'}
                          </Badge>
                        </TD>
                        <TD>{student.receipt_no ?? '-'}</TD>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <TD colSpan={8} className="text-sm text-[#91a1bc]">
                        No students found for the selected filters
                      </TD>
                    </tr>
                  )}
                </TBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

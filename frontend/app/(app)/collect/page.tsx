'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CreditCard } from 'lucide-react';

import { AppShell } from '@/components/app/shell';
import { Receipt, type ReceiptData } from '@/components/app/receipt';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toaster';
import { apiFetch } from '@/lib/api';

type Student = {
  id: string;
  student_code: string;
  name: string;
  status: 'active' | 'inactive';
};

type BillingMonth = {
  month: string;
  label: string;
  is_paid: boolean;
  receipt_no?: string | null;
};

type BillingOverview = {
  student_id: string;
  monthly_fee: string;
  cycle_label: string;
  cycle_months: number;
  payable_amount: string;
  batch?: string | null;
  batch_start_month: number;
  batch_start_label: string;
  batch_end_label: string;
  next_unpaid_month: string;
  next_unpaid_label: string;
  pending_months: BillingMonth[];
  months: BillingMonth[];
};

const schema = z.object({
  student_id: z.string().uuid().optional().or(z.literal('')),
  student_code: z.string().min(1, 'Roll number is required'),
  billing_start_month: z.string().optional(),
  mode: z.enum(['cash', 'upi', 'bank']),
  reference_no: z.string().optional(),
  notes: z.string().optional()
});
type FormValues = z.infer<typeof schema>;

export default function CollectPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const studentId = params.get('student_id') ?? '';
  const rollNoFromQuery = params.get('student_code') ?? '';
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [studentCodeLookup, setStudentCodeLookup] = useState(rollNoFromQuery);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [visibleCycleCount, setVisibleCycleCount] = useState(1);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      student_id: studentId,
      student_code: rollNoFromQuery,
      billing_start_month: '',
      mode: 'cash',
      reference_no: '',
      notes: ''
    }
  });

  useEffect(() => {
    form.setValue('student_id', studentId);
    if (rollNoFromQuery) {
      form.setValue('student_code', rollNoFromQuery);
      setStudentCodeLookup(rollNoFromQuery);
    }
  }, [form, rollNoFromQuery, studentId]);

  const student = useQuery({
    queryKey: ['studentByCode', studentCodeLookup],
    enabled: Boolean(studentCodeLookup),
    queryFn: async () => {
      const data = await apiFetch<{ items: Student[]; total: number }>(
        `/students?search=${encodeURIComponent(studentCodeLookup)}&page=1&page_size=10`
      );
      const exact = data.items.find((item) => item.student_code.toLowerCase() === studentCodeLookup.toLowerCase());
      if (!exact) throw new Error('Student not found for this roll number');
      form.setValue('student_id', exact.id);
      form.setValue('student_code', exact.student_code);
      return exact;
    }
  });
  const studentById = useQuery({
    queryKey: ['studentById', studentId],
    enabled: Boolean(studentId) && !Boolean(studentCodeLookup),
    queryFn: async () => {
      const data = await apiFetch<Student>(`/students/${studentId}`);
      form.setValue('student_id', data.id);
      form.setValue('student_code', data.student_code);
      setStudentCodeLookup(data.student_code);
      return data;
    }
  });
  const selectedStudent = student.data ?? studentById.data;
  const isStudentLoading = student.isLoading || studentById.isLoading;
  const isStudentError = student.isError || studentById.isError;

  const overview = useQuery({
    queryKey: ['studentBillingOverview', selectedStudent?.id],
    enabled: Boolean(selectedStudent?.id),
    queryFn: () => apiFetch<BillingOverview>(`/students/${selectedStudent?.id}/billing-overview`)
  });

  const selectedCycleMonths = overview.data?.cycle_months ?? 1;
  const payableAmount = overview.data ? (Number(overview.data.monthly_fee) * selectedMonths.length).toFixed(2) : '0.00';

  const carryForwardCount = useMemo(() => {
    if (!overview.data) return 0;
    const batchStart = overview.data.months[0]?.month;
    const firstPending = overview.data.pending_months[0]?.month;
    if (!batchStart || !firstPending) return 0;
    const batchStartDate = new Date(batchStart);
    const firstPendingDate = new Date(firstPending);
    const pendingOffset =
      (firstPendingDate.getUTCFullYear() - batchStartDate.getUTCFullYear()) * 12 +
      (firstPendingDate.getUTCMonth() - batchStartDate.getUTCMonth());
    return (selectedCycleMonths - (pendingOffset % selectedCycleMonths)) % selectedCycleMonths;
  }, [overview.data, selectedCycleMonths]);

  const visiblePendingMonths = useMemo(() => {
    if (!overview.data) return [];
    const visibleCount = carryForwardCount + visibleCycleCount * selectedCycleMonths;
    return overview.data.pending_months.slice(0, visibleCount);
  }, [carryForwardCount, overview.data, selectedCycleMonths, visibleCycleCount]);

  const carryForwardMonths = useMemo(
    () => visiblePendingMonths.slice(0, carryForwardCount),
    [carryForwardCount, visiblePendingMonths]
  );
  const cycleMonths = useMemo(
    () => visiblePendingMonths.slice(carryForwardCount),
    [carryForwardCount, visiblePendingMonths]
  );

  useEffect(() => {
    if (!visiblePendingMonths.length) {
      setSelectedMonths([]);
      form.setValue('billing_start_month', '');
      return;
    }
    const initial = visiblePendingMonths.map((month) => month.month);
    setSelectedMonths(initial);
    setVisibleCycleCount(1);
    form.setValue('billing_start_month', initial[0] ?? '');
  }, [form, overview.data?.student_id]);

  const canLoadMoreCycles = Boolean(
    overview.data && visiblePendingMonths.length < overview.data.pending_months.length
  );

  function toggleMonth(month: string) {
    setSelectedMonths((current) => {
      const exists = current.includes(month);
      const next = exists ? current.filter((item) => item !== month) : [...current, month];
      const sorted = [...next].sort();
      form.setValue('billing_start_month', sorted[0] ?? '');
      return sorted;
    });
  }

  const createPayment = useMutation({
    mutationFn: (values: FormValues) =>
      apiFetch<ReceiptData>('/payments', {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          billing_start_month: selectedMonths[0] ?? null,
          selected_months: selectedMonths
        })
      }),
    onSuccess: (data) => {
      toast({ title: 'Payment recorded', description: `Receipt: ${data.receipt_no}` });
      setReceipt(data);
    },
    onError: (e) => toast({ title: 'Failed', description: String(e) })
  });

  return (
    <AppShell
      title={`Collect Payment${overview.data?.batch ? ` (${overview.data.batch})` : ''}`}
      subtitle="Verify the student by roll number, inspect pending months, and record payment using each student's imported period."
      action={
        <Button variant="outline" onClick={() => selectedStudent?.id && window.location.assign(`/students/${selectedStudent.id}`)}>
          View Student Profile
        </Button>
      }
    >
      {receipt ? (
        <div className="max-w-xl">
          <Receipt
            data={receipt}
            onClose={() => {
              setReceipt(null);
              router.push(`/students/${receipt.student_id}`);
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardHeader>
              <CardTitle>Student Billing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {studentCodeLookup ? (
                isStudentLoading || overview.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-[#91a1bc]">
                    <Spinner /> Loading
                  </div>
                ) : isStudentError || overview.isError ? (
                  <div className="text-sm text-rose-300">Failed to load student billing data</div>
                ) : (
                  <>
                    <div className="theme-subtle-surface flex items-center justify-between gap-3 rounded-[24px] p-4">
                      <div>
                        <div className="theme-heading font-semibold">
                          {selectedStudent?.name} ({selectedStudent?.student_code})
                        </div>
                        <div className="text-sm text-[#91a1bc]">Roll number confirms which student this payment belongs to</div>
                      </div>
                      <Badge className={selectedStudent?.status === 'active' ? 'theme-chip-success' : 'theme-chip-neutral'}>
                        {selectedStudent?.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="theme-subtle-surface rounded-[24px] p-4">
                        <div className="text-xs text-[#7484a1]">Monthly Fee</div>
                        <div className="theme-heading mt-2 font-semibold">{overview.data?.monthly_fee}</div>
                      </div>
                      <div className="theme-subtle-surface rounded-[24px] p-4">
                        <div className="text-xs text-[#7484a1]">Payable Now</div>
                        <div className="theme-heading mt-2 font-semibold">{payableAmount}</div>
                      </div>
                    </div>

                    <div className="theme-subtle-surface rounded-[24px] p-4">
                        <div className="text-xs text-[#7484a1]">Next unpaid month</div>
                        <div className="theme-heading mt-2 font-semibold">{overview.data?.next_unpaid_label}</div>
                      </div>

                    <div>
                      <div className="theme-heading mb-2 text-sm font-medium">Month status</div>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
                        {overview.data?.months.map((month) => (
                          <div
                            key={month.month}
                            className={`rounded-md border p-2 text-sm ${
                              month.is_paid
                                ? 'theme-chip-success border-transparent'
                                : 'theme-subtle-surface text-[var(--heading)]'
                            }`}
                          >
                            <div className="font-medium">{month.label}</div>
                            <div className="text-xs">{month.is_paid ? `Paid${month.receipt_no ? ` (${month.receipt_no})` : ''}` : 'Pending'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )
              ) : (
                'Open a student and click Collect Payment'
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[var(--accent)]" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={form.handleSubmit((v) => createPayment.mutate(v))}>
                <div>
                  <div className="theme-heading mb-2 text-sm font-medium">Student roll no</div>
                  <div className="flex gap-2">
                    <Input
                      value={form.watch('student_code')}
                      onChange={(e) => form.setValue('student_code', e.target.value)}
                      placeholder="S001"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStudentCodeLookup(form.getValues('student_code').trim())}
                    >
                      Load
                    </Button>
                  </div>
                  {isStudentError ? <div className="mt-1 text-xs text-rose-300">Invalid roll number</div> : null}
                </div>
                <div>
                  {visiblePendingMonths.length ? (
                    <div className="space-y-3">
                      {carryForwardMonths.length ? (
                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--chip-warn-text)]">Carry Forward Pending</div>
                          <div className="flex flex-wrap gap-2">
                            {carryForwardMonths.map((month) => {
                              const active = selectedMonths.includes(month.month);
                              return (
                                <button
                                  key={month.month}
                                  type="button"
                                  onClick={() => toggleMonth(month.month)}
                                  className={`min-w-[120px] rounded-2xl border px-3 py-3 text-left text-sm transition-colors ${
                                    active
                                      ? 'theme-chip-warn border-[rgba(183,121,31,0.22)] text-[var(--heading)]'
                                      : 'theme-chip-warn border-[rgba(183,121,31,0.14)]'
                                  }`}
                                >
                                  <div className="font-medium">{month.label}</div>
                                  <div className="mt-1 text-xs">{active ? 'Selected pending' : 'Pending'}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}

                      {cycleMonths.length ? (
                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                            Current Cycle - {selectedCycleMonths}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {cycleMonths.map((month) => {
                              const active = selectedMonths.includes(month.month);
                              return (
                                <button
                                  key={month.month}
                                  type="button"
                                  onClick={() => toggleMonth(month.month)}
                                  className={`min-w-[120px] rounded-2xl border px-3 py-3 text-left text-sm transition-colors ${
                                    active
                                      ? 'border-[rgba(47,111,237,0.24)] bg-[var(--accent-soft)] text-[var(--heading)]'
                                      : 'theme-subtle-surface text-[var(--muted)]'
                                  }`}
                                >
                                  <div className="font-medium">{month.label}</div>
                                  <div className="mt-1 text-xs">{active ? 'Selected cycle' : 'Click to include'}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-sm text-[#91a1bc]">No pending months available.</div>
                  )}
                  {canLoadMoreCycles ? (
                    <div className="mt-3">
                      <Button type="button" variant="outline" size="sm" onClick={() => setVisibleCycleCount((value) => value + 1)}>
                        Load More
                      </Button>
                    </div>
                  ) : null}
                </div>
                <div>
                  <div className="theme-heading mb-2 text-sm font-medium">Mode</div>
                  <select
                    className="theme-select h-12 w-full rounded-2xl px-4 text-sm outline-none"
                    {...form.register('mode')}
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank">Bank</option>
                  </select>
                </div>
                <div>
                  <div className="theme-heading mb-2 text-sm font-medium">Reference</div>
                  <Input {...form.register('reference_no')} />
                </div>
                <div>
                  <div className="theme-heading mb-2 text-sm font-medium">Notes</div>
                  <Input {...form.register('notes')} />
                </div>
                <Button type="submit" disabled={createPayment.isPending || !selectedStudent?.id || selectedMonths.length === 0}>
                  {createPayment.isPending ? <Spinner className="mr-2" /> : null}
                  Pay {payableAmount}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

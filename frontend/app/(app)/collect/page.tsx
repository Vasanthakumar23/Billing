'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CreditCard, Settings } from 'lucide-react';

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
  cycle_mode: 'monthly' | 'bi_monthly' | 'tri_monthly';
  cycle_months: number;
  payable_amount: string;
  next_unpaid_month: string;
  next_unpaid_label: string;
  pending_months: BillingMonth[];
  months: BillingMonth[];
};

const cycleLabels = {
  monthly: 'Monthly',
  bi_monthly: 'Bi-Monthly',
  tri_monthly: 'Tri-Monthly'
} as const;

const cycleMonths = {
  monthly: 1,
  bi_monthly: 2,
  tri_monthly: 3
} as const;

const schema = z.object({
  student_id: z.string().uuid().optional().or(z.literal('')),
  student_code: z.string().min(1, 'Roll number is required'),
  billing_start_month: z.string().min(1),
  cycle_mode: z.enum(['monthly', 'bi_monthly', 'tri_monthly']).optional(),
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
  const [overrideOpen, setOverrideOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      student_id: studentId,
      student_code: rollNoFromQuery,
      billing_start_month: '',
      cycle_mode: undefined,
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

  const selectedCycleMode = form.watch('cycle_mode') || overview.data?.cycle_mode || 'tri_monthly';
  const selectedCycleMonths = cycleMonths[selectedCycleMode];
  const payableAmount = overview.data ? (Number(overview.data.monthly_fee) * selectedCycleMonths).toFixed(2) : '0.00';

  const validOptions = useMemo(() => {
    if (!overview.data) return [];
    return overview.data.months.filter((month, index, months) => {
      if (month.is_paid) return false;
      const span = months.slice(index, index + selectedCycleMonths);
      return span.length === selectedCycleMonths && span.every((item) => !item.is_paid);
    });
  }, [overview.data, selectedCycleMonths]);

  useEffect(() => {
    if (!overview.data || validOptions.length === 0) return;
    const preferred = validOptions.find((option) => option.month === overview.data?.next_unpaid_month) ?? validOptions[0];
    form.setValue('billing_start_month', preferred.month);
  }, [form, overview.data, validOptions]);

  const createPayment = useMutation({
    mutationFn: (values: FormValues) => apiFetch<ReceiptData>('/payments', { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: (data) => {
      toast({ title: 'Payment recorded', description: `Receipt: ${data.receipt_no}` });
      setReceipt(data);
    },
    onError: (e) => toast({ title: 'Failed', description: String(e) })
  });

  return (
    <AppShell
      title="Collect Payment"
      subtitle="Verify the student by roll number, inspect pending months, and record a cycle-aware payment with optional overrides."
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
                    <div className="flex items-center justify-between gap-3 rounded-[24px] border border-[rgba(151,164,187,0.12)] bg-[rgba(255,255,255,0.03)] p-4">
                      <div>
                        <div className="font-semibold text-white">
                          {selectedStudent?.name} ({selectedStudent?.student_code})
                        </div>
                        <div className="text-sm text-[#91a1bc]">Roll number confirms which student this payment belongs to</div>
                      </div>
                      <Badge className={selectedStudent?.status === 'active' ? 'bg-[rgba(46,216,143,0.16)] text-[#48e69b]' : 'bg-[rgba(151,164,187,0.08)] text-[#9aa8c2]'}>
                        {selectedStudent?.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="rounded-[24px] border border-[rgba(151,164,187,0.12)] bg-[rgba(255,255,255,0.03)] p-4">
                        <div className="text-xs text-[#7484a1]">Cycle</div>
                        <div className="mt-2 font-semibold text-white">{cycleLabels[selectedCycleMode]}</div>
                      </div>
                      <div className="rounded-[24px] border border-[rgba(151,164,187,0.12)] bg-[rgba(255,255,255,0.03)] p-4">
                        <div className="text-xs text-[#7484a1]">Monthly Fee</div>
                        <div className="mt-2 font-semibold text-white">{overview.data?.monthly_fee}</div>
                      </div>
                      <div className="rounded-[24px] border border-[rgba(151,164,187,0.12)] bg-[rgba(255,255,255,0.03)] p-4">
                        <div className="text-xs text-[#7484a1]">Payable Now</div>
                        <div className="mt-2 font-semibold text-white">{payableAmount}</div>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-[rgba(151,164,187,0.12)] bg-[rgba(255,255,255,0.03)] p-4">
                      <div className="text-xs text-[#7484a1]">Next unpaid month</div>
                      <div className="mt-2 font-semibold text-white">{overview.data?.next_unpaid_label}</div>
                    </div>

                    <div>
                      <div className="mb-2 text-sm font-medium text-white">Pending months</div>
                      <div className="flex flex-wrap gap-2">
                        {overview.data?.pending_months.length ? (
                          overview.data.pending_months.map((month) => (
                            <Badge key={month.month} className="bg-[rgba(255,177,74,0.14)] text-[#ffbf6e]">
                              {month.label}
                            </Badge>
                          ))
                        ) : (
                          <div className="text-sm text-[#91a1bc]">No pending months in the current window.</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-sm font-medium text-white">Month status</div>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
                        {overview.data?.months.map((month) => (
                          <div
                            key={month.month}
                            className={`rounded-md border p-2 text-sm ${
                              month.is_paid
                                ? 'border-[rgba(46,216,143,0.18)] bg-[rgba(46,216,143,0.12)] text-[#70edb4]'
                                : 'border-[rgba(151,164,187,0.12)] bg-[rgba(255,255,255,0.03)] text-[#dbe6ff]'
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
                <CreditCard className="h-5 w-5 text-[#9cb4ff]" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={form.handleSubmit((v) => createPayment.mutate(v))}>
                <div>
                  <div className="mb-2 text-sm font-medium text-[#dbe6ff]">Student roll no</div>
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
                  <div className="mb-2 flex items-center justify-between text-sm text-[#dbe6ff]">
                    <span>Payment cycle</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => setOverrideOpen((v) => !v)}>
                      <Settings className="mr-2 h-4 w-4" />
                      {overrideOpen ? 'Hide' : 'Override'}
                    </Button>
                  </div>
                  <div className="rounded-[24px] border border-[rgba(151,164,187,0.12)] bg-[rgba(255,255,255,0.03)] p-4 text-sm text-[#91a1bc]">
                    Default: {overview.data ? cycleLabels[overview.data.cycle_mode] : 'Tri-Monthly'}
                  </div>
                  {overrideOpen ? (
                    <select
                      className="mt-2 h-12 w-full rounded-2xl border border-[rgba(151,164,187,0.14)] bg-[rgba(255,255,255,0.04)] px-4 text-sm text-white outline-none"
                      value={form.watch('cycle_mode') ?? overview.data?.cycle_mode ?? 'tri_monthly'}
                      onChange={(e) =>
                        form.setValue('cycle_mode', e.target.value as FormValues['cycle_mode'])
                      }
                    >
                      <option value="monthly">Monthly</option>
                      <option value="bi_monthly">Bi-Monthly</option>
                      <option value="tri_monthly">Tri-Monthly</option>
                    </select>
                  ) : null}
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium text-[#dbe6ff]">Start month</div>
                  <select
                    className="h-12 w-full rounded-2xl border border-[rgba(151,164,187,0.14)] bg-[rgba(255,255,255,0.04)] px-4 text-sm text-white outline-none"
                    {...form.register('billing_start_month')}
                  >
                    {validOptions.length ? (
                      validOptions.map((option) => (
                        <option key={option.month} value={option.month}>
                          {option.label}
                        </option>
                      ))
                    ) : (
                      <option value="">No eligible month</option>
                    )}
                  </select>
                  <div className="mt-2 text-xs text-[#7484a1]">
                    Already-paid months are excluded. A start month is only available if the full selected cycle window is unpaid.
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium text-[#dbe6ff]">Mode</div>
                  <select
                    className="h-12 w-full rounded-2xl border border-[rgba(151,164,187,0.14)] bg-[rgba(255,255,255,0.04)] px-4 text-sm text-white outline-none"
                    {...form.register('mode')}
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank">Bank</option>
                  </select>
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium text-[#dbe6ff]">Reference</div>
                  <Input {...form.register('reference_no')} />
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium text-[#dbe6ff]">Notes</div>
                  <Input {...form.register('notes')} />
                </div>
                <Button type="submit" disabled={createPayment.isPending || !selectedStudent?.id || validOptions.length === 0}>
                  {createPayment.isPending ? <Spinner className="mr-2" /> : null}
                  Charge {payableAmount}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

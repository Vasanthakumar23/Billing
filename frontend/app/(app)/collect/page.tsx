'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

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

const schema = z.object({
  student_id: z.string().uuid(),
  billing_start_month: z.string().min(1),
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
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { student_id: studentId, billing_start_month: '', mode: 'cash', reference_no: '', notes: '' }
  });

  useEffect(() => {
    form.setValue('student_id', studentId);
  }, [form, studentId]);

  const student = useQuery({
    queryKey: ['student', studentId],
    enabled: Boolean(studentId),
    queryFn: () => apiFetch<Student>(`/students/${studentId}`)
  });

  const overview = useQuery({
    queryKey: ['studentBillingOverview', studentId],
    enabled: Boolean(studentId),
    queryFn: () => apiFetch<BillingOverview>(`/students/${studentId}/billing-overview`)
  });

  const validOptions = useMemo(() => {
    if (!overview.data) return [];
    return overview.data.months.filter((month, index, months) => {
      if (month.is_paid) return false;
      const span = months.slice(index, index + overview.data.cycle_months);
      return span.length === overview.data.cycle_months && span.every((item) => !item.is_paid);
    });
  }, [overview.data]);

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
    <AppShell title="Collect Payment">
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Student Billing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {studentId ? (
                student.isLoading || overview.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Spinner /> Loading
                  </div>
                ) : student.isError || overview.isError ? (
                  <div className="text-sm text-red-600">Failed to load student billing data</div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3">
                      <div>
                        <div className="font-semibold text-slate-900">
                          {student.data?.name} ({student.data?.student_code})
                        </div>
                        <div className="text-sm text-slate-600">Monthly fee stored per student</div>
                      </div>
                      <Badge className={student.data?.status === 'active' ? '' : 'bg-slate-100 text-slate-500'}>
                        {student.data?.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="rounded-md border border-slate-200 p-3">
                        <div className="text-xs text-slate-500">Cycle</div>
                        <div className="font-semibold text-slate-900">{overview.data?.cycle_mode.replaceAll('_', ' ')}</div>
                      </div>
                      <div className="rounded-md border border-slate-200 p-3">
                        <div className="text-xs text-slate-500">Monthly Fee</div>
                        <div className="font-semibold text-slate-900">{overview.data?.monthly_fee}</div>
                      </div>
                      <div className="rounded-md border border-slate-200 p-3">
                        <div className="text-xs text-slate-500">Payable Now</div>
                        <div className="font-semibold text-slate-900">{overview.data?.payable_amount}</div>
                      </div>
                    </div>

                    <div className="rounded-md border border-slate-200 p-3">
                      <div className="text-xs text-slate-500">Next unpaid month</div>
                      <div className="font-semibold text-slate-900">{overview.data?.next_unpaid_label}</div>
                    </div>

                    <div>
                      <div className="mb-2 text-sm font-medium text-slate-900">Pending months</div>
                      <div className="flex flex-wrap gap-2">
                        {overview.data?.pending_months.length ? (
                          overview.data.pending_months.map((month) => (
                            <Badge key={month.month} className="bg-amber-50 text-amber-800 hover:bg-amber-50">
                              {month.label}
                            </Badge>
                          ))
                        ) : (
                          <div className="text-sm text-slate-600">No pending months in the current window.</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-sm font-medium text-slate-900">Month status</div>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
                        {overview.data?.months.map((month) => (
                          <div
                            key={month.month}
                            className={`rounded-md border p-2 text-sm ${
                              month.is_paid ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white'
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
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={form.handleSubmit((v) => createPayment.mutate(v))}>
                <div>
                  <div className="mb-1 text-sm text-slate-600">Start month</div>
                  <select
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
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
                  <div className="mt-1 text-xs text-slate-500">
                    Already-paid months are excluded. A start month is only available if the full cycle window is unpaid.
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-sm text-slate-600">Mode</div>
                  <select
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    {...form.register('mode')}
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank">Bank</option>
                  </select>
                </div>
                <div>
                  <div className="mb-1 text-sm text-slate-600">Reference</div>
                  <Input {...form.register('reference_no')} />
                </div>
                <div>
                  <div className="mb-1 text-sm text-slate-600">Notes</div>
                  <Input {...form.register('notes')} />
                </div>
                <Button type="submit" disabled={createPayment.isPending || !studentId || validOptions.length === 0}>
                  {createPayment.isPending ? <Spinner className="mr-2" /> : null}
                  Charge {overview.data?.payable_amount ?? ''}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

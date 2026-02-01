'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AppShell } from '@/components/app/shell';
import { Receipt, type ReceiptData } from '@/components/app/receipt';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toaster';
import { apiFetch } from '@/lib/api';

const schema = z.object({
  student_id: z.string().uuid(),
  amount: z.coerce.number().refine((v) => v !== 0, 'Amount must be non-zero'),
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
    defaultValues: { student_id: studentId, amount: 0, mode: 'cash' }
  });

  const student = useQuery({
    queryKey: ['student', studentId],
    enabled: Boolean(studentId),
    queryFn: () => apiFetch<any>(`/students/${studentId}`)
  });

  const createPayment = useMutation({
    mutationFn: (values: FormValues) => apiFetch<any>('/payments', { method: 'POST', body: JSON.stringify(values) }),
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Student</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            {studentId ? (
              student.isLoading ? (
                <div className="flex items-center gap-2">
                  <Spinner /> Loading
                </div>
              ) : (
                <div>
                  {student.data?.name} ({student.data?.student_code})
                </div>
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
                <div className="mb-1 text-sm text-slate-600">Amount</div>
                <Input type="number" step="0.01" {...form.register('amount')} />
                {form.formState.errors.amount ? (
                  <div className="mt-1 text-xs text-red-600">{form.formState.errors.amount.message}</div>
                ) : null}
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
              <Button type="submit" disabled={createPayment.isPending || !studentId}>
                {createPayment.isPending ? <Spinner className="mr-2" /> : null}
                Submit
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      )}
    </AppShell>
  );
}

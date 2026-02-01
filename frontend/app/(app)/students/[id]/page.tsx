'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AppShell } from '@/components/app/shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Table, TBody, TD, TH, THead } from '@/components/ui/table';
import { useToast } from '@/components/ui/toaster';
import { apiFetch } from '@/lib/api';

type Student = {
  id: string;
  student_code: string;
  name: string;
  class_name: string | null;
  section: string | null;
  status: 'active' | 'inactive';
};

type Fee = {
  student_id: string;
  expected_fee_amount: string;
};

type Balance = {
  student_id: string;
  student_code: string;
  name: string;
  expected_fee: string;
  paid_total: string;
  pending: string;
};

type Payment = {
  id: string;
  receipt_no: string;
  paid_at: string;
  mode: string;
  amount: string;
  notes?: string | null;
};

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { toast } = useToast();
  const qc = useQueryClient();
  const [feeOpen, setFeeOpen] = useState(false);
  const [inactiveOpen, setInactiveOpen] = useState(false);

  const feeSchema = z.object({ expected_fee_amount: z.coerce.number().min(0) });
  const feeForm = useForm<{ expected_fee_amount: number }>({
    resolver: zodResolver(feeSchema),
    defaultValues: { expected_fee_amount: 0 }
  });

  const student = useQuery({ queryKey: ['student', id], queryFn: () => apiFetch<Student>(`/students/${id}`) });
  const fee = useQuery({ queryKey: ['studentFee', id], queryFn: () => apiFetch<Fee>(`/students/${id}/fee`) });
  const balance = useQuery({ queryKey: ['studentBalance', id], queryFn: () => apiFetch<Balance>(`/students/${id}/balance`) });
  const payments = useQuery({
    queryKey: ['payments', id],
    queryFn: () => apiFetch<{ items: Payment[]; total: number }>(`/payments?student_id=${id}&page=1&page_size=100`)
  });

  const updateFee = useMutation({
    mutationFn: (values: { expected_fee_amount: number }) =>
      apiFetch<Fee>(`/students/${id}/fee`, { method: 'PATCH', body: JSON.stringify(values) }),
    onSuccess: () => {
      toast({ title: 'Fee updated' });
      setFeeOpen(false);
      qc.invalidateQueries({ queryKey: ['studentFee', id] });
      qc.invalidateQueries({ queryKey: ['studentBalance', id] });
      qc.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (e) => toast({ title: 'Update failed', description: String(e) })
  });

  const inactivate = useMutation({
    mutationFn: () => apiFetch<Student>(`/students/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'inactive' }) }),
    onSuccess: () => {
      toast({ title: 'Student inactivated' });
      setInactiveOpen(false);
      qc.invalidateQueries({ queryKey: ['student', id] });
      qc.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (e) => toast({ title: 'Action failed', description: String(e) })
  });

  return (
    <AppShell title="Student">
      {student.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Spinner /> Loading
        </div>
      ) : student.isError ? (
        <div className="text-sm text-red-600">Student not found</div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {student.data?.name} <span className="text-slate-400">({student.data?.student_code})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <div className="text-sm text-slate-600">
                {student.data?.class_name ?? '-'} {student.data?.section ?? ''}
              </div>
              <Badge className={student.data?.status === 'active' ? '' : 'bg-slate-100 text-slate-500'}>
                {student.data?.status}
              </Badge>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Expected</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{balance.data?.expected_fee ?? fee.data?.expected_fee_amount ?? '0'}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Paid</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{balance.data?.paid_total ?? '0'}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Pending</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{balance.data?.pending ?? '0'}</CardContent>
            </Card>
          </div>

          <div className="flex gap-2">
            <Link href={`/collect?student_id=${id}`}>
              <Button>Collect Payment</Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                feeForm.setValue('expected_fee_amount', Number(fee.data?.expected_fee_amount ?? 0));
                setFeeOpen(true);
              }}
            >
              Edit Expected Fee
            </Button>
            {student.data?.status === 'active' ? (
              <Button variant="destructive" onClick={() => setInactiveOpen(true)}>
                Mark Inactive
              </Button>
            ) : null}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto rounded-md border border-slate-200">
                <Table>
                  <THead>
                    <tr>
                      <TH>Receipt</TH>
                      <TH>Date</TH>
                      <TH>Mode</TH>
                      <TH>Amount</TH>
                      <TH>Notes</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {payments.isLoading ? (
                      <tr>
                        <TD colSpan={5}>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Spinner /> Loading
                          </div>
                        </TD>
                      </tr>
                    ) : payments.isError ? (
                      <tr>
                        <TD colSpan={5} className="text-sm text-red-600">
                          Failed to load payments
                        </TD>
                      </tr>
                    ) : payments.data?.items.length ? (
                      payments.data.items.map((p) => (
                        <tr key={p.id}>
                          <TD>{p.receipt_no}</TD>
                          <TD>{new Date(p.paid_at).toLocaleString()}</TD>
                          <TD>{p.mode}</TD>
                          <TD className={Number(p.amount) < 0 ? 'text-red-600' : ''}>{p.amount}</TD>
                          <TD className="max-w-[420px] truncate" title={p.notes ?? ''}>
                            {p.notes ?? ''}
                          </TD>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <TD colSpan={5} className="text-sm text-slate-600">
                          No payments
                        </TD>
                      </tr>
                    )}
                  </TBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Dialog open={feeOpen} onOpenChange={setFeeOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Expected Fee</DialogTitle>
              </DialogHeader>
              <form onSubmit={feeForm.handleSubmit((v) => updateFee.mutate(v))}>
                <DialogBody>
                  <div>
                    <div className="mb-1 text-sm text-slate-600">Expected Fee</div>
                    <input
                      type="number"
                      step="0.01"
                      className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                      {...feeForm.register('expected_fee_amount')}
                    />
                    {feeForm.formState.errors.expected_fee_amount ? (
                      <div className="mt-1 text-xs text-red-600">{feeForm.formState.errors.expected_fee_amount.message}</div>
                    ) : null}
                  </div>
                </DialogBody>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setFeeOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateFee.isPending}>
                    {updateFee.isPending ? <Spinner className="mr-2" /> : null}
                    Save
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={inactiveOpen} onOpenChange={setInactiveOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Mark Student Inactive</DialogTitle>
              </DialogHeader>
              <DialogBody>
                <div className="text-sm text-slate-600">This is a soft delete. Payments remain unchanged.</div>
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setInactiveOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" onClick={() => inactivate.mutate()} disabled={inactivate.isPending}>
                  {inactivate.isPending ? <Spinner className="mr-2" /> : null}
                  Mark Inactive
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </AppShell>
  );
}

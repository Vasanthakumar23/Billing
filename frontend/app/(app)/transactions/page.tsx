'use client';

import { useMemo, useState } from 'react';
import { Download, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { AppShell } from '@/components/app/shell';
import { PaymentReceiptDialog } from '@/components/app/payment-receipt-dialog';
import { ReversePaymentDialog, type PaymentRow } from '@/components/app/reverse-payment-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Table, TBody, TD, TH, THead } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';
import { debounce } from '@/lib/debounce';

type Payment = {
  id: string;
  receipt_no: string;
  bill_no: string;
  academic_period: string;
  student_id: string;
  student_name?: string | null;
  paid_at: string;
  mode: string;
  amount: string;
  notes?: string | null;
  fee_period_label?: string | null;
};

export default function TransactionsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [mode, setMode] = useState('');
  const [billNo, setBillNo] = useState('');
  const [debouncedBillNo, setDebouncedBillNo] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const [reverseOpen, setReverseOpen] = useState(false);
  const [reversePayment, setReversePayment] = useState<PaymentRow | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);

  const setBillNoDebounced = useMemo(() => debounce((v: string) => setDebouncedBillNo(v), 250), []);

  const q = useQuery({
    queryKey: ['payments', from, to, mode, debouncedBillNo, page],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('page_size', String(pageSize));
      if (from) params.set('from', new Date(from).toISOString());
      if (to) params.set('to', new Date(to).toISOString());
      if (mode) params.set('mode', mode);
      if (debouncedBillNo) params.set('bill_no', debouncedBillNo);
      return apiFetch<{ items: Payment[]; total: number }>(`/payments?${params.toString()}`);
    }
  });

  const totalPages = q.data ? Math.max(1, Math.ceil(q.data.total / pageSize)) : 1;

  return (
    <AppShell
      title="Transactions"
      subtitle="Filter bill numbers, inspect payment cycles, and reverse incorrect transactions with a full audit trail."
      action={
        <Button
          onClick={() => {
            const params = new URLSearchParams();
            if (from) params.set('from', new Date(from).toISOString());
            if (to) params.set('to', new Date(to).toISOString());
            window.location.assign(`/api/backend/export/payments.csv?${params.toString()}`);
          }}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      }
    >
      <div className="page-grid">
        <div className="grid gap-3 xl:grid-cols-[160px_160px_160px_220px] xl:justify-start">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--heading)]">
              <Filter className="h-4 w-4 text-[var(--accent)]" />
              From
            </div>
            <Input className="h-10 rounded-xl" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <div className="text-sm font-medium text-[var(--heading)]">To</div>
            <Input className="h-10 rounded-xl" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <div className="text-sm font-medium text-[var(--heading)]">Mode</div>
            <select
              className="theme-select h-10 w-full rounded-xl px-4 text-sm outline-none"
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <div className="text-sm font-medium text-[var(--heading)]">Bill No</div>
            <Input
              className="h-10 rounded-xl"
              value={billNo}
              onChange={(e) => {
                setBillNo(e.target.value);
                setBillNoDebounced(e.target.value);
                setPage(1);
              }}
              placeholder="0001"
            />
          </div>
        </div>

        <div>
          <div className="max-h-[68vh] overflow-auto">
            <Table>
              <THead>
                <tr>
                  <TH>Bill No</TH>
                  <TH>Receipt</TH>
                  <TH>Date</TH>
                  <TH>Student</TH>
                  <TH>Fee Period</TH>
                  <TH>Mode</TH>
                  <TH>Amount</TH>
                  <TH>Notes</TH>
                  <TH></TH>
                </tr>
              </THead>
              <TBody>
                {q.isLoading ? (
                  <tr className="bg-[var(--panel)]">
                    <TD colSpan={9}>
                      <div className="flex items-center gap-2 text-sm text-[#91a1bc]">
                        <Spinner /> Loading
                      </div>
                    </TD>
                  </tr>
                ) : q.isError ? (
                  <tr className="bg-[var(--panel)]">
                    <TD colSpan={9} className="text-sm text-rose-300">Failed to load</TD>
                  </tr>
                ) : (
                  q.data?.items.map((p) => (
                    <tr key={p.id} className="bg-[var(--panel)]">
                      <TD className="theme-heading font-semibold">{p.bill_no}</TD>
                      <TD className="theme-heading font-semibold">{p.receipt_no}</TD>
                      <TD>{new Date(p.paid_at).toLocaleString()}</TD>
                      <TD>{p.student_name ?? '-'}</TD>
                      <TD>{p.fee_period_label ?? '-'}</TD>
                      <TD className="capitalize">{p.mode}</TD>
                      <TD className={Number(p.amount) < 0 ? 'font-semibold text-rose-300' : 'theme-heading font-semibold'}>{p.amount}</TD>
                      <TD className="max-w-[320px] truncate text-[#91a1bc]" title={p.notes ?? ''}>
                        {p.notes ?? '-'}
                      </TD>
                      <TD>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReceiptPaymentId(p.id);
                              setReceiptOpen(true);
                            }}
                          >
                            Receipt
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReversePayment({ id: p.id, receipt_no: p.receipt_no, amount: p.amount, mode: p.mode });
                              setReverseOpen(true);
                            }}
                          >
                            Reverse
                          </Button>
                        </div>
                      </TD>
                    </tr>
                  ))
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
        </div>
      </div>

      <ReversePaymentDialog open={reverseOpen} onOpenChange={setReverseOpen} payment={reversePayment} onSuccess={() => q.refetch()} />
      <PaymentReceiptDialog open={receiptOpen} onOpenChange={setReceiptOpen} paymentId={receiptPaymentId} />
    </AppShell>
  );
}

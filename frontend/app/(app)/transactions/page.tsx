'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { AppShell } from '@/components/app/shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Table, TBody, TD, TH, THead } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';
import { debounce } from '@/lib/debounce';

type Payment = {
  id: string;
  receipt_no: string;
  student_id: string;
  paid_at: string;
  mode: string;
  amount: string;
  notes?: string | null;
};

export default function TransactionsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [mode, setMode] = useState('');
  const [receipt, setReceipt] = useState('');
  const [debouncedReceipt, setDebouncedReceipt] = useState('');

  const setReceiptDebounced = useMemo(() => debounce((v: string) => setDebouncedReceipt(v), 250), []);

  const q = useQuery({
    queryKey: ['payments', from, to, mode, debouncedReceipt],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('page_size', '200');
      if (from) params.set('from', new Date(from).toISOString());
      if (to) params.set('to', new Date(to).toISOString());
      if (mode) params.set('mode', mode);
      if (debouncedReceipt) params.set('receipt_no', debouncedReceipt);
      return apiFetch<{ items: Payment[]; total: number }>(`/payments?${params.toString()}`);
    }
  });

  return (
    <AppShell title="Transactions">
      <Card>
        <CardContent>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <div className="mb-1 text-xs text-slate-600">From</div>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px]" />
              </div>
              <div>
                <div className="mb-1 text-xs text-slate-600">To</div>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[160px]" />
              </div>
              <div>
                <div className="mb-1 text-xs text-slate-600">Mode</div>
                <select
                  className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                >
                  <option value="">All</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank">Bank</option>
                </select>
              </div>
              <div>
                <div className="mb-1 text-xs text-slate-600">Receipt</div>
                <Input
                  value={receipt}
                  onChange={(e) => {
                    setReceipt(e.target.value);
                    setReceiptDebounced(e.target.value);
                  }}
                  placeholder="FEE-123"
                  className="w-[200px]"
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                const params = new URLSearchParams();
                if (from) params.set('from', new Date(from).toISOString());
                if (to) params.set('to', new Date(to).toISOString());
                window.location.assign(`/api/backend/export/payments.csv?${params.toString()}`);
              }}
            >
              Export CSV
            </Button>
          </div>
          <div className="mt-4 overflow-auto rounded-md border border-slate-200 max-h-[65vh]">
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
                {q.isLoading ? (
                  <tr>
                    <TD colSpan={5}>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Spinner /> Loading
                      </div>
                    </TD>
                  </tr>
                ) : q.isError ? (
                  <tr>
                    <TD colSpan={5} className="text-sm text-red-600">Failed to load</TD>
                  </tr>
                ) : (
                  q.data?.items.map((p) => (
                    <tr key={p.id}>
                      <TD>{p.receipt_no}</TD>
                      <TD>{new Date(p.paid_at).toLocaleString()}</TD>
                      <TD>{p.mode}</TD>
                      <TD className={Number(p.amount) < 0 ? 'text-red-600' : ''}>{p.amount}</TD>
                      <TD className="max-w-[520px] truncate" title={p.notes ?? ''}>
                        {p.notes ?? ''}
                      </TD>
                    </tr>
                  ))
                )}
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}

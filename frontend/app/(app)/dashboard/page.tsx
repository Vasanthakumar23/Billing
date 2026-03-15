'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { AppShell } from '@/components/app/shell';
import { PaymentReceiptDialog } from '@/components/app/payment-receipt-dialog';
import { StudentQuickSearch } from '@/components/app/student-quick-search';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Table, TBody, TD, TH, THead } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';

type Summary = {
  total_collected: string;
  today_total: string;
  month_total: string;
  pending_total: string;
};

type Payment = {
  id: string;
  receipt_no: string;
  student_name?: string | null;
  fee_period_label?: string | null;
  amount: string;
  paid_at: string;
};

export default function DashboardPage() {
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);

  const summary = useQuery({
    queryKey: ['summary'],
    queryFn: () => apiFetch<Summary>('/reports/summary')
  });
  const recentPayments = useQuery({
    queryKey: ['recentPayments'],
    queryFn: () => apiFetch<{ items: Payment[]; total: number }>('/payments?page=1&page_size=5')
  });

  return (
    <AppShell title="Dashboard">
      {summary.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Spinner /> Loading
        </div>
      ) : summary.isError ? (
        <div className="text-sm text-red-600">Failed to load summary</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Today Collected</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{summary.data?.today_total}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>This Month Collected</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{summary.data?.month_total}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Total Pending</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{summary.data?.pending_total}</CardContent>
            </Card>
          </div>

          <StudentQuickSearch />

          <Card>
            <CardHeader>
              <CardTitle>Recent Receipts</CardTitle>
            </CardHeader>
            <CardContent>
              {recentPayments.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Spinner /> Loading
                </div>
              ) : recentPayments.isError ? (
                <div className="text-sm text-red-600">Failed to load recent payments</div>
              ) : (
                <div className="overflow-auto rounded-md border border-slate-200">
                  <Table>
                    <THead>
                      <tr>
                        <TH>Receipt</TH>
                        <TH>Student</TH>
                        <TH>Fee Period</TH>
                        <TH>Amount</TH>
                        <TH>Date</TH>
                        <TH></TH>
                      </tr>
                    </THead>
                    <TBody>
                      {recentPayments.data?.items.map((payment) => (
                        <tr key={payment.id}>
                          <TD>{payment.receipt_no}</TD>
                          <TD>{payment.student_name ?? '-'}</TD>
                          <TD>{payment.fee_period_label ?? '-'}</TD>
                          <TD>{payment.amount}</TD>
                          <TD>{new Date(payment.paid_at).toLocaleString()}</TD>
                          <TD>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setReceiptPaymentId(payment.id);
                                setReceiptOpen(true);
                              }}
                            >
                              Print Receipt
                            </Button>
                          </TD>
                        </tr>
                      ))}
                    </TBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <PaymentReceiptDialog open={receiptOpen} onOpenChange={setReceiptOpen} paymentId={receiptPaymentId} />
        </div>
      )}
    </AppShell>
  );
}

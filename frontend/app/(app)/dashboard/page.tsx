'use client';

import { useState } from 'react';
import { CheckCircle2, Download, UserX2, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { AppShell } from '@/components/app/shell';
import { PaymentReceiptDialog } from '@/components/app/payment-receipt-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Table, TBody, TD, TH, THead } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';

type Summary = {
  total_collected: string;
  today_total: string;
  month_total: string;
  pending_total: string;
  paid_students: number;
  unpaid_students: number;
  active_students: number;
  selected_month: string;
};

type Payment = {
  id: string;
  receipt_no: string;
  student_name?: string | null;
  student_code?: string | null;
  fee_period_label?: string | null;
  amount: string;
  paid_at: string;
};

function toMonthDate(value: string) {
  return `${value}-01`;
}

function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export default function DashboardPage() {
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const summary = useQuery({
    queryKey: ['summary', month],
    queryFn: () => apiFetch<Summary>(`/reports/summary?month=${encodeURIComponent(toMonthDate(month))}`)
  });
  const recentPayments = useQuery({
    queryKey: ['recentPayments'],
    queryFn: () => apiFetch<{ items: Payment[]; total: number }>('/payments?page=1&page_size=5')
  });
  const studentCount = useQuery({
    queryKey: ['dashboardStudentCount'],
    queryFn: () => apiFetch<{ items: any[]; total: number }>('/students?status=active&page=1&page_size=1')
  });

  const statCards = [
    {
      label: 'Total Students',
      value: summary.data?.active_students?.toString() ?? studentCount.data?.total?.toString() ?? '-',
      caption: 'Active students in selected month window',
      icon: Users,
      tone: 'text-[#dbe6ff]'
    }
  ];

  return (
    <AppShell
      title="Dashboard"
      subtitle="Monitor collections, pending dues, and the latest payment activity across your institution."
      action={
        <div className="flex flex-wrap gap-3">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-[180px]" />
          <Button onClick={() => window.location.assign('/api/backend/export/pending.csv')}>
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      }
    >
      {summary.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-[#91a1bc]">
          <Spinner /> Loading
        </div>
      ) : summary.isError ? (
        <div className="text-sm text-rose-300">Failed to load summary</div>
      ) : (
        <div className="page-grid">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {statCards.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.label} className="metric-card">
                  <CardContent className="space-y-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium text-[#9aa8c2]">{item.label}</div>
                        <div className="theme-heading mt-3 text-3xl font-semibold">{item.value ?? '-'}</div>
                      </div>
                      <div className="theme-subtle-surface rounded-xl p-3">
                        <Icon className={`h-6 w-6 ${item.tone}`} />
                      </div>
                    </div>
                    <div className="text-sm text-[#8ea0bf]">{item.caption}</div>
                  </CardContent>
                </Card>
              );
            })}
            <Card className="metric-card">
              <CardContent className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-[#9aa8c2]">Students Paid</div>
                    <div className="theme-heading mt-3 text-3xl font-semibold">{summary.data?.paid_students ?? '-'}</div>
                  </div>
                  <div className="rounded-xl border border-[rgba(31,157,103,0.16)] bg-[rgba(31,157,103,0.1)] p-3">
                    <CheckCircle2 className="h-6 w-6 text-[#8ee0b8]" />
                  </div>
                </div>
                <div className="text-sm text-[#8ea0bf]">Students paid for {monthLabel(month)}</div>
              </CardContent>
            </Card>
            <Card className="metric-card">
              <CardContent className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-[#9aa8c2]">Students Not Paid</div>
                    <div className="theme-heading mt-3 text-3xl font-semibold">{summary.data?.unpaid_students ?? '-'}</div>
                  </div>
                  <div className="rounded-xl border border-[rgba(183,121,31,0.16)] bg-[rgba(183,121,31,0.1)] p-3">
                    <UserX2 className="h-6 w-6 text-[#e7c07a]" />
                  </div>
                </div>
                <div className="text-sm text-[#8ea0bf]">Students pending for {monthLabel(month)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Transactions</CardTitle>
                <div className="mt-1 text-sm text-[#91a1bc]">Latest student payments and receipt actions</div>
              </div>
              <Button variant="outline" onClick={() => window.location.assign('/transactions')}>
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {recentPayments.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-[#91a1bc]">
                  <Spinner /> Loading
                </div>
              ) : recentPayments.isError ? (
                <div className="text-sm text-rose-300">Failed to load recent payments</div>
              ) : (
                <div className="theme-table-wrap overflow-auto rounded-xl">
                  <Table>
                    <THead>
                      <tr>
                        <TH>Student ID</TH>
                        <TH>Student</TH>
                        <TH>Receipt</TH>
                        <TH>Fee Period</TH>
                        <TH>Date</TH>
                        <TH></TH>
                      </tr>
                    </THead>
                    <TBody>
                      {recentPayments.data?.items.map((payment) => (
                        <tr key={payment.id}>
                          <TD>{payment.student_code ?? '-'}</TD>
                          <TD className="theme-heading font-semibold">{payment.student_name ?? '-'}</TD>
                          <TD>{payment.receipt_no}</TD>
                          <TD>{payment.fee_period_label ?? '-'}</TD>
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

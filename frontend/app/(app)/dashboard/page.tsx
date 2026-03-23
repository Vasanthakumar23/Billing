'use client';

import { useState } from 'react';
import { ArrowUpRight, Download, IndianRupee, Receipt, TrendingUp, Users } from 'lucide-react';
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

const trendBars = [68, 52, 84, 61, 78, 70];

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
  const studentCount = useQuery({
    queryKey: ['dashboardStudentCount'],
    queryFn: () => apiFetch<{ items: any[]; total: number }>('/students?status=active&page=1&page_size=1')
  });

  const statCards = [
    {
      label: 'Total Revenue',
      value: summary.data?.total_collected,
      caption: 'All recorded collections',
      icon: IndianRupee,
      tone: 'text-[#9cb4ff]'
    },
    {
      label: 'Total Students',
      value: studentCount.data?.total?.toString() ?? '-',
      caption: 'Active student records',
      icon: Users,
      tone: 'text-[#8ce0ff]'
    },
    {
      label: 'Paid This Month',
      value: summary.data?.month_total,
      caption: 'Current billing period inflow',
      icon: TrendingUp,
      tone: 'text-[#2ed88f]'
    },
    {
      label: 'Pending Amount',
      value: summary.data?.pending_total,
      caption: 'Outstanding collections',
      icon: Receipt,
      tone: 'text-[#ffb14a]'
    }
  ];

  return (
    <AppShell
      title="Dashboard"
      subtitle="Monitor collections, pending dues, and the latest payment activity across your institution."
      action={
        <Button onClick={() => window.location.assign('/api/backend/export/pending.csv')}>
          <Download className="h-4 w-4" />
          Export Report
        </Button>
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {statCards.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.label} className="metric-card">
                  <CardContent className="space-y-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium text-[#9aa8c2]">{item.label}</div>
                        <div className="mt-4 text-4xl font-bold text-white">{item.value ?? '-'}</div>
                      </div>
                      <div className="rounded-2xl border border-[rgba(79,124,255,0.16)] bg-[rgba(79,124,255,0.12)] p-3">
                        <Icon className={`h-6 w-6 ${item.tone}`} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#8ea0bf]">
                      <ArrowUpRight className="h-4 w-4 text-[#4f7cff]" />
                      {item.caption}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Collection Trend</CardTitle>
                <div className="text-sm text-[#91a1bc]">Revenue momentum across recent collection cycles</div>
              </CardHeader>
              <CardContent>
                <div className="grid h-[280px] grid-cols-6 items-end gap-4 rounded-[24px] border border-[rgba(151,164,187,0.08)] bg-[rgba(255,255,255,0.02)] p-6">
                  {trendBars.map((bar, index) => (
                    <div key={index} className="flex h-full flex-col justify-end gap-3">
                      <div className="rounded-t-[18px] bg-[linear-gradient(180deg,rgba(79,124,255,0.98)_0%,rgba(79,124,255,0.22)_100%)]" style={{ height: `${bar}%` }} />
                      <div className="text-center text-sm text-[#8ea0bf]">{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][index]}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <StudentQuickSearch />
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
                <div className="overflow-auto rounded-[24px] border border-[rgba(151,164,187,0.08)] bg-[rgba(255,255,255,0.02)]">
                  <Table>
                    <THead>
                      <tr>
                        <TH>Student</TH>
                        <TH>Receipt</TH>
                        <TH>Fee Period</TH>
                        <TH>Amount</TH>
                        <TH>Date</TH>
                        <TH></TH>
                      </tr>
                    </THead>
                    <TBody>
                      {recentPayments.data?.items.map((payment) => (
                        <tr key={payment.id}>
                          <TD className="font-semibold text-white">{payment.student_name ?? '-'}</TD>
                          <TD>{payment.receipt_no}</TD>
                          <TD>{payment.fee_period_label ?? '-'}</TD>
                          <TD className="font-semibold text-white">{payment.amount}</TD>
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

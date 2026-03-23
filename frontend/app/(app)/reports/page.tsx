'use client';

import { useState } from 'react';
import { Download, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { AppShell } from '@/components/app/shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Table, TBody, TD, TH, THead } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';

export default function ReportsPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const pending = useQuery({
    queryKey: ['pending'],
    queryFn: () => apiFetch<any[]>('/reports/pending?status=active')
  });

  const daily = useQuery({
    queryKey: ['daily', date],
    queryFn: () => apiFetch<any[]>(`/reports/daily?date=${encodeURIComponent(date)}`)
  });

  return (
    <AppShell
      title="Reports & Analytics"
      subtitle="Comprehensive collection insight across pending balances and daily payment channels."
      action={
        <Button onClick={() => window.location.assign('/api/backend/export/pending.csv')}>
          <Download className="h-4 w-4" />
          Export Pending CSV
        </Button>
      }
    >
      <div className="page-grid">
        <Card>
          <CardHeader>
            <CardTitle>Report Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-[rgba(151,164,187,0.12)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                <Filter className="h-4 w-4 text-[#4f7cff]" />
                Collection Date
              </div>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="rounded-2xl border border-[rgba(151,164,187,0.12)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
              <div className="mb-2 text-sm font-semibold text-white">Pending Accounts</div>
              <div className="text-3xl font-bold text-white">{pending.data?.length ?? '-'}</div>
            </div>
            <div className="rounded-2xl border border-[rgba(151,164,187,0.12)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
              <div className="mb-2 text-sm font-semibold text-white">Daily Modes</div>
              <div className="text-3xl font-bold text-white">{daily.data?.length ?? '-'}</div>
            </div>
            <div className="rounded-2xl border border-[rgba(151,164,187,0.12)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
              <div className="mb-2 text-sm font-semibold text-white">Status</div>
              <Badge className="bg-[rgba(79,124,255,0.16)] text-[#a7c1ff]">Live reporting</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Pending Collections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[60vh] overflow-auto rounded-[24px] border border-[rgba(151,164,187,0.08)] bg-[rgba(255,255,255,0.02)]">
                <Table>
                  <THead>
                    <tr>
                      <TH>Student</TH>
                      <TH>Monthly Fee</TH>
                      <TH>Paid</TH>
                      <TH>Pending</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {pending.isLoading ? (
                      <tr>
                        <TD colSpan={4}>
                          <div className="flex items-center gap-2 text-sm text-[#91a1bc]">
                            <Spinner /> Loading
                          </div>
                        </TD>
                      </tr>
                    ) : pending.isError ? (
                      <tr>
                        <TD colSpan={4} className="text-sm text-rose-300">Failed to load</TD>
                      </tr>
                    ) : (
                      pending.data?.map((r) => (
                        <tr key={r.student_id}>
                          <TD>
                            <div className="font-semibold text-white">{r.name}</div>
                            <div className="mt-1 text-sm text-[#91a1bc]">{r.student_code}</div>
                          </TD>
                          <TD>{r.expected_fee}</TD>
                          <TD>{r.paid_total}</TD>
                          <TD className="font-semibold text-white">{r.pending}</TD>
                        </tr>
                      ))
                    )}
                  </TBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Collection Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {daily.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-[#91a1bc]">
                  <Spinner /> Loading
                </div>
              ) : daily.isError ? (
                <div className="text-sm text-rose-300">Failed to load</div>
              ) : daily.data?.length ? (
                daily.data.map((r) => (
                  <div
                    key={r.mode}
                    className="flex items-center justify-between rounded-2xl border border-[rgba(151,164,187,0.1)] bg-[rgba(255,255,255,0.03)] px-4 py-4"
                  >
                    <div>
                      <div className="font-semibold text-white">{String(r.mode).toUpperCase()}</div>
                      <div className="mt-1 text-sm text-[#91a1bc]">Collected on {date}</div>
                    </div>
                    <div className="text-2xl font-bold text-white">{r.total}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-[#91a1bc]">No data for the selected date</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

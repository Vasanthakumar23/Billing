'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { AppShell } from '@/components/app/shell';
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
    <AppShell title="Reports">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pending</CardTitle>
              <Button variant="outline" onClick={() => window.location.assign('/api/backend/export/pending.csv')}>
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto rounded-md border border-slate-200 max-h-[55vh]">
              <Table>
                <THead>
                  <tr>
                    <TH>Student</TH>
                    <TH>Expected</TH>
                    <TH>Paid</TH>
                    <TH>Pending</TH>
                  </tr>
                </THead>
                <TBody>
                  {pending.isLoading ? (
                    <tr>
                      <TD colSpan={4}>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Spinner /> Loading
                        </div>
                      </TD>
                    </tr>
                  ) : pending.isError ? (
                    <tr>
                      <TD colSpan={4} className="text-sm text-red-600">Failed to load</TD>
                    </tr>
                  ) : (
                    pending.data?.map((r) => (
                      <tr key={r.student_id}>
                        <TD>
                          {r.student_code} - {r.name}
                        </TD>
                        <TD>{r.expected_fee}</TD>
                        <TD>{r.paid_total}</TD>
                        <TD className="font-semibold">{r.pending}</TD>
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
            <div className="flex items-end justify-between gap-3">
              <CardTitle>Daily Collection</CardTitle>
              <div className="flex items-end gap-2">
                <div>
                  <div className="mb-1 text-xs text-slate-600">Date</div>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[160px]" />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto rounded-md border border-slate-200">
              <Table>
                <THead>
                  <tr>
                    <TH>Mode</TH>
                    <TH>Total</TH>
                  </tr>
                </THead>
                <TBody>
                  {daily.isLoading ? (
                    <tr>
                      <TD colSpan={2}>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Spinner /> Loading
                        </div>
                      </TD>
                    </tr>
                  ) : daily.isError ? (
                    <tr>
                      <TD colSpan={2} className="text-sm text-red-600">Failed to load</TD>
                    </tr>
                  ) : daily.data?.length ? (
                    daily.data.map((r) => (
                      <tr key={r.mode}>
                        <TD>{r.mode}</TD>
                        <TD className="font-semibold">{r.total}</TD>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <TD colSpan={2} className="text-sm text-slate-600">No data</TD>
                    </tr>
                  )}
                </TBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

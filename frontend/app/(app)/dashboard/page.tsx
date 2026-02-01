'use client';

import { useQuery } from '@tanstack/react-query';

import { AppShell } from '@/components/app/shell';
import { StudentQuickSearch } from '@/components/app/student-quick-search';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { apiFetch } from '@/lib/api';

type Summary = {
  total_collected: string;
  today_total: string;
  month_total: string;
  pending_total: string;
};

export default function DashboardPage() {
  const summary = useQuery({
    queryKey: ['summary'],
    queryFn: () => apiFetch<Summary>('/reports/summary')
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
        </div>
      )}
    </AppShell>
  );
}

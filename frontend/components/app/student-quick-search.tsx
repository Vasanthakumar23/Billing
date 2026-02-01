'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { apiFetch } from '@/lib/api';
import { debounce } from '@/lib/debounce';

type StudentListItem = {
  id: string;
  student_code: string;
  name: string;
  pending: string;
  status: 'active' | 'inactive';
};

export function StudentQuickSearch() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const setDebouncedFn = useMemo(() => debounce((v: string) => setDebounced(v), 250), []);
  useEffect(() => setDebouncedFn(search), [search, setDebouncedFn]);

  const q = useQuery({
    queryKey: ['quickSearch', debounced],
    enabled: debounced.trim().length >= 2,
    queryFn: () =>
      apiFetch<{ items: StudentListItem[]; total: number }>(
        `/students/balances?search=${encodeURIComponent(debounced)}&status=active&page=1&page_size=8`
      )
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Student Search</CardTitle>
      </CardHeader>
      <CardContent>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID or name" />

        <div className="mt-3">
          {q.isFetching ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Spinner /> Searching
            </div>
          ) : q.data?.items?.length ? (
            <div className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
              {q.data.items.map((s) => (
                <Link
                  key={s.id}
                  href={`/students/${s.id}`}
                  className="flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <div>
                    <div className="font-medium text-slate-900">
                      {s.student_code} - {s.name}
                    </div>
                    <div className="text-xs text-slate-600">Pending: {s.pending}</div>
                  </div>
                  <div className="text-xs text-slate-500">View</div>
                </Link>
              ))}
            </div>
          ) : debounced.trim().length >= 2 ? (
            <div className="text-sm text-slate-600">No results</div>
          ) : (
            <div className="text-sm text-slate-600">Type at least 2 characters</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


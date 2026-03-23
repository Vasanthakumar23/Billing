'use client';

import Link from 'next/link';
import { Search, Sparkles } from 'lucide-react';
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
        <div className="mt-1 text-sm text-[#91a1bc]">Find a student record instantly by roll number or name</div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7484a1]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID or name"
            className="pl-11"
          />
        </div>

        <div className="mt-4">
          {q.isFetching ? (
            <div className="flex items-center gap-2 text-sm text-[#91a1bc]">
              <Spinner /> Searching
            </div>
          ) : q.data?.items?.length ? (
            <div className="space-y-3">
              {q.data.items.map((s) => (
                <Link
                  key={s.id}
                  href={`/students/${s.id}`}
                  className="flex items-center justify-between rounded-2xl border border-[rgba(151,164,187,0.1)] bg-[rgba(255,255,255,0.03)] px-4 py-3 transition-colors hover:border-[rgba(79,124,255,0.25)] hover:bg-[rgba(79,124,255,0.08)]"
                >
                  <div>
                    <div className="font-semibold text-white">
                      {s.student_code} · {s.name}
                    </div>
                    <div className="mt-1 text-sm text-[#91a1bc]">Pending: {s.pending}</div>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-[#d8e4ff]">
                    <Sparkles className="h-4 w-4 text-[#4f7cff]" />
                    Open
                  </div>
                </Link>
              ))}
            </div>
          ) : debounced.trim().length >= 2 ? (
            <div className="text-sm text-[#91a1bc]">No results</div>
          ) : (
            <div className="text-sm text-[#91a1bc]">Type at least 2 characters</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { PiggyBank, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AppShell } from '@/components/app/shell';
import { RetractSavingsDialog, type SavingsRow } from '@/components/app/retract-savings-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Table, TBody, TD, TH, THead } from '@/components/ui/table';
import { useToast } from '@/components/ui/toaster';
import { apiFetch } from '@/lib/api';
import { debounce } from '@/lib/debounce';

type Student = {
  id: string;
  student_code: string;
  name: string;
};

type SavingsBalance = {
  student_id: string;
  student_code: string;
  student_name: string;
  total_savings: string;
};

type SavingsEntry = {
  id: string;
  student_id: string;
  student_name?: string | null;
  student_code?: string | null;
  amount: string;
  mode: string;
  notes?: string | null;
  recorded_at: string;
  is_retraction: boolean;
  is_edited: boolean;
  retracted_from_id?: string | null;
};

const schema = z.object({
  student_id: z.string().uuid().optional().or(z.literal('')),
  student_code: z.string().min(1, 'Roll number is required'),
  entry_type: z.enum(['plus', 'minus']),
  amount: z.coerce.number().int('Amount must be a whole number').positive('Amount must be greater than zero'),
  notes: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

export default function SavingsPage() {
  const { toast } = useToast();
  const [studentCodeLookup, setStudentCodeLookup] = useState('');
  const [balanceSearch, setBalanceSearch] = useState('');
  const [balanceClass, setBalanceClass] = useState('');
  const [debouncedBalanceSearch, setDebouncedBalanceSearch] = useState('');
  const [debouncedBalanceClass, setDebouncedBalanceClass] = useState('');
  const [entrySearch, setEntrySearch] = useState('');
  const [debouncedEntrySearch, setDebouncedEntrySearch] = useState('');
  const [retractOpen, setRetractOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<SavingsRow | null>(null);
  const setBalanceSearchDebounced = useMemo(() => debounce((value: string) => setDebouncedBalanceSearch(value), 250), []);
  const setBalanceClassDebounced = useMemo(() => debounce((value: string) => setDebouncedBalanceClass(value), 250), []);
  const setEntrySearchDebounced = useMemo(() => debounce((value: string) => setDebouncedEntrySearch(value), 250), []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      student_id: '',
      student_code: '',
      entry_type: 'plus',
      amount: undefined,
      notes: ''
    }
  });
  const studentCodeField = form.register('student_code');

  const student = useQuery({
    queryKey: ['savingsStudentByCode', studentCodeLookup],
    enabled: Boolean(studentCodeLookup),
    queryFn: async () => {
      const data = await apiFetch<{ items: Student[]; total: number }>(
        `/students?search=${encodeURIComponent(studentCodeLookup)}&page=1&page_size=10`
      );
      const exact = data.items.find((item) => item.student_code.toLowerCase() === studentCodeLookup.toLowerCase());
      if (!exact) throw new Error('Student not found for this roll number');
      form.setValue('student_id', exact.id);
      form.setValue('student_code', exact.student_code);
      return exact;
    },
    retry: false
  });

  const balances = useQuery({
    queryKey: ['savingsBalances', debouncedBalanceSearch, debouncedBalanceClass],
    queryFn: () =>
      apiFetch<{ items: SavingsBalance[]; total: number }>(
        `/savings/balances?page=1&page_size=50&search=${encodeURIComponent(debouncedBalanceSearch)}&class_prefix=${encodeURIComponent(debouncedBalanceClass)}`
      )
  });

  const entries = useQuery({
    queryKey: ['savingsEntries', debouncedEntrySearch],
    queryFn: () =>
      apiFetch<{ items: SavingsEntry[]; total: number }>(
        `/savings?page=1&page_size=50&search=${encodeURIComponent(debouncedEntrySearch)}`
      )
  });

  const createEntry = useMutation({
    mutationFn: ({ entry_type, amount, ...values }: FormValues) =>
      apiFetch('/savings', {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          mode: 'cash',
          amount: entry_type === 'minus' ? -Math.abs(amount) : Math.abs(amount)
        })
      }),
    onSuccess: () => {
      toast({ title: 'Savings entry recorded' });
      form.reset({ student_id: '', student_code: '', entry_type: 'plus', amount: undefined, notes: '' });
      balances.refetch();
      entries.refetch();
    },
    onError: (e) => toast({ title: 'Failed to save savings entry', description: String(e) })
  });

  return (
    <AppShell
      title="Savings"
      subtitle="Track student savings separately from fee payments. Choose whether the entry adds to or deducts from savings, and retract mistaken entries when needed."
    >
      <div className="page-grid">
        <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-[var(--accent)]" />
                Record Savings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={form.handleSubmit((values) => createEntry.mutate(values))}>
                <div>
                  <div className="theme-heading mb-2 text-sm font-medium">Student roll no</div>
                  <div className="flex gap-2">
                    <Input
                      className="h-10 rounded-xl"
                      {...studentCodeField}
                      placeholder="S001"
                      onChange={(e) => {
                        studentCodeField.onChange(e);
                        form.setValue('student_id', '');
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-xl px-4"
                      onClick={() => setStudentCodeLookup(form.getValues('student_code').trim())}
                    >
                      Load
                    </Button>
                  </div>
                  {student.isError ? <div className="mt-1 text-xs text-rose-300">Invalid roll number</div> : null}
                  {student.data ? (
                    <div className="mt-2 text-sm text-[#91a1bc]">
                      {student.data.name} ({student.data.student_code})
                    </div>
                  ) : null}
                </div>
                <div>
                  <div className="theme-heading mb-2 text-sm font-medium">Entry type</div>
                  <select className="theme-select h-10 w-full rounded-xl px-4 text-sm outline-none" {...form.register('entry_type')}>
                    <option value="plus">Plus</option>
                    <option value="minus">Minus</option>
                  </select>
                </div>
                <div>
                  <div className="theme-heading mb-2 text-sm font-medium">Amount</div>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    className="h-10 rounded-xl"
                    {...form.register('amount')}
                    placeholder="Enter amount"
                  />
                  {form.formState.errors.amount ? (
                    <div className="mt-1 text-xs text-rose-300">{form.formState.errors.amount.message}</div>
                  ) : null}
                </div>
                <div>
                  <div className="theme-heading mb-2 text-sm font-medium">Notes</div>
                  <Input className="h-10 rounded-xl" {...form.register('notes')} placeholder="Optional remarks" />
                </div>
                <Button
                  className="h-10 rounded-xl px-4"
                  type="submit"
                  disabled={createEntry.isPending || !student.data || student.isFetching}
                >
                  {createEntry.isPending ? <Spinner className="mr-2" /> : null}
                  Save Entry
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>Student Savings Balances</CardTitle>
              </div>
              <div className="flex gap-2">
                <div className="relative w-[160px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#91a1bc]" />
                  <Input
                    className="h-10 rounded-xl pl-9"
                    value={balanceSearch}
                    onChange={(e) => {
                      setBalanceSearch(e.target.value);
                      setBalanceSearchDebounced(e.target.value);
                    }}
                    placeholder="Roll no"
                  />
                </div>
                <Input
                  className="h-10 w-[80px] rounded-xl"
                  value={balanceClass}
                  maxLength={2}
                  onChange={(e) => {
                    setBalanceClass(e.target.value);
                    setBalanceClassDebounced(e.target.value);
                  }}
                  placeholder="Class"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[320px] overflow-auto">
                <Table>
                  <THead>
                    <tr>
                      <TH>Roll No</TH>
                      <TH>Student</TH>
                      <TH>Total Savings</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {balances.isLoading ? (
                      <tr className="bg-[var(--panel)]">
                        <TD colSpan={3}>
                          <div className="flex items-center gap-2 text-sm text-[#91a1bc]">
                            <Spinner /> Loading
                          </div>
                        </TD>
                      </tr>
                    ) : balances.isError ? (
                      <tr className="bg-[var(--panel)]">
                        <TD colSpan={3} className="text-sm text-rose-300">Failed to load balances</TD>
                      </tr>
                    ) : (
                      balances.data?.items.map((item) => (
                        <tr key={item.student_id} className="bg-[var(--panel)]">
                          <TD>{item.student_code}</TD>
                          <TD className="theme-heading font-semibold">{item.student_name}</TD>
                          <TD className={Number(item.total_savings) < 0 ? 'font-semibold text-rose-300' : 'theme-heading font-semibold'}>
                            {item.total_savings}
                          </TD>
                        </tr>
                      ))
                    )}
                  </TBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Savings Entries</CardTitle>
            </div>
            <div className="relative w-full max-w-[280px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#91a1bc]" />
              <Input
                className="h-10 rounded-xl pl-9"
                value={entrySearch}
                onChange={(e) => {
                  setEntrySearch(e.target.value);
                  setEntrySearchDebounced(e.target.value);
                }}
                placeholder="Search student"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[460px] overflow-auto">
              <Table>
                <THead>
                  <tr>
                    <TH>Date</TH>
                    <TH>Roll No</TH>
                    <TH>Student</TH>
                    <TH>Mode</TH>
                    <TH>Amount</TH>
                    <TH>Notes</TH>
                    <TH></TH>
                  </tr>
                </THead>
                <TBody>
                  {entries.isLoading ? (
                    <tr className="bg-[var(--panel)]">
                      <TD colSpan={7}>
                        <div className="flex items-center gap-2 text-sm text-[#91a1bc]">
                          <Spinner /> Loading
                        </div>
                      </TD>
                    </tr>
                  ) : entries.isError ? (
                    <tr className="bg-[var(--panel)]">
                      <TD colSpan={7} className="text-sm text-rose-300">Failed to load savings entries</TD>
                    </tr>
                  ) : (
                    entries.data?.items.map((item) => (
                      <tr key={item.id} className="bg-[var(--panel)]">
                        <TD>{new Date(item.recorded_at).toLocaleString()}</TD>
                        <TD>{item.student_code ?? '-'}</TD>
                        <TD className="theme-heading font-semibold">{item.student_name ?? '-'}</TD>
                        <TD className="capitalize">{item.mode}</TD>
                        <TD className={Number(item.amount) < 0 ? 'font-semibold text-rose-300' : 'theme-heading font-semibold'}>
                          {item.amount}
                          {item.is_edited && <span className="ml-2 rounded bg-yellow-500/20 px-1.5 py-0.5 text-xs text-yellow-400">Edited</span>}
                        </TD>
                        <TD className="max-w-[360px] truncate text-[#91a1bc]" title={item.notes ?? ''}>
                          {item.notes ?? '-'}
                        </TD>
                        <TD>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedEntry({
                                id: item.id,
                                student_name: item.student_name,
                                student_code: item.student_code,
                                amount: item.amount,
                                notes: item.notes
                              });
                              setRetractOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                        </TD>
                      </tr>
                    ))
                  )}
                </TBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <RetractSavingsDialog
        open={retractOpen}
        onOpenChange={setRetractOpen}
        entry={selectedEntry}
        onSuccess={() => {
          balances.refetch();
          entries.refetch();
        }}
      />
    </AppShell>
  );
}

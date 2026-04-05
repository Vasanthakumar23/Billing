'use client';

import { Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AppShell } from '@/components/app/shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Table, TBody, TD, TH, THead } from '@/components/ui/table';
import { useToast } from '@/components/ui/toaster';
import { apiFetch } from '@/lib/api';

type ExpenseItem = {
  id: string;
  expense_month: string;
  title: string;
  amount: string;
  notes?: string | null;
  created_at: string;
};

type ExpenseMonthly = {
  month: string;
  month_label: string;
  income_total: string;
  expense_total: string;
  net_total: string;
  items: ExpenseItem[];
};

type EditableExpense = {
  id?: string;
  title: string;
  amount: string;
  notes: string;
};

function toMonthDate(value: string) {
  return `${value}-01`;
}

function createEmptyExpense(): EditableExpense {
  return { title: '', amount: '', notes: '' };
}

function formatSavedDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export default function ExpensesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [items, setItems] = useState<EditableExpense[]>(() => [createEmptyExpense()]);

  const expenseMonth = useMemo(() => toMonthDate(month), [month]);
  const monthly = useQuery({
    queryKey: ['expensesMonthly', expenseMonth],
    queryFn: () => apiFetch<ExpenseMonthly>(`/expenses/monthly?month=${encodeURIComponent(expenseMonth)}`)
  });

  useEffect(() => {
    if (!monthly.data) return;
    if (monthly.data.items.length) {
      setItems(
        monthly.data.items.map((item) => ({
          id: item.id,
          title: item.title,
          amount: item.amount,
          notes: item.notes ?? ''
        }))
      );
      return;
    }
    setItems([createEmptyExpense()]);
  }, [monthly.data]);

  const saveExpenses = useMutation({
    mutationFn: () =>
      apiFetch<ExpenseMonthly>('/expenses/monthly', {
        method: 'PUT',
        body: JSON.stringify({
          month: expenseMonth,
          items: items
            .filter((item) => item.title.trim() !== '' || item.amount.trim() !== '' || item.notes.trim() !== '')
            .map((item) => ({
              title: item.title.trim(),
              amount: Number(item.amount || 0),
              notes: item.notes.trim() || null
            }))
        })
      }),
    onSuccess: (data) => {
      toast({ title: 'Expenses saved', description: `${data.items.length} expense rows recorded for ${data.month_label}` });
      qc.invalidateQueries({ queryKey: ['expensesMonthly', expenseMonth] });
    },
    onError: (e) => toast({ title: 'Save failed', description: String(e) })
  });

  function addRow() {
    setItems((current) => [...current, createEmptyExpense()]);
  }

  function removeRow(index: number) {
    setItems((current) => (current.length === 1 ? [createEmptyExpense()] : current.filter((_, i) => i !== index)));
  }

  function updateRow(index: number, patch: Partial<EditableExpense>) {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  const totalDraftExpense = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <AppShell
      title="Expenses"
      subtitle="Track monthly expenses with flexible line items and compare them against collected fee income."
      action={
        <div className="flex gap-3">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-[180px]" />
          <Button onClick={addRow}>
            <Plus className="h-4 w-4" />
            Add Expense Row
          </Button>
        </div>
      }
    >
      <div className="page-grid">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Income</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold text-white">
              {monthly.isLoading ? <Spinner /> : monthly.data?.income_total ?? '0'}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Expenses</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold text-white">
              {monthly.isLoading ? <Spinner /> : monthly.data?.expense_total ?? '0'}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Net</CardTitle>
            </CardHeader>
            <CardContent className={`text-3xl font-bold ${Number(monthly.data?.net_total ?? 0) < 0 ? 'text-rose-300' : 'text-white'}`}>
              {monthly.isLoading ? <Spinner /> : monthly.data?.net_total ?? '0'}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Add Expenses</CardTitle>
              <div className="mt-1 text-sm text-[#91a1bc]">
                Add the expense name and value for this month. Examples: Rent, EB Bill, Salary, Internet.
              </div>
            </div>
            <Button onClick={() => saveExpenses.mutate()} disabled={saveExpenses.isPending}>
              {saveExpenses.isPending ? <Spinner className="mr-2" /> : <Save className="h-4 w-4" />}
              Save Expenses
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-auto rounded-[24px] border border-[rgba(151,164,187,0.08)] bg-[rgba(255,255,255,0.02)]">
                <Table>
                  <THead>
                    <tr>
                      <TH>Expense Name</TH>
                      <TH>Value</TH>
                      <TH>Notes</TH>
                      <TH></TH>
                    </tr>
                  </THead>
                  <TBody>
                    {items.map((item, index) => (
                      <tr key={index}>
                      <TD>
                        <Input value={item.title} onChange={(e) => updateRow(index, { title: e.target.value })} placeholder="Rent" />
                      </TD>
                      <TD>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.amount}
                          onChange={(e) => updateRow(index, { amount: e.target.value })}
                          placeholder="0.00"
                        />
                      </TD>
                      <TD>
                        <Input value={item.notes} onChange={(e) => updateRow(index, { notes: e.target.value })} placeholder="Optional note" />
                      </TD>
                      <TD>
                        <Button type="button" variant="outline" size="sm" onClick={() => removeRow(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
            </div>
            <div className="text-sm text-[#91a1bc]">
              Draft expense total for this editor: <span className="font-semibold text-white">{totalDraftExpense.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saved Expense Rows</CardTitle>
          </CardHeader>
          <CardContent>
            {monthly.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-[#91a1bc]">
                <Spinner /> Loading
              </div>
            ) : monthly.isError ? (
              <div className="text-sm text-rose-300">Failed to load expenses</div>
            ) : monthly.data?.items.length ? (
              <div className="overflow-auto rounded-[24px] border border-[rgba(151,164,187,0.08)] bg-[rgba(255,255,255,0.02)]">
                <Table>
                  <THead>
                    <tr>
                      <TH>Saved Date</TH>
                      <TH>Name</TH>
                      <TH>Amount</TH>
                      <TH>Notes</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {monthly.data.items.map((item) => (
                      <tr key={item.id}>
                        <TD>{formatSavedDate(item.created_at)}</TD>
                        <TD className="font-semibold text-white">{item.title}</TD>
                        <TD>{item.amount}</TD>
                        <TD>{item.notes ?? '-'}</TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            ) : (
              <div className="text-sm text-[#91a1bc]">No expenses recorded for this month yet.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

'use client';

import { Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AppShell } from '@/components/app/shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [editorOpen, setEditorOpen] = useState(false);

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
      setEditorOpen(false);
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
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-10 w-[180px] rounded-xl" />
      }
    >
      <div className="page-grid">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="theme-subtle-surface rounded-[20px] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.14em] text-[#7484a1]">Income</div>
            <div className="theme-heading mt-1 text-2xl font-semibold">
              {monthly.isLoading ? <Spinner /> : monthly.data?.income_total ?? '0'}
            </div>
          </div>
          <div className="theme-subtle-surface rounded-[20px] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.14em] text-[#7484a1]">Expenses</div>
            <div className="theme-heading mt-1 text-2xl font-semibold">
              {monthly.isLoading ? <Spinner /> : monthly.data?.expense_total ?? '0'}
            </div>
          </div>
          <div className="theme-subtle-surface rounded-[20px] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.14em] text-[#7484a1]">Net</div>
            <div className={`mt-1 text-2xl font-semibold ${Number(monthly.data?.net_total ?? 0) < 0 ? 'text-rose-300' : 'theme-heading'}`}>
              {monthly.isLoading ? <Spinner /> : monthly.data?.net_total ?? '0'}
            </div>
          </div>
        </div>

        <Card className="mt-2 shadow-none">
          <CardContent className="space-y-3 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="theme-heading text-lg font-semibold">Saved Expense Rows</div>
                <div className="mt-1 text-sm text-[#91a1bc]">Review the saved expenses for the selected month.</div>
              </div>
              <Button className="h-10 rounded-xl" onClick={() => setEditorOpen(true)}>
                <Plus className="h-4 w-4" />
                Edit Expenses
              </Button>
            </div>
            {monthly.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-[#91a1bc]">
                <Spinner /> Loading
              </div>
            ) : monthly.isError ? (
              <div className="text-sm text-rose-300">Failed to load expenses</div>
            ) : monthly.data?.items.length ? (
              <div className="overflow-auto">
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
                      <tr key={item.id} className="bg-[var(--panel)]">
                        <TD>{formatSavedDate(item.created_at)}</TD>
                        <TD className="theme-heading font-semibold">{item.title}</TD>
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

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Edit Expenses</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="text-sm text-[#91a1bc]">
                Add the expense name and value for this month. Examples: Rent, EB Bill, Salary, Internet.
              </div>
              <Button variant="outline" className="h-10 rounded-xl" onClick={addRow}>
                <Plus className="h-4 w-4" />
                Add Expense Row
              </Button>
            </div>
            <div className="overflow-auto">
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
                    <tr key={index} className="bg-[var(--panel)]">
                      <TD>
                        <Input value={item.title} onChange={(e) => updateRow(index, { title: e.target.value })} placeholder="Rent" className="h-10 rounded-xl" />
                      </TD>
                      <TD>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.amount}
                          onChange={(e) => updateRow(index, { amount: e.target.value })}
                          placeholder="0.00"
                          className="h-10 rounded-xl"
                        />
                      </TD>
                      <TD>
                        <Input value={item.notes} onChange={(e) => updateRow(index, { notes: e.target.value })} placeholder="Optional note" className="h-10 rounded-xl" />
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
              Draft expense total: <span className="theme-heading font-semibold">{totalDraftExpense.toFixed(2)}</span>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveExpenses.mutate()} disabled={saveExpenses.isPending}>
              {saveExpenses.isPending ? <Spinner className="mr-2" /> : <Save className="h-4 w-4" />}
              Save Expenses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

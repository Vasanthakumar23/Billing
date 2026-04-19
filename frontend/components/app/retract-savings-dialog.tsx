'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toaster';
import { apiFetch } from '@/lib/api';

export type SavingsRow = {
  id: string;
  student_name?: string | null;
  student_code?: string | null;
  amount: string;
  notes?: string | null;
};

const schema = z.object({
  entry_type: z.enum(['plus', 'minus']),
  amount: z.coerce.number().int('Must be a whole number').positive('Must be greater than zero'),
  notes: z.string().max(500).optional()
});

type Values = z.infer<typeof schema>;

export function RetractSavingsDialog({
  open,
  onOpenChange,
  entry,
  onSuccess
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entry: SavingsRow | null;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const form = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (entry) {
      const amt = Number(entry.amount);
      form.reset({
        entry_type: amt >= 0 ? 'plus' : 'minus',
        amount: Math.abs(amt),
        notes: entry.notes ?? ''
      });
    }
  }, [entry, form]);

  const edit = useMutation({
    mutationFn: async ({ entry_type, amount, notes }: Values) => {
      if (!entry) throw new Error('No entry selected');
      return apiFetch(`/savings/${entry.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          amount: entry_type === 'minus' ? -Math.abs(amount) : Math.abs(amount),
          notes: notes ?? null
        })
      });
    },
    onSuccess: () => {
      toast({ title: 'Entry updated' });
      onOpenChange(false);
      onSuccess();
    },
    onError: (e) => toast({ title: 'Update failed', description: String(e) })
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!entry) throw new Error('No entry selected');
      return apiFetch(`/savings/${entry.id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast({ title: 'Entry deleted' });
      onOpenChange(false);
      onSuccess();
    },
    onError: (e) => toast({ title: 'Delete failed', description: String(e) })
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Savings Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => edit.mutate(v))}>
          <DialogBody>
            <div className="space-y-3">
              {entry && (
                <div className="text-sm text-[#91a1bc]">
                  Editing entry for <span className="font-semibold text-white">{entry.student_name ?? '-'}</span> ({entry.student_code ?? '-'})
                </div>
              )}
              <div>
                <div className="theme-heading mb-2 text-sm font-medium">Entry type</div>
                <select className="theme-select h-10 w-full rounded-xl px-4 text-sm outline-none" {...form.register('entry_type')}>
                  <option value="plus">Plus</option>
                  <option value="minus">Minus</option>
                </select>
              </div>
              <div>
                <div className="theme-heading mb-2 text-sm font-medium">Amount</div>
                <Input type="number" step="1" min="1" {...form.register('amount')} />
                {form.formState.errors.amount && (
                  <div className="mt-1 text-xs text-rose-300">{form.formState.errors.amount.message}</div>
                )}
              </div>
              <div>
                <div className="theme-heading mb-2 text-sm font-medium">Notes</div>
                <Input {...form.register('notes')} placeholder="Optional remarks" />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              type="button"
              variant="outline"
              className="text-rose-400 hover:text-rose-300"
              disabled={remove.isPending || edit.isPending || !entry}
              onClick={() => remove.mutate()}
            >
              {remove.isPending ? <Spinner className="mr-2" /> : null}
              Delete
            </Button>
            <Button type="submit" disabled={edit.isPending || remove.isPending || !entry}>
              {edit.isPending ? <Spinner className="mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

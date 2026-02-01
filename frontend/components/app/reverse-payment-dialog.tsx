'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toaster';
import { apiFetch } from '@/lib/api';

export type PaymentRow = {
  id: string;
  receipt_no: string;
  amount: string;
  mode: string;
};

const schema = z.object({
  reason: z.string().min(1).max(300),
  amount: z
    .union([z.string().length(0), z.coerce.number().refine((v) => v !== 0, 'Amount must be non-zero')])
    .optional()
});

type Values = z.infer<typeof schema>;

export function ReversePaymentDialog({
  open,
  onOpenChange,
  payment,
  onSuccess
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  payment: PaymentRow | null;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { reason: '', amount: '' }
  });

  const reverse = useMutation({
    mutationFn: async (values: Values) => {
      if (!payment) throw new Error('No payment selected');
      const body: any = { reason: values.reason };
      if (typeof values.amount === 'number') body.amount = values.amount;
      return apiFetch(`/payments/${payment.id}/reverse`, { method: 'POST', body: JSON.stringify(body) });
    },
    onSuccess: () => {
      toast({ title: 'Reversal recorded' });
      form.reset();
      onOpenChange(false);
      onSuccess();
    },
    onError: (e) => toast({ title: 'Reversal failed', description: String(e) })
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) form.reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reverse Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => reverse.mutate(v))}>
          <DialogBody>
            <div className="space-y-3">
              <div className="text-sm text-slate-600">
                {payment ? (
                  <div>
                    Reversing <span className="font-semibold text-slate-900">{payment.receipt_no}</span> ({payment.mode},{' '}
                    {payment.amount})
                  </div>
                ) : (
                  'Select a payment'
                )}
              </div>

              <div>
                <div className="mb-1 text-sm text-slate-600">Reason</div>
                <Input {...form.register('reason')} placeholder="Reason for reversal" />
                {form.formState.errors.reason ? (
                  <div className="mt-1 text-xs text-red-600">{form.formState.errors.reason.message}</div>
                ) : null}
              </div>

              <div>
                <div className="mb-1 text-sm text-slate-600">Amount (optional)</div>
                <Input type="number" step="0.01" {...form.register('amount')} placeholder="Leave blank to reverse full amount" />
                {form.formState.errors.amount ? (
                  <div className="mt-1 text-xs text-red-600">{String(form.formState.errors.amount.message)}</div>
                ) : null}
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={reverse.isPending || !payment}>
              {reverse.isPending ? <Spinner className="mr-2" /> : null}
              Reverse
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


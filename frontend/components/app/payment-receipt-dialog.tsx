'use client';

import { useQuery } from '@tanstack/react-query';

import { Receipt, type ReceiptData } from '@/components/app/receipt';
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { apiFetch } from '@/lib/api';

export function PaymentReceiptDialog({
  open,
  onOpenChange,
  paymentId
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  paymentId: string | null;
}) {
  const receipt = useQuery({
    queryKey: ['paymentReceipt', paymentId],
    enabled: open && Boolean(paymentId),
    queryFn: () => apiFetch<ReceiptData>(`/payments/${paymentId}/receipt`)
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receipt</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {receipt.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Spinner /> Loading
            </div>
          ) : receipt.isError ? (
            <div className="text-sm text-red-600">Failed to load receipt</div>
          ) : receipt.data ? (
            <Receipt data={receipt.data} onClose={() => onOpenChange(false)} />
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

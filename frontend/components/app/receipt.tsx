'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type ReceiptData = {
  receipt_no: string;
  student_id: string;
  amount: string;
  mode: string;
  paid_at: string;
  reference_no?: string | null;
  notes?: string | null;
};

export function Receipt({ data, onClose }: { data: ReceiptData; onClose: () => void }) {
  return (
    <div className="space-y-3">
      <Card className="print:border-0 print:shadow-none">
        <CardHeader className="print:border-0">
          <CardTitle>Receipt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm">
            <div className="text-slate-600">Receipt No</div>
            <div className="font-semibold">{data.receipt_no}</div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-slate-600">Amount</div>
              <div className="font-semibold">{data.amount}</div>
            </div>
            <div>
              <div className="text-slate-600">Mode</div>
              <div className="font-semibold">{data.mode}</div>
            </div>
          </div>
          <div className="text-sm">
            <div className="text-slate-600">Paid At</div>
            <div className="font-semibold">{new Date(data.paid_at).toLocaleString()}</div>
          </div>
          {data.reference_no ? (
            <div className="text-sm">
              <div className="text-slate-600">Reference</div>
              <div className="font-semibold">{data.reference_no}</div>
            </div>
          ) : null}
          {data.notes ? (
            <div className="text-sm">
              <div className="text-slate-600">Notes</div>
              <div className="font-semibold">{data.notes}</div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex gap-2 print:hidden">
        <Button onClick={() => window.print()}>Print</Button>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}


'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type ReceiptData = {
  id: string;
  receipt_no: string;
  student_id: string;
  student_name?: string | null;
  student_code?: string | null;
  amount: string;
  mode: string;
  paid_at: string;
  fee_period_label?: string | null;
  reference_no?: string | null;
  notes?: string | null;
  next_due_label?: string | null;
  pending_amount?: string | null;
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
            <div className="text-[#91a1bc]">Receipt No</div>
            <div className="font-semibold text-white">{data.receipt_no}</div>
          </div>
          <div className="text-sm">
            <div className="text-[#91a1bc]">Student</div>
            <div className="font-semibold text-white">
              {data.student_name ?? 'Student'}{data.student_code ? ` (${data.student_code})` : ''}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-[#91a1bc]">Amount</div>
              <div className="font-semibold text-white">{data.amount}</div>
            </div>
            <div>
              <div className="text-[#91a1bc]">Mode</div>
              <div className="font-semibold text-white">{data.mode}</div>
            </div>
          </div>
          {data.fee_period_label ? (
            <div className="text-sm">
              <div className="text-[#91a1bc]">Fee Period</div>
              <div className="font-semibold text-white">{data.fee_period_label}</div>
            </div>
          ) : null}
          <div className="text-sm">
            <div className="text-[#91a1bc]">Paid At</div>
            <div className="font-semibold text-white">{new Date(data.paid_at).toLocaleString()}</div>
          </div>
          {data.reference_no || data.notes ? (
            <div className="text-sm">
              <div className="text-[#91a1bc]">Remarks</div>
              <div className="font-semibold text-white">{data.reference_no ?? data.notes}</div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex gap-2 print:hidden">
        <Button variant="outline" onClick={() => window.location.assign(`/api/backend/payments/${data.id}/receipt.pdf`)}>
          Download PDF
        </Button>
        <Button onClick={() => window.print()}>Print</Button>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

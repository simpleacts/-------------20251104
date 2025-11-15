import { Row } from '@shared/types/common';

// --- Accounting Tool ---
export interface Bill extends Row {
  id: string;
  customer_id: string;
  invoice_number?: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  status: 'unpaid' | 'paid' | 'overdue';
  notes?: string;
  file_attachment_url?: string;
  payment_date?: string | null;
  is_locked?: boolean;
  billing_month?: string;
}

export interface BillItem extends Row {
  id: string;
  bill_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}


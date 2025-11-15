import { Database, Row } from '@shared/types';
import { OrderDetail } from '@shared/types/estimator';
import { BrandColor } from '@shared/types/product';
import { QuoteTask } from '@shared/types/tasks';

export interface QuoteData {
    quote: Row & { database: Partial<Database> };
    customer: Row | undefined;
    items: OrderDetail[];
    product: Row;
    uniqueColors: BrandColor[];
    uniqueSizes: { sizeName: string }[];
    quantities: Record<string, Record<string, number>>;
    totals: {
        sizeTotals: Record<string, number>;
        colorTotals: Record<string, number>;
        grandTotal: number;
    };
    proofingImages: { name: string; dataUrl: string }[];
}

export interface EnrichedQuote extends Row {
    id: string | null;
    customer: Row | null;
    product: Row | null;
    proofingImage: string | null;
    items: OrderDetail[];
    tasks: QuoteTask[];
    document_type?: string | null;
    quote_code?: string | null;
    subject?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    virtual_id?: string | null;
    customer_id?: string | null;
    total_cost_ex_tax?: number | null;
    shipping_cost?: number | null;
    tax?: number | null;
    total_cost_in_tax?: number | null;
    last_used_template_id?: string | null;
    payment_due_date?: string | null;
    internal_notes?: string | null;
    quote_status?: string | null;
    shipping_date?: string | null;
    ordered_at?: string | null;
    production_status?: string | null;
    data_confirmation_status?: string | null;
    original_quote_id?: string | null;
    estimated_delivery_date?: string | null;
    payment_status?: string | null;
    shipping_status?: string | null;
}

export interface GanttTask {
    id: string; // quote_task_id
    quoteId: string;
    taskMasterId: string;
    name: string;
    start: Date;
    end: Date;
    color: string;
    originalTask: QuoteTask;
}

export interface GanttQuote extends EnrichedQuote {
    ganttTasks: GanttTask[];
    minDate: Date;
    maxDate: Date;
    quantity: number;
}


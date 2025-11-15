import { Row } from './common';

// --- Task Management ---
export interface TaskMaster extends Row {
    id: string;
    name: string;
    category?: string;
    default_value?: number;
    unit?: string; // データベースのtime_unitsテーブルから取得（例: '日', '時間', '分', '秒'）
    calculation_logic?: string;
    days_required?: number;
    // FIX: Add missing 'sort_order' property.
    sort_order?: number;
    daily_capacity?: number;
}

export interface QuoteTask extends Row {
    id: string;
    quote_id: string;
    task_master_id: string;
    status: 'pending' | 'in_progress' | 'completed' | 'skipped';
    due_date: string | null;
    completed_at: string | null;
    assignee_id: string | null;
    related_email_id?: string | null; // Added for email integration
    // FIX: Add missing 'notes' property.
    notes?: string | null;
}

// FIX: Moved EnrichedTask definition after QuoteTask to fix dependency issue.
export interface EnrichedTask extends QuoteTask {
  customerName: string | null;
  quoteCode: string | null;
  taskName: string | null;
  taskCategory: string | null;
  quoteSubject: string | null;
}

export interface TaskGenerationRule extends Row {
    id: string;
    name: string;
    condition_json: string;
    task_ids_json: string;
}

// FIX: Add ValidationIssue interface to resolve import error in AITaskManager.
export interface ValidationIssue {
    type: 'error' | 'warning';
    message: string;
    quoteId: string;
    quoteCode: string;
    taskId: string;
    taskName: string;
}


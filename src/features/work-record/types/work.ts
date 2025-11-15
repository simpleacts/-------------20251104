import { Row } from '@shared/types/common';

// --- Work Record Tool ---
export interface WorkSession extends Row {
    id: string;
    user_id: string | null;
    task_master_id: string | null;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    notes: string | null;
}

export interface WorkSessionQuote extends Row {
    id: string;
    work_session_id: string;
    quote_id: string;
}

// FIX: Add LogFormData interface to be exported globally.
export interface LogFormData {
    notes: string;
    selectedQuoteIds: string[];
    isCreatingNewQuote: boolean;
    newQuoteSubject: string;
}



import { Row } from '@shared/types/common';

// --- Email Tool Types ---
export interface Email extends Row {
    id: string;
    account_id: string;
    quote_id: string | null;
    message_id_hash?: string;
    uid?: number;
    from_address: string;
    to_address: string;
    cc_address?: string;
    subject: string;
    body: string;
    sent_at: string;
    direction: 'incoming' | 'outgoing';
    status: 'draft' | 'sent' | 'received' | 'read' | 'failed' | 'trashed';
    previous_status?: 'draft' | 'sent' | 'received' | 'read' | 'failed';
    trashed_at?: string;
    is_triaged: boolean;
    ai_summary: string | null;
    ai_category: string | null;
    ai_triage_data: string | null; // Full JSON response from AI
}

export interface EmailAccount extends Row {
    id: string;
    name: string;
    email_address: string;
    color: string;
    account_type: 'gmail' | 'standard';
    
    // For standard IMAP/SMTP
    incoming_server_type?: 'imap' | 'pop3';
    incoming_server_host?: string;
    incoming_server_port?: number;
    incoming_server_user?: string;
    incoming_server_password?: string;
    incoming_server_ssl?: boolean;

    smtp_server_host?: string;
    smtp_server_port?: number;
    smtp_server_user?: string;
    smtp_server_password?: string;
    smtp_server_ssl?: boolean;

    // For Gmail
    is_google_oauth?: boolean;
    google_refresh_token?: string;

    // Sync state
    last_sync_uid?: string;
    signature?: string;
}

export interface EmailAttachment extends Row {
    id: string;
    email_id: string;
    filename: string;
    file_type: string;
    file_size: number;
    base64_data: string;
}

export interface AITriageCategoryMapping {
    id: string;
    category: string;
    keywords: string;
}

export interface EmailTemplate extends Row {
    id: string;
    title: string;
    content: string;
}

// FIX: Add TriageResult interface to resolve import error in AITriageView.
export interface TriageResult {
    summary: string;
    category: 'inquiry' | 'request' | 'notification' | 'spam' | 'other';
    action_suggestion: 'create_task' | 'reply' | 'none';
    task_details?: {
        title: string;
        master_id_suggestion?: string;
    };
    reply_draft?: {
        subject: string;
        body: string;
    };
}


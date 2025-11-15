
import React, { useCallback, useEffect, useMemo, useState } from 'react';
// FIX: Corrected import path for types.
import { useDatabase } from '@core/contexts/DatabaseContext';
import { Database, EnrichedTask, Row } from '@shared/types';
import { Email, TriageResult } from '@features/email-management/types';
import { triageEmail } from '@shared/services/geminiService';
import { SparklesIcon, SpinnerIcon } from '@components/atoms';
import OrderSearchModal from '@features/proofing-tool/modals/OrderSearchModal';

interface AITriageViewProps {
    selectedItem: EnrichedTask | Email | null;
}

const AITriageView: React.FC<AITriageViewProps> = ({ selectedItem }) => {
    const { database, setDatabase } = useDatabase();
    const [isTriaging, setIsTriaging] = useState(false);
    const [isQuoteLinkModalOpen, setIsQuoteLinkModalOpen] = useState(false);

    const email = useMemo(() => {
        if (!selectedItem) return null;
        if ('task_master_id' in selectedItem) { // It's an EnrichedTask
            if (selectedItem.related_email_id) {
                return (database?.emails?.data as Email[] || []).find(e => e.id === selectedItem.related_email_id) || null;
            }
            return null;
        }
        // It's an Email
        return selectedItem;
    }, [selectedItem, database?.emails]);
    
    const selectedEmailAttachments = useMemo(() => {
        if (!email || !database?.email_attachments) return [];
        return (database.email_attachments.data as any[]).filter(att => att.email_id === email.id);
    }, [email, database?.email_attachments]);

    const handleTriageEmail = useCallback(async (emailToTriage: Email) => {
        if (!emailToTriage || emailToTriage.is_triaged || isTriaging) return;
        setIsTriaging(true);
        try {
            const result = await triageEmail(emailToTriage);
            setDatabase(db => {
                if (!db) return null;
                const newDb = JSON.parse(JSON.stringify(db));
                if (!newDb.emails || !Array.isArray(newDb.emails.data)) return newDb;
                const emailIndex = newDb.emails.data.findIndex((e: Row) => e.id === emailToTriage.id);
                if (emailIndex > -1) {
                    const updatedEmail = newDb.emails.data[emailIndex];
                    updatedEmail.is_triaged = true;
                    updatedEmail.ai_summary = result.summary;
                    updatedEmail.ai_category = result.category;
                    updatedEmail.ai_triage_data = JSON.stringify(result);
                }
                return newDb;
            });
        } catch (error) {
            console.error("Failed to triage email:", error);
        } finally {
            setIsTriaging(false);
        }
    }, [setDatabase, isTriaging]);

    const handleCreateTaskFromAI = useCallback(() => { /* ... Needs implementation ... */ alert('This function is not fully implemented in AITriageView yet.'); }, []);
    const handleReplyFromAI = useCallback(() => { /* ... Needs implementation ... */ alert('This function is not fully implemented in AITriageView yet.'); }, []);
    
    const handleLinkToQuote = (quote: Row) => {
        if (!email) return;
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            if (!newDb.emails || !Array.isArray(newDb.emails.data)) return newDb;
            const emailIndex = newDb.emails.data.findIndex((e:Row) => e.id === email.id);
            if(emailIndex > -1) {
                newDb.emails.data[emailIndex].quote_id = quote.id;
            }
            return newDb;
        });
        setIsQuoteLinkModalOpen(false);
    };

    useEffect(() => {
        if (email && email.direction === 'incoming' && !email.is_triaged && !isTriaging) {
            handleTriageEmail(email);
        }
    }, [email, handleTriageEmail, isTriaging]);

    if (!selectedItem) {
         return <div className="flex items-center justify-center h-full text-gray-500">タスクまたはメールを選択してください</div>;
    }
    
    if (!email) {
         return <div className="flex items-center justify-center h-full text-gray-500">関連するメールが見つかりません。</div>;
    }

    return (
        <div className="space-y-2 h-full flex flex-col">
            <div className="flex-shrink-0">
                {isTriaging && (
                    <div className="mb-2 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-md text-sm flex items-center gap-2">
                        <SpinnerIcon className="w-4 h-4"/> AIがメール内容を解析中...
                    </div>
                )}
                {email.is_triaged && email.ai_triage_data && (
                    <div className="mb-2 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-md space-y-2 border-l-4 border-purple-400">
                        <h4 className="font-bold text-sm flex items-center gap-2"><SparklesIcon className="w-4 h-4 text-purple-600"/>AIアシスタント</h4>
                        <p className="text-xs"><strong>概要:</strong> {email.ai_summary}</p>
                        <p className="text-xs"><strong>カテゴリ:</strong> {email.ai_category}</p>
                        <div className="flex gap-2 pt-2">
                            {(JSON.parse(email.ai_triage_data) as TriageResult).action_suggestion === 'create_task' && <button onClick={handleCreateTaskFromAI} className="px-2 py-1 text-xs bg-purple-200 rounded">タスクを作成</button>}
                            {(JSON.parse(email.ai_triage_data) as TriageResult).action_suggestion === 'reply' && <button onClick={handleReplyFromAI} className="px-2 py-1 text-xs bg-purple-200 rounded">AIで返信を作成</button>}
                        </div>
                    </div>
                )}
                <h3 className="text-lg font-bold">{email.subject}</h3>
                <div className="text-sm mt-2 space-y-1 text-gray-600 dark:text-gray-400">
                    <p><strong>From:</strong> {email.from_address}</p>
                    <p><strong>To:</strong> {email.to_address}</p>
                    <p><strong>Date:</strong> {new Date(email.sent_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 mt-4">
                    <button onClick={() => alert('Reply action is handled by AIReplyAssistant')} className="px-3 py-1 text-sm bg-button-muted-bg text-button-muted dark:bg-button-muted-bg-dark dark:text-button-muted-dark rounded hover:opacity-90">返信</button>
                    <button onClick={() => setIsQuoteLinkModalOpen(true)} className="px-3 py-1 text-sm bg-button-muted-bg text-button-muted dark:bg-button-muted-bg-dark dark:text-button-muted-dark rounded hover:opacity-90">案件に紐付け</button>
                </div>
            </div>
            <div className="flex-grow min-h-0 mt-4 border-t pt-4">
                <div className="prose prose-sm max-w-none h-full overflow-y-auto">
                    <div dangerouslySetInnerHTML={{ __html: (email.body || '').includes('<') ? email.body : (email.body || '').replace(/\n/g, '<br />') }} />
                </div>
            </div>
            {selectedEmailAttachments.length > 0 && (
                <div className="flex-shrink-0 mt-4 border-t pt-2">
                    <h4 className="text-sm font-semibold">添付ファイル</h4>
                    <ul className="text-xs space-y-1 mt-1">
                        {selectedEmailAttachments.map(att => (
                            <li key={att.id}>
                                <a href="#" className="text-blue-600 hover:underline">{att.filename} ({(att.file_size / 1024).toFixed(1)} KB)</a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {database && (
                <OrderSearchModal 
                    isOpen={isQuoteLinkModalOpen}
                    onClose={() => setIsQuoteLinkModalOpen(false)}
                    onSelect={handleLinkToQuote}
                    database={database as Database}
                />
            )}
        </div>
    );
};

export default AITriageView;

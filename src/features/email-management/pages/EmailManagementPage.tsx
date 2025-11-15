import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { fetchTables } from '@core/data/db.live';
import { Row } from '@shared/types';
import { Email, EmailAccount, EmailAttachment } from '../types';
import { SpinnerIcon } from '@components/atoms';
import EmailDetailPanel from '../organisms/EmailDetailPanel';
import EmailListPanel from '../organisms/EmailListPanel';
import EmailSidebar from '../organisms/EmailSidebar';

const fileToAttachment = (file: File, emailId: string): Promise<EmailAttachment> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64Data = (reader.result as string).split(',')[1];
            resolve({
                id: `att_${Date.now()}_${file.name}`,
                email_id: emailId,
                filename: file.name,
                file_type: file.type,
                file_size: file.size,
                base64_data: base64Data
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const EmailTool: React.FC = () => {
    const { database, setDatabase } = useDatabase();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
    const [activeFolder, setActiveFolder] = useState<string>('inbox');
    const [isComposing, setIsComposing] = useState(false);
    const [composeData, setComposeData] = useState({ to: '', subject: '', body: '', account_id: '' });
    const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
    const [draftId, setDraftId] = useState<string | null>(null);
    const [isQuoteLinkModalOpen, setIsQuoteLinkModalOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const loadData = async () => {
            if (!database) { setIsLoading(true); return; }
            setIsLoading(true);
            setError(null);
            try {
                const requiredTables = ['email_accounts', 'emails', 'email_attachments', 'quotes', 'customers'];
                const missingTables = requiredTables.filter(t => !database[t]);
                if (missingTables.length > 0) {
                    const data = await fetchTables(missingTables, { toolName: 'email-tool' });
                    setDatabase(prev => ({...(prev || {}), ...data}));
                } else {
                    setIsLoading(false);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'メールデータの読み込みに失敗しました。');
                setIsLoading(false);
            }
        };
        loadData();
    }, [database, setDatabase]);

    const accounts = useMemo(() => (database?.email_accounts?.data as EmailAccount[]) || [], [database?.email_accounts]);
    const emails = useMemo(() => (database?.emails?.data as Email[]) || [], [database?.emails]);
    const accountsMap = useMemo(() => new Map(accounts.map(acc => [acc.id, acc])), [accounts]);

    const filteredEmails = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        return emails
            .filter(email => {
                if (activeFolder === 'inbox') return email.direction === 'incoming' && email.status !== 'trashed';
                if (activeFolder === 'sent') return email.direction === 'outgoing' && email.status === 'sent';
                if (activeFolder === 'drafts') return email.status === 'draft';
                if (activeFolder === 'trash') return email.status === 'trashed';
                return true;
            })
            .filter(email => {
                if (!searchTerm) return true;
                return (email.subject || '').toLowerCase().includes(lowerSearch) ||
                       (email.from_address || '').toLowerCase().includes(lowerSearch) ||
                       (email.to_address || '').toLowerCase().includes(lowerSearch) ||
                       (email.body || '').toLowerCase().includes(lowerSearch);
            })
            .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
    }, [emails, activeFolder, searchTerm]);
    
    const selectedEmail = useMemo(() => emails.find(e => e.id === selectedEmailId), [emails, selectedEmailId]);

    const handleDelete = useCallback((emailId: string) => {
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            const emailIndex = newDb.emails.data.findIndex((e: Row) => e.id === emailId);
            if (emailIndex > -1) {
                if(newDb.emails.data[emailIndex].status === 'trashed') {
                    // Permanently delete
                    newDb.emails.data.splice(emailIndex, 1);
                    newDb.email_attachments.data = newDb.email_attachments.data.filter((att: Row) => att.email_id !== emailId);
                } else {
                    // Move to trash
                    newDb.emails.data[emailIndex].previous_status = newDb.emails.data[emailIndex].status;
                    newDb.emails.data[emailIndex].status = 'trashed';
                    newDb.emails.data[emailIndex].trashed_at = new Date().toISOString();
                }
            }
            return newDb;
        });
        if (selectedEmailId === emailId) setSelectedEmailId(null);
    }, [setDatabase, selectedEmailId]);

    const handleSelectEmail = (email: Email) => {
        if (email.status === 'draft') {
            setSelectedEmailId(null);
            setIsComposing(true);
            setDraftId(email.id);
            setComposeData({ to: email.to_address, subject: email.subject, body: email.body, account_id: email.account_id });
            setAttachments((database?.email_attachments?.data as EmailAttachment[] || []).filter(a => a.email_id === email.id));
        } else {
            setSelectedEmailId(email.id);
            setIsComposing(false);
            setDraftId(null);
        }
    };
    
    const handleCompose = () => {
        setIsComposing(true);
        setSelectedEmailId(null);
        setDraftId(null);
        setComposeData({ to: '', subject: '', body: '', account_id: accounts[0]?.id || '' });
        setAttachments([]);
    };
    
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newAttachments: EmailAttachment[] = [...attachments];
            for (const file of Array.from(e.target.files)) {
                const attachment = await fileToAttachment(file, draftId || `draft_${Date.now()}`);
                newAttachments.push(attachment);
            }
            setAttachments(newAttachments);
        }
    };

    const handleSendEmail = async () => {
        if (!composeData.to || !composeData.account_id) return;
        setIsSending(true);
        const fromAccount = accountsMap.get(composeData.account_id);
        if (!fromAccount) { alert("送信元アカウントが見つかりません。"); setIsSending(false); return; }
        
        const signature = fromAccount.signature || '';
        const bodyWithSignature = `${composeData.body}\n\n${signature}`;

        try {
            const response = await fetch('api/send_mail.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'general_compose',
                    email: composeData.to,
                    data: { 
                        ...composeData,
                        body: bodyWithSignature,
                        from_address: fromAccount.email_address, 
                        from_name: fromAccount.name, 
                        quote_id: selectedEmail?.quote_id, 
                        account_id: fromAccount.id,
                        attachments 
                    },
                }),
            });
            if (!response.ok) throw new Error(await response.text());
            
            setDatabase(db => {
                if(!db) return null;
                const newDb = JSON.parse(JSON.stringify(db));
                if (draftId) { // If it was a draft, update it to sent
                    const index = newDb.emails.data.findIndex((e: Row) => e.id === draftId);
                    if (index > -1) {
                         newDb.emails.data[index] = { ...newDb.emails.data[index], ...composeData, body: bodyWithSignature, status: 'sent', direction: 'outgoing', sent_at: new Date().toISOString() };
                    }
                }
                return newDb;
            });

            alert('メールを送信しました。');
            setIsComposing(false);
            setDraftId(null);
        } catch (e) {
            alert(`メールの送信に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setIsSending(false);
        }
    };

    if (isLoading) {
        return <div className="flex h-full w-full items-center justify-center"><SpinnerIcon className="w-12 h-12 text-brand-primary" /></div>;
    }
    if (error) {
        return <div className="text-red-600 p-4">{error}</div>;
    }

    return (
        <>
            <div className="flex h-full gap-1">
                <div className="w-1/5 bg-container-bg dark:bg-container-bg-dark rounded-lg flex flex-col">
                    <EmailSidebar
                        accounts={accounts}
                        activeFolder={activeFolder}
                        onFolderSelect={setActiveFolder}
                        onCompose={handleCompose}
                    />
                </div>

                <div className="w-2/5 bg-base-100 dark:bg-base-dark-200 rounded-lg flex flex-col overflow-hidden border">
                    <EmailListPanel
                        emails={filteredEmails}
                        accountsMap={accountsMap}
                        selectedEmailId={selectedEmailId}
                        searchTerm={searchTerm}
                        onSearchTermChange={setSearchTerm}
                        onSelectEmail={handleSelectEmail}
                        onDeleteEmail={(e, id) => { e.stopPropagation(); handleDelete(id); }}
                    />
                </div>

                <div className="w-2/5 bg-base-100 dark:bg-base-dark-200 rounded-lg p-4 flex flex-col border">
                    <EmailDetailPanel
                        isComposing={isComposing}
                        selectedItem={selectedEmail}
                        composeData={composeData}
                        onDataChange={(field, value) => setComposeData(prev => ({ ...prev, [field]: value }))}
                        attachments={attachments}
                        onAttachmentsChange={setAttachments}
                        onSend={handleSendEmail}
                        isSending={isSending}
                        accounts={accounts}
                        handleFileChange={handleFileChange}
                    />
                </div>
            </div>
        </>
    );
};

export default EmailTool;
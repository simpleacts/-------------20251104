import React, { useRef } from 'react';
import { Row } from '@shared/types';
import { PaperAirplaneIcon, PaperclipIcon, SpinnerIcon, TrashIcon } from '@components/atoms';
import { EmailAttachment } from '../types';

interface EmailComposerProps {
    composeData: { to: string; subject: string; body: string; account_id: string };
    onDataChange: (field: string, value: any) => void;
    attachments: EmailAttachment[];
    onAttachmentsChange: (attachments: EmailAttachment[]) => void;
    onSend: () => void;
    isSending: boolean;
    accounts: Row[];
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const EmailComposer: React.FC<EmailComposerProps> = ({ composeData, onDataChange, attachments, onAttachmentsChange, onSend, isSending, accounts, handleFileChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const removeAttachment = (index: number) => {
        onAttachmentsChange(attachments.filter((_, i) => i !== index));
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center p-2 border-b border-default dark:border-default-dark">
                <label htmlFor="email-account-select" className="text-sm text-muted dark:text-muted-dark w-20">差出人:</label>
                <select
                    id="email-account-select"
                    name="account_id"
                    value={composeData.account_id}
                    onChange={e => onDataChange('account_id', e.target.value)}
                    className="w-full p-1 bg-transparent focus:outline-none"
                >
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} &lt;{acc.email_address}&gt;</option>)}
                </select>
            </div>
            <label htmlFor="email-to" className="sr-only">宛先</label>
            <input
                id="email-to"
                type="text"
                name="to"
                placeholder="宛先"
                value={composeData.to}
                onChange={e => onDataChange('to', e.target.value)}
                className="p-2 border-b border-default dark:border-default-dark bg-transparent focus:outline-none"
            />
            <label htmlFor="email-subject" className="sr-only">件名</label>
            <input
                id="email-subject"
                type="text"
                name="subject"
                placeholder="件名"
                value={composeData.subject}
                onChange={e => onDataChange('subject', e.target.value)}
                className="p-2 border-b border-default dark:border-default-dark bg-transparent focus:outline-none"
            />
            <label htmlFor="email-body" className="sr-only">本文</label>
            <textarea
                id="email-body"
                name="body"
                value={composeData.body}
                onChange={e => onDataChange('body', e.target.value)}
                className="flex-grow p-2 overflow-y-auto focus:outline-none bg-transparent resize-none"
                placeholder="本文を入力..."
            />
            {attachments.length > 0 && (
                <div className="p-2 border-t border-default dark:border-default-dark space-y-1">
                    {attachments.map((att, index) => (
                        <div key={index} className="flex items-center justify-between gap-2 text-xs bg-gray-200 px-2 py-1 rounded-full">
                            <span className="truncate">{att.filename} ({(att.file_size / 1024).toFixed(1)} KB)</span>
                            <button onClick={() => removeAttachment(index)}><TrashIcon className="w-3 h-3 text-red-500"/></button>
                        </div>
                    ))}
                </div>
            )}
            <div className="p-2 border-t border-default dark:border-default-dark flex justify-between items-center">
                <label htmlFor="email-attachment" className="p-2 text-gray-500 hover:text-brand-primary cursor-pointer" aria-label="ファイルを添付">
                    <PaperclipIcon className="w-5 h-5"/>
                    <input id="email-attachment" type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
                </label>
                <button onClick={onSend} disabled={isSending} className="flex items-center gap-2 bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark font-semibold py-2 px-4 rounded-lg disabled:opacity-50">
                    {isSending ? <SpinnerIcon className="w-5 h-5"/> : <PaperAirplaneIcon className="w-5 h-5"/>}
                    {isSending ? '送信中...' : '送信'}
                </button>
            </div>
        </div>
    );
};

export default EmailComposer;

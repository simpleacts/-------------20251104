import { SparklesIcon, TrashIcon } from '@components/atoms';
import { Row } from '@shared/types';
import React from 'react';
import { Email } from '../types';

interface EmailListItemProps {
    email: Email;
    account?: Row;
    isSelected: boolean;
    onSelect: (email: Email) => void;
    onDelete: (e: React.MouseEvent, emailId: string) => void;
}

const EmailListItem: React.FC<EmailListItemProps> = ({ email, account, isSelected, onSelect, onDelete }) => {
    return (
        <li
            onClick={() => onSelect(email)}
            className={`p-3 border-b border-default dark:border-default-dark flex items-start gap-3 cursor-pointer ${isSelected ? 'bg-blue-100 dark:bg-blue-900/50' : 'hover:bg-hover-bg dark:hover:bg-hover-bg-dark'}`}
        >
            {account && <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: account.color as string }}></span>}
            <div className="flex-grow overflow-hidden">
                <div className="flex justify-between text-xs text-muted dark:text-muted-dark">
                    <p className="font-semibold text-base dark:text-base-dark truncate">{email.direction === 'outgoing' ? email.to_address : email.from_address}</p>
                    <p>{new Date(email.sent_at).toLocaleDateString()}</p>
                </div>
                <p className="font-bold text-sm truncate flex items-center gap-2">
                    {email.is_triaged && <SparklesIcon className="w-3 h-3 text-purple-500 flex-shrink-0" title={`AI解析済み: ${email.ai_category}`} />}
                    {email.subject || '(件名なし)'}
                </p>
                <p className="text-xs text-muted dark:text-muted-dark truncate">{email.ai_summary || email.body.replace(/<[^>]*>/g, '')}</p>
            </div>
            <button onClick={(e) => onDelete(e, email.id)} className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0">
                <TrashIcon className="w-4 h-4" />
            </button>
        </li>
    );
};

export default EmailListItem;

import { Row } from '@shared/types';
import React from 'react';
import EmailListItem from '../molecules/EmailListItem';
import { Email } from '../types';

interface EmailListPanelProps {
    emails: Email[];
    accountsMap: Map<string, Row>;
    selectedEmailId: string | null;
    searchTerm: string;
    onSearchTermChange: (term: string) => void;
    onSelectEmail: (email: Email) => void;
    onDeleteEmail: (e: React.MouseEvent, emailId: string) => void;
}

const EmailListPanel: React.FC<EmailListPanelProps> = ({ emails, accountsMap, selectedEmailId, searchTerm, onSearchTermChange, onSelectEmail, onDeleteEmail }) => {
    return (
        <div className="flex flex-col h-full">
            <div className="p-2 border-b border-default dark:border-default-dark">
                <input
                    type="text"
                    placeholder="メールを検索..."
                    value={searchTerm}
                    onChange={e => onSearchTermChange(e.target.value)}
                    className="w-full p-2 bg-input-bg dark:bg-input-bg-dark rounded"
                />
            </div>
            <ul className="overflow-y-auto">
                {emails.map(email => (
                    <EmailListItem
                        key={email.id}
                        email={email}
                        account={accountsMap.get(email.account_id)}
                        isSelected={selectedEmailId === email.id}
                        onSelect={onSelectEmail}
                        onDelete={onDeleteEmail}
                    />
                ))}
                {emails.length === 0 && <p className="text-center text-sm text-muted p-4">メールがありません。</p>}
            </ul>
        </div>
    );
};

export default EmailListPanel;

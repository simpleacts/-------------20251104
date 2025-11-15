import AIReplyAssistant from '@features/aitaskmanagement/organisms/AIReplyAssistant';
import AITriageView from '@features/aitaskmanagement/organisms/AITriageView';
import { EnrichedTask, Row } from '@shared/types';
import React from 'react';
import { Email, EmailAttachment } from '../types';
import EmailComposer from './EmailComposer';

interface EmailDetailPanelProps {
    isComposing: boolean;
    selectedItem: EnrichedTask | Email | null;
    composeData: { to: string; subject: string; body: string; account_id: string };
    onDataChange: (field: string, value: any) => void;
    attachments: EmailAttachment[];
    onAttachmentsChange: (attachments: EmailAttachment[]) => void;
    onSend: () => void;
    isSending: boolean;
    accounts: Row[];
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const EmailDetailPanel: React.FC<EmailDetailPanelProps> = (props) => {
    const { isComposing, selectedItem, ...composeProps } = props;

    if (isComposing) {
        return <EmailComposer {...composeProps} />;
    }

    if (selectedItem) {
        return (
            <div className="flex flex-col h-full gap-4">
                <div className="flex-grow min-h-0">
                    <AITriageView selectedItem={selectedItem} />
                </div>
                <div className="flex-grow min-h-0">
                    <AIReplyAssistant selectedItem={selectedItem} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center h-full text-gray-500">
            メールを選択してください
        </div>
    );
};

export default EmailDetailPanel;

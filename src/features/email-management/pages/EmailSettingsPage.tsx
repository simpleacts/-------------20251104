import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Database, Row } from '@shared/types';
import { EmailAccount } from '../types';
import { Button, SpinnerIcon, Select, Label } from '@components/atoms';
import { useDatabase } from '@core/contexts/DatabaseContext';
import GeneralTab from '../organisms/GeneralTab';
import LabelsTab from '../organisms/LabelsTab';
import InboxTab from '../organisms/InboxTab';
import ForwardingPopImapTab from '../organisms/ForwardingPopImapTab';
import AccountsTab from '../organisms/AccountsTab';
import TemplatesTab from '../organisms/TemplatesTab';

interface EmailSettingsToolProps {
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
}

const EmailSettingsTool: React.FC<EmailSettingsToolProps> = ({ database, setDatabase }) => {
    const [activeTab, setActiveTab] = useState('general');
    const [hasChanges, setHasChanges] = useState(false);
    const [selectedAccountId, setSelectedAccountId] = useState<string>('default');
    
    const allAccounts = useMemo(() => (database.email_accounts?.data as EmailAccount[]) || [], [database.email_accounts]);
    
    const TABS = [
        { id: 'general', label: '全般' },
        { id: 'labels', label: 'ラベル' },
        { id: 'inbox', label: '受信トレイ' },
        { id: 'forwarding', label: '転送とPOP/IMAP' },
        { id: 'accounts', label: 'アカウント' },
        { id: 'templates', label: '定型文管理' },
    ];
    
    const renderActiveTab = () => {
        const isDefaultMode = selectedAccountId === 'default';
        switch(activeTab) {
            case 'general':
                return <GeneralTab database={database} setDatabase={setDatabase as any} setHasChanges={setHasChanges} selectedAccountId={selectedAccountId} />;
            case 'labels':
                return <LabelsTab database={database} setDatabase={setDatabase as any} setHasChanges={setHasChanges} isDefaultMode={isDefaultMode} />;
            case 'inbox':
                return <InboxTab database={database} setDatabase={setDatabase as any} setHasChanges={setHasChanges} isDefaultMode={isDefaultMode} />;
            case 'forwarding':
                return <ForwardingPopImapTab database={database} setDatabase={setDatabase as any} setHasChanges={setHasChanges} selectedAccountId={selectedAccountId} />;
            case 'accounts':
                return <AccountsTab database={database} setDatabase={setDatabase as any} />;
            case 'templates':
                return <TemplatesTab database={database} setDatabase={setDatabase as any} isDefaultMode={isDefaultMode} setHasChanges={setHasChanges} />;
            default:
                return null;
        }
    }

    return (
        <div className="flex flex-col h-full">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">メール設定</h1>
                    <p className="text-gray-500 mt-1">メールアカウント、表示、AI機能などを設定します。</p>
                </div>
                 {hasChanges && (
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-yellow-600 animate-pulse">未保存の変更があります。タブを切り替える前に保存してください。</span>
                    </div>
                )}
            </header>

            <div className="border-b mb-4 pb-4">
                 <div className="flex items-center gap-2 w-full max-w-lg">
                    <Label htmlFor="account-select" className="flex-shrink-0 font-semibold">設定対象:</Label>
                    <Select id="account-select" value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)}>
                        <option value="default">デフォルト（共通）設定</option>
                        {allAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.email_address})</option>)}
                    </Select>
                </div>
            </div>

            <div className="border-b mb-6"><nav className="-mb-px flex space-x-4">
                {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`py-2 px-1 border-b-2 text-sm ${activeTab === tab.id ? 'border-brand-primary text-brand-primary' : 'border-transparent'}`}>{tab.label}</button>
                ))}
            </nav></div>
            <div className="flex-grow overflow-y-auto">
                {renderActiveTab()}
            </div>
        </div>
    );
};

export default EmailSettingsTool;
import React, { useState } from 'react';
import { Database } from '@shared/types';
import ConsolidatedInvoiceIssuance from './ConsolidatedInvoiceIssuance';
import ReceivablesManagement from './ReceivablesManagement';

interface AccountsReceivableProps {
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
}

const AccountsReceivable: React.FC<AccountsReceivableProps> = ({ database, setDatabase }) => {
    const [subTab, setSubTab] = useState('management');

    return (
        <div className="flex flex-col h-full">
            <div className="border-b mb-4">
                <nav className="-mb-px flex space-x-4">
                    <button onClick={() => setSubTab('management')} className={`py-2 px-1 text-sm font-medium border-b-2 ${subTab === 'management' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500'}`}>売掛金管理</button>
                    <button onClick={() => setSubTab('consolidation')} className={`py-2 px-1 text-sm font-medium border-b-2 ${subTab === 'consolidation' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500'}`}>合算請求書発行</button>
                </nav>
            </div>
            <div className="flex-grow min-h-0">
                {subTab === 'management' && <ReceivablesManagement database={database} setDatabase={setDatabase} />}
                {subTab === 'consolidation' && <ConsolidatedInvoiceIssuance database={database} setDatabase={setDatabase} />}
            </div>
        </div>
    );
}

export default AccountsReceivable;
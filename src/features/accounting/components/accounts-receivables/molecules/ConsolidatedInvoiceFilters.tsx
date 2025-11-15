import React from 'react';
import { Row } from '@shared/types';

interface ConsolidatedInvoiceFiltersProps {
    customers: Row[];
    selectedCustomerId: string;
    onCustomerChange: (id: string) => void;
    startDate: string;
    onStartDateChange: (date: string) => void;
    endDate: string;
    onEndDateChange: (date: string) => void;
}

const ConsolidatedInvoiceFilters: React.FC<ConsolidatedInvoiceFiltersProps> = ({
    customers,
    selectedCustomerId,
    onCustomerChange,
    startDate,
    onStartDateChange,
    endDate,
    onEndDateChange,
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
                <label className="block text-sm font-medium mb-1">顧客</label>
                <select value={selectedCustomerId} onChange={e => onCustomerChange(e.target.value)} className="w-full p-2 border rounded-md bg-input-bg dark:bg-input-bg-dark border-default">
                    <option value="">顧客を選択...</option>
                    {customers.map(c => <option key={c.id as string} value={c.id as string}>{c.company_name || c.name_kanji}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">対象期間（開始）</label>
                <input type="date" value={startDate} onChange={e => onStartDateChange(e.target.value)} className="w-full p-2 border rounded-md bg-input-bg dark:bg-input-bg-dark border-default" />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">対象期間（終了）</label>
                <input type="date" value={endDate} onChange={e => onEndDateChange(e.target.value)} className="w-full p-2 border rounded-md bg-input-bg dark:bg-input-bg-dark border-default" />
            </div>
        </div>
    );
};

export default ConsolidatedInvoiceFilters;
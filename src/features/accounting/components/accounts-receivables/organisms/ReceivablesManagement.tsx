import React from 'react';
import { Database } from '@shared/types';
import { useReceivables } from '@features/accounting/hooks/useReceivables';
import ReceivablesTable from '../molecules/ReceivablesTable';
import PaymentDateModal from '../modals/PaymentDateModal';

interface ReceivablesManagementProps {
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
}

const ReceivablesManagement: React.FC<ReceivablesManagementProps> = ({ database, setDatabase }) => {
    const {
        monthFilter,
        setMonthFilter,
        paymentModalData,
        setPaymentModalData,
        receivables,
        handleStatusChange,
        handleLockToggle,
    } = useReceivables(database, setDatabase);

    return (
        <div className="flex flex-col h-full bg-base-100 dark:bg-base-dark-200 p-6 rounded-lg shadow-md">
            <div className="flex justify-end mb-4">
                <input 
                    type="month" 
                    value={monthFilter} 
                    onChange={e => setMonthFilter(e.target.value)} 
                    className="p-1 border rounded-md bg-input-bg dark:bg-input-bg-dark border-default"
                />
            </div>
            <div className="overflow-auto flex-grow">
                <ReceivablesTable
                    receivables={receivables}
                    onSetPaymentModalData={setPaymentModalData}
                    onStatusChange={handleStatusChange}
                    onLockToggle={handleLockToggle}
                />
            </div>
            {paymentModalData && (
                <PaymentDateModal
                    isOpen={!!paymentModalData}
                    onClose={() => setPaymentModalData(null)}
                    currentDate={paymentModalData.date}
                    onSave={(date) => {
                        handleStatusChange(paymentModalData.quoteId, '入金済', date);
                        setPaymentModalData(null);
                    }}
                />
            )}
        </div>
    );
};

export default ReceivablesManagement;


import React, { useMemo, useState } from 'react';
import { Database, Row } from '@shared/types';
import { Bill } from '@features/accounting/types';
import { LockClosedIcon, LockOpenIcon, PlusIcon } from '@components/atoms';
import PaymentDateModal from '../../accounts-receivables/modals/PaymentDateModal';

interface AccountsPayableListProps {
    database: Partial<Database>;
    setDatabase: React.Dispatch<React.SetStateAction<Partial<Database> | null>>;
    onAddBill: () => void;
}

const getStatusClass = (status: string | null) => {
    switch (status) {
        case 'paid':
            return 'bg-status-success-bg text-status-success-text dark:bg-status-success-bg-dark dark:text-status-success-text-dark';
        case 'unpaid':
            return 'bg-status-warning-bg text-status-warning-text dark:bg-status-warning-bg-dark dark:text-status-warning-text-dark';
        case 'overdue':
            return 'bg-status-danger-bg text-status-danger-text dark:bg-status-danger-bg-dark dark:text-status-danger-text-dark';
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'; // Fallback
    }
};

const statusLabels: Record<string, string> = {
    paid: '支払済',
    unpaid: '未払',
    overdue: '期限超過'
};

const AccountsPayableList: React.FC<AccountsPayableListProps> = ({ database, setDatabase, onAddBill }) => {
    const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('unpaid');
    const [monthFilter, setMonthFilter] = useState<string>('');
    const [paymentModalData, setPaymentModalData] = useState<{ billId: string, date: string } | null>(null);

    const partnersMap = useMemo(() => new Map(database.customers?.data.map(c => [c.id, c.company_name || c.name_kanji])), [database.customers]);

    const bills = useMemo(() => {
        let allBills = (database.bills?.data as Bill[] || []).map(bill => ({
            ...bill,
            vendorName: partnersMap.get(bill.customer_id) || '不明な取引先'
        })).sort((a,b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime());

        if (monthFilter) {
            allBills = allBills.filter(b => b.billing_month === monthFilter);
        }

        if (filter === 'all') return allBills;
        return allBills.filter(b => b.status === filter);
    }, [database.bills, partnersMap, filter, monthFilter]);

    const handleStatusChange = (billId: string, newStatus: Bill['status'], paymentDate?: string) => {
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            const billIndex = newDb.bills.data.findIndex((b: Row) => b.id === billId);
            if (billIndex > -1) {
                newDb.bills.data[billIndex].status = newStatus;
                if (newStatus === 'paid') {
                    newDb.bills.data[billIndex].payment_date = paymentDate || new Date().toISOString().split('T')[0];
                } else {
                    newDb.bills.data[billIndex].payment_date = null;
                }
            }
            return newDb;
        });
    };
    
    const handleLockToggle = (billId: string, isLocked: boolean) => {
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            const billIndex = newDb.bills.data.findIndex((b: Row) => b.id === billId);
            if (billIndex > -1) {
                newDb.bills.data[billIndex].is_locked = isLocked;
            }
            return newDb;
        });
    };

    return (
      <>
        <div className="flex flex-col h-full bg-base-100 dark:bg-base-dark-200 p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 p-1 bg-base-200 dark:bg-base-dark-300 rounded-lg">
                        <button onClick={() => setFilter('unpaid')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${filter === 'unpaid' ? 'bg-container-bg dark:bg-container-bg-dark shadow' : 'hover:bg-container-muted-bg dark:hover:bg-container-muted-bg-dark'}`}>未払</button>
                        <button onClick={() => setFilter('paid')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${filter === 'paid' ? 'bg-container-bg dark:bg-container-bg-dark shadow' : 'hover:bg-container-muted-bg dark:hover:bg-container-muted-bg-dark'}`}>支払済</button>
                        <button onClick={() => setFilter('all')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${filter === 'all' ? 'bg-container-bg dark:bg-container-bg-dark shadow' : 'hover:bg-container-muted-bg dark:hover:bg-container-muted-bg-dark'}`}>すべて</button>
                    </div>
                    <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="p-1 border border-default dark:border-default-dark rounded-md bg-input-bg dark:bg-input-bg-dark"/>
                </div>
                 <button onClick={onAddBill} className="flex items-center gap-2 bg-brand-primary hover:bg-blue-800 text-white font-semibold py-2 px-4 rounded-lg">
                    <PlusIcon className="w-5 h-5"/> 新規支払いを登録
                </button>
            </div>
            <div className="overflow-auto flex-grow">
                 <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-base-200 dark:bg-base-dark-300">
                        <tr>
                            <th className="p-2 text-left">取引先</th><th className="p-2 text-left">請求月</th>
                            <th className="p-2 text-left">請求書番号</th><th className="p-2 text-left">支払期日</th><th className="p-2 text-left">支払日</th>
                            <th className="p-2 text-right">金額 (税込)</th><th className="p-2 text-center">ステータス</th><th className="p-2 text-center">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bills.map(bill => (
                            <tr key={bill.id} className={`border-t border-base-200 dark:border-base-dark-300 ${bill.is_locked ? 'bg-gray-100 dark:bg-gray-800/50' : ''}`}>
                                <td className="p-2 font-semibold">{bill.vendorName}</td>
                                <td className="p-2">{bill.billing_month}</td>
                                <td className="p-2 font-mono">{bill.invoice_number}</td>
                                <td className="p-2">{bill.due_date ? new Date(bill.due_date).toLocaleDateString() : 'N/A'}</td>
                                <td className="p-2">{bill.payment_date ? new Date(bill.payment_date).toLocaleDateString() : '-'}</td>
                                <td className="p-2 text-right">¥{(bill.total_amount || 0).toLocaleString()}</td>
                                <td className="p-2 text-center">
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusClass(bill.status)}`}>
                                        {statusLabels[bill.status as string] || bill.status}
                                    </span>
                                </td>
                                <td className="p-2 text-center flex items-center justify-center gap-2">
                                     {bill.is_locked ? (
                                        <button onClick={() => handleLockToggle(bill.id, false)} className="p-1 text-gray-500" title="ロック解除"><LockClosedIcon className="w-5 h-5"/></button>
                                    ) : (
                                        <>
                                            {bill.status !== 'paid' ? (
                                                <button onClick={() => setPaymentModalData({ billId: bill.id, date: new Date().toISOString().split('T')[0] })} className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">支払済にする</button>
                                            ) : (
                                                <button onClick={() => handleStatusChange(bill.id, 'unpaid')} className="text-xs bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600">未払に戻す</button>
                                            )}
                                            {bill.status === 'paid' && <button onClick={() => handleLockToggle(bill.id, true)} className="p-1 text-gray-500" title="ロック"><LockOpenIcon className="w-5 h-5"/></button>}
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <PaymentDateModal
                isOpen={!!paymentModalData}
                onClose={() => setPaymentModalData(null)}
                currentDate={paymentModalData?.date || ''}
                onSave={(date) => {
                    if(paymentModalData) {
                        handleStatusChange(paymentModalData.billId, 'paid', date);
                    }
                    setPaymentModalData(null);
                }}
            />
        </div>
      </>
    );
};

export default AccountsPayableList;
import React from 'react';
import { Row } from '@shared/types';
import { LockClosedIcon, LockOpenIcon } from '@components/atoms';

interface ReceivablesTableProps {
    receivables: Row[];
    onSetPaymentModalData: (data: { quoteId: string, date: string }) => void;
    onStatusChange: (quoteId: string, status: string) => void;
    onLockToggle: (quoteId: string, isLocked: boolean) => void;
}

const ReceivablesTable: React.FC<ReceivablesTableProps> = ({ receivables, onSetPaymentModalData, onStatusChange, onLockToggle }) => {
    return (
        <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-base-200 dark:bg-base-dark-300">
                <tr>
                    <th className="p-2 text-left">顧客名</th>
                    <th className="p-2 text-left">案件コード</th>
                    <th className="p-2 text-left">請求月</th>
                    <th className="p-2 text-left">支払期日</th>
                    <th className="p-2 text-left">入金日</th>
                    <th className="p-2 text-right">金額 (税込)</th>
                    <th className="p-2 text-center">ステータス</th>
                    <th className="p-2 text-center">操作</th>
                </tr>
            </thead>
            <tbody>
                {receivables.map(quote => (
                    <tr key={quote.id as string} className={`border-t border-base-200 dark:border-base-dark-300 ${quote.is_locked ? 'bg-gray-100 dark:bg-gray-800/50' : ''}`}>
                        <td className="p-2 font-semibold">{quote.customerName as string}</td>
                        <td className="p-2 font-mono">{quote.quote_code}</td>
                        <td className="p-2">{(quote as any).billing_month}</td>
                        <td className="p-2">{quote.payment_due_date ? new Date(quote.payment_due_date as string).toLocaleDateString() : 'N/A'}</td>
                        <td className="p-2">{quote.payment_date ? new Date(quote.payment_date as string).toLocaleDateString() : '-'}</td>
                        <td className="p-2 text-right">¥{(quote.total_cost_in_tax as number || 0).toLocaleString()}</td>
                        <td className="p-2 text-center">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                quote.payment_status === '入金済' ? 'bg-status-success-bg text-status-success-text dark:bg-status-success-bg-dark dark:text-status-success-text-dark' : 'bg-status-warning-bg text-status-warning-text dark:bg-status-warning-bg-dark dark:text-status-warning-text-dark'
                            }`}>{quote.payment_status}</span>
                        </td>
                        <td className="p-2 text-center flex items-center justify-center gap-2">
                             {quote.is_locked ? (
                                <button onClick={() => onLockToggle(quote.id as string, false)} className="p-1 text-gray-500" title="ロック解除"><LockClosedIcon className="w-5 h-5"/></button>
                            ) : (
                                <>
                                    {quote.payment_status !== '入金済' ? (
                                        <button onClick={() => onSetPaymentModalData({ quoteId: quote.id as string, date: new Date().toISOString().split('T')[0] })} className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">入金済にする</button>
                                    ) : (
                                        <button onClick={() => onStatusChange(quote.id as string, '未入金')} className="text-xs bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600">未入金に戻す</button>
                                    )}
                                    {quote.payment_status === '入金済' && <button onClick={() => onLockToggle(quote.id as string, true)} className="p-1 text-gray-500" title="ロック"><LockOpenIcon className="w-5 h-5"/></button>}
                                </>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default ReceivablesTable;
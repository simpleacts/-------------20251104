import React, { useMemo, useState } from 'react';
import { Database, Row } from '@shared/types';
import { PencilIcon, XMarkIcon } from '@components/atoms';

interface CustomerDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Row;
    database: Database;
    onEdit: (customer: Row) => void;
}

const getStatusClass = (status: string | null) => {
    switch (status) {
        case 'active':
            return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
        case 'inactive':
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200';
        case 'suspended':
            return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200';
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
};

const statusLabels: Record<string, string> = {
    active: 'アクティブ',
    inactive: '休眠',
    suspended: '取引停止'
};

const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({ isOpen, onClose, customer, database, onEdit }) => {
    const [activeTab, setActiveTab] = useState('info');

    const orderHistory = useMemo(() => {
        return (database.quotes?.data || [])
            .filter(q => q.customer_id === customer.id)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [database.quotes, customer.id]);

    if (!isOpen) return null;

    const renderInfoTab = () => (
        <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                <div><strong>顧客ID:</strong> <span className="font-mono text-xs">{customer.id}</span></div>
                <div><strong>ステータス:</strong> <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusClass(customer.status as string)}`}>{statusLabels[customer.status as string] || '不明'}</span></div>
                <div><strong>顧客グループ:</strong> {(database.customer_groups.data.find(g => g.id === customer.customer_group_id) as Row)?.name || '一般'}</div>
                <div><strong>会社名:</strong> {customer.company_name || '-'}</div>
                <div><strong>氏名:</strong> {customer.name_kanji} ({customer.name_kana})</div>
                <div><strong>Email:</strong> {customer.email}</div>
                <div><strong>電話番号:</strong> {customer.phone}</div>
            </div>
            <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">登録住所</h4>
                <p>〒{customer.zip_code}</p>
                <p>{customer.address1}</p>
                <p>{customer.address2}</p>
            </div>
            {customer.has_separate_shipping_address && (
                 <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">納品先住所</h4>
                    <p><strong>宛名:</strong> {customer.shipping_name}</p>
                    <p><strong>電話番号:</strong> {customer.shipping_phone}</p>
                    <p>〒{customer.shipping_zip_code}</p>
                    <p>{customer.shipping_address1}</p>
                    <p>{customer.shipping_address2}</p>
                </div>
            )}
            <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">内部メモ</h4>
                <pre className="whitespace-pre-wrap font-sans bg-base-200 dark:bg-base-dark-300 p-2 rounded text-xs">{customer.internal_notes || 'メモはありません'}</pre>
            </div>
        </div>
    );
    
    const renderHistoryTab = () => (
        <div className="overflow-auto">
            <table className="min-w-full text-xs">
                <thead className="bg-base-200 dark:bg-base-dark-300">
                    <tr>
                        <th className="p-2 text-left">案件コード</th>
                        <th className="p-2 text-left">件名</th>
                        <th className="p-2 text-left">作成日</th>
                        <th className="p-2 text-left">ステータス</th>
                        <th className="p-2 text-right">金額 (税込)</th>
                    </tr>
                </thead>
                <tbody>
                    {orderHistory.map(quote => (
                        <tr key={quote.id as string} className="border-t border-default dark:border-default-dark">
                            <td className="p-2 font-mono">{quote.quote_code}</td>
                            <td className="p-2 truncate max-w-xs">{quote.subject}</td>
                            <td className="p-2">{new Date(quote.created_at).toLocaleDateString()}</td>
                            <td className="p-2">{quote.quote_status}</td>
                            <td className="p-2 text-right font-semibold">¥{(quote.total_cost_in_tax as number || 0).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-default dark:border-default-dark">
                    <div>
                        <h2 className="text-xl font-bold">{customer.company_name || customer.name_kanji}</h2>
                        <p className="text-sm text-gray-500">顧客ID: {customer.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => onEdit(customer)} className="p-2 flex items-center gap-1 text-sm bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark rounded hover:opacity-90">
                            <PencilIcon className="w-4 h-4"/> 編集
                        </button>
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300"><XMarkIcon className="w-6 h-6" /></button>
                    </div>
                </header>
                
                <div className="border-b border-default dark:border-default-dark">
                    <div className="flex space-x-4 px-6">
                        <button onClick={() => setActiveTab('info')} className={`py-2 border-b-2 text-sm font-medium ${activeTab === 'info' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500'}`}>基本情報</button>
                        <button onClick={() => setActiveTab('history')} className={`py-2 border-b-2 text-sm font-medium ${activeTab === 'history' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500'}`}>案件履歴</button>
                    </div>
                </div>

                <main className="overflow-y-auto p-6 flex-grow">
                    {activeTab === 'info' ? renderInfoTab() : renderHistoryTab()}
                </main>
            </div>
        </div>
    );
};

export default CustomerDetailsModal;

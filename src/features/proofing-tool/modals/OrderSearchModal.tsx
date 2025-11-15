import { MagnifyingGlassIcon, XMarkIcon } from '@components/atoms';
import { Database, Row, Table } from '@shared/types';
import React, { useMemo, useState } from 'react';

interface OrderSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (order: Row) => void;
    database: Database;
}

const OrderSearchModal: React.FC<OrderSearchModalProps> = ({ isOpen, onClose, onSelect, database }) => {
    const [searchKeyword, setSearchKeyword] = useState<string>('');

    const allQuotesWithCustomer = useMemo(() => {
        const quotesTable = database.quotes as Table;
        const customersTable = database.customers as Table;
        if (!quotesTable || !customersTable) return [];

        const customerMap = new Map(customersTable.data.map(c => [c.id, c]));
        
        const enrichedQuotes: Row[] = quotesTable.data.map(quote => ({
            ...quote,
            customer: customerMap.get(quote.customer_id) || null,
        }));
        return enrichedQuotes;
    }, [database]);

    const searchResults = useMemo(() => {
        if (!searchKeyword) {
            return allQuotesWithCustomer;
        }
        const lowerKeyword = searchKeyword.toLowerCase();
        return allQuotesWithCustomer.filter(quote => 
            String(quote.quote_code ?? '').toLowerCase().includes(lowerKeyword) ||
            String(quote.customer?.company_name ?? '').toLowerCase().includes(lowerKeyword) ||
            String(quote.customer?.name_kanji ?? '').toLowerCase().includes(lowerKeyword)
        );
    }, [allQuotesWithCustomer, searchKeyword]);
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-base-300 dark:border-base-dark-300">
                    <h2 className="text-xl font-bold">案件を検索</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>
                
                <div className="p-4 border-b border-base-300 dark:border-base-dark-300">
                    <div className="relative">
                         <input
                            type="text"
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            placeholder="見積コード, 会社名, 氏名で検索..."
                            className="w-full bg-base-200 dark:bg-base-dark-300 border border-base-300 dark:border-base-dark-300 rounded-md pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-brand-secondary focus:outline-none"
                        />
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                    </div>
                </div>

                <main className="flex-grow overflow-y-auto">
                    <table className="min-w-full divide-y divide-base-300 dark:divide-base-dark-300">
                        <thead className="sticky top-0 bg-base-100 dark:bg-base-dark-200">
                           <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">見積コード</th>
                                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">会社名</th>
                                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">件名</th>
                                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">ステータス</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-base-300 dark:divide-base-dark-300">
                            {searchResults.map(quote => (
                                <tr 
                                    key={quote.id as string}
                                    onClick={() => onSelect(quote)}
                                    className="cursor-pointer hover:bg-base-200 dark:hover:bg-base-dark-300 transition-colors"
                                >
                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">{quote.quote_code}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm">{quote.customer?.company_name || quote.customer?.name_kanji}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm truncate max-w-xs">{quote.subject}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm">{quote.production_status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {searchResults.length === 0 && (
                        <div className="text-center py-10 text-gray-500">
                            <p>検索条件に一致する案件が見つかりません。</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default OrderSearchModal;
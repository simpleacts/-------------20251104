import React, { useMemo, useState } from 'react';
import { Row } from '@shared/types';
import { MagnifyingGlassIcon, XMarkIcon } from '@components/atoms';

interface CustomerSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (customer: Row) => void;
    customers: Row[];
}

const CustomerSearchModal: React.FC<CustomerSearchModalProps> = ({ isOpen, onClose, onSelect, customers }) => {
    const [searchKeyword, setSearchKeyword] = useState<string>('');

    const searchResults = useMemo(() => {
        if (!searchKeyword) {
            return customers;
        }
        const lowerKeyword = searchKeyword.toLowerCase();
        return customers.filter(customer => 
            String(customer.company_name ?? '').toLowerCase().includes(lowerKeyword) ||
            String(customer.name_kanji ?? '').toLowerCase().includes(lowerKeyword) ||
            String(customer.name_kana ?? '').toLowerCase().includes(lowerKeyword) ||
            String(customer.phone ?? '').toLowerCase().includes(lowerKeyword) ||
            String(customer.email ?? '').toLowerCase().includes(lowerKeyword)
        );
    }, [customers, searchKeyword]);
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-2xl h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-base-300 dark:border-base-dark-300">
                    <h2 className="text-xl font-bold">顧客を検索</h2>
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
                            placeholder="会社名, 氏名, 電話番号などで検索..."
                            className="w-full bg-base-200 dark:bg-base-dark-300 border border-base-300 dark:border-base-dark-300 rounded-md pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-brand-secondary focus:outline-none"
                            autoFocus
                        />
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                    </div>
                </div>

                <main className="flex-grow overflow-y-auto">
                    <table className="min-w-full divide-y divide-base-300 dark:divide-base-dark-300">
                        <thead className="sticky top-0 bg-base-100 dark:bg-base-dark-200">
                           <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">会社名</th>
                                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">氏名</th>
                                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">電話番号</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-base-300 dark:divide-base-dark-300">
                            {searchResults.map(customer => (
                                <tr 
                                    key={customer.id as string}
                                    onClick={() => onSelect(customer)}
                                    className="cursor-pointer hover:bg-base-200 dark:hover:bg-base-dark-300 transition-colors"
                                >
                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">{customer.company_name}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm">{customer.name_kanji}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm">{customer.phone}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {searchResults.length === 0 && (
                        <div className="text-center py-10 text-gray-500">
                            <p>検索条件に一致する顧客が見つかりません。</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default CustomerSearchModal;
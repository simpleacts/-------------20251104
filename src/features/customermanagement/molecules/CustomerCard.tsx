import React from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Row } from '@shared/types';
import { PencilIcon, TrashIcon, UserCircleIcon } from '@components/atoms';

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
const CustomerCard: React.FC<{ customer: Row; onSelect: () => void; onEdit: (e: React.MouseEvent) => void; onDelete: (e: React.MouseEvent) => void; }> = ({ customer, onSelect, onEdit, onDelete }) => {
    const { t } = useTranslation('customermanagement');
    const statusLabels: Record<string, string> = {
        active: t('customer.status_active', 'アクティブ'),
        inactive: t('customer.status_inactive', '休眠'),
        suspended: t('customer.status_suspended', '取引停止')
    };
    return (
        <div onClick={onSelect} className="bg-card-bg dark:bg-card-bg-dark rounded-lg shadow-md flex flex-col cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]">
            <div className="p-4 flex-grow">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-md mb-1 truncate pr-2" title={customer.company_name as string || customer.name_kanji as string}>{customer.company_name || customer.name_kanji}</h3>
                     <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${getStatusClass(customer.status as string)}`}>
                        {statusLabels[customer.status as string] || '不明'}
                    </span>
                </div>
                 {customer.is_vendor && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200 self-start mb-2">{t('customer.vendor', '仕入先')}</span>}
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                    <p className="flex items-center gap-2"><UserCircleIcon className="w-4 h-4 text-gray-400"/> {customer.name_kanji}</p>
                    <p className="flex items-center gap-2"><i className="fa-solid fa-phone w-4 text-center text-gray-400"></i> {customer.phone}</p>
                    <p className="flex items-center gap-2"><i className="fa-solid fa-envelope w-4 text-center text-gray-400"></i> {customer.email}</p>
                </div>
            </div>
            <div className="p-2 bg-container-muted-bg dark:bg-container-muted-bg-dark border-t border-default dark:border-default-dark flex justify-end gap-1">
                <button onClick={onEdit} className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full" title={t('customer.edit', '編集')}><PencilIcon className="w-4 h-4"/></button>
                <button onClick={onDelete} className="p-1.5 text-action-danger hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full" title={t('customer.delete', '削除')}><TrashIcon className="w-4 h-4"/></button>
            </div>
        </div>
    );
};

export default CustomerCard;
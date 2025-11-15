import React from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Row } from '@shared/types';
import { MagnifyingGlassIcon, PlusIcon, ViewGridIcon, ViewListIcon } from '@components/atoms';

interface CustomerToolbarProps {
    customerGroups: Row[];
    groupFilter: string;
    setGroupFilter: (filter: string) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    viewMode: 'grid' | 'list';
    setViewMode: (mode: 'grid' | 'list') => void;
    onAddNew: (e: React.MouseEvent) => void;
}

const CustomerToolbar: React.FC<CustomerToolbarProps> = ({
    customerGroups,
    groupFilter,
    setGroupFilter,
    searchTerm,
    setSearchTerm,
    viewMode,
    setViewMode,
    onAddNew,
}) => {
    const { t } = useTranslation('customermanagement');
    return (
        <div className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="flex items-center gap-1 p-1 bg-base-200 dark:bg-base-dark-300 rounded-lg overflow-x-auto whitespace-nowrap mb-2 md:mb-0">
                {customerGroups.map(group => (
                    <button key={group.id as string} onClick={() => setGroupFilter(group.id as string)} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${groupFilter === group.id ? 'bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark shadow' : 'bg-button-muted-bg text-button-muted dark:bg-button-muted-bg-dark dark:text-button-muted-dark'}`}>
                        {group.name as string}
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-grow">
                    <input
                        type="text"
                        placeholder={t('customer.search_placeholder', '検索...')}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-9 p-2 w-full border rounded-md bg-base-200 dark:bg-base-dark-300"
                    />
                    <MagnifyingGlassIcon className="w-5 h-5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                <div className="flex items-center gap-1 p-1 bg-base-200 dark:bg-base-dark-300 rounded-lg">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark' : ''}`}><ViewGridIcon className="w-5 h-5"/></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark' : ''}`}><ViewListIcon className="w-5 h-5"/></button>
                </div>
                <button onClick={onAddNew} className="flex items-center gap-2 bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark font-semibold py-2.5 px-4 rounded-lg">
                    <PlusIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default CustomerToolbar;
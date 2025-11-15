import React from 'react';
import { DocumentType } from '@shared/types';

interface DocumentFilterProps {
    docTypeFilter: DocumentType | 'all' | 'worksheet';
    onDocTypeFilterChange: (type: DocumentType | 'all' | 'worksheet') => void;
    availableTypes: { id: string; label: string }[];
}


const DocumentFilter: React.FC<DocumentFilterProps> = ({ docTypeFilter, onDocTypeFilterChange, availableTypes }) => {
    // 固定の並び順: 見積、納品、請求、領収、すべて
    const orderMap: Record<string, number> = {
        'estimate': 1,
        'delivery_slip': 2,
        'invoice': 3,
        'receipt': 4,
        'all': 5
    };
    
    const sortedTypes = [...availableTypes].sort((a, b) => {
        const orderA = orderMap[a.id] || 99;
        const orderB = orderMap[b.id] || 99;
        return orderA - orderB;
    });
    
    const filterButtons = [...sortedTypes, { id: 'all', label: 'すべて' }];
    
    return (
        <div className="flex items-center gap-1 p-1 bg-base-200 dark:bg-base-dark-300 rounded-lg overflow-x-auto whitespace-nowrap mb-2 md:mb-0">
            {filterButtons.map(btn => (
                <button 
                    key={btn.id} 
                    onClick={() => onDocTypeFilterChange(btn.id as any)}
                    className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${docTypeFilter === btn.id ? 'bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark shadow' : 'bg-button-muted-bg text-button-muted dark:bg-button-muted-bg-dark dark:text-button-muted-dark'}`}
                >
                    {btn.label}
                </button>
            ))}
        </div>
    );
};

export default DocumentFilter;


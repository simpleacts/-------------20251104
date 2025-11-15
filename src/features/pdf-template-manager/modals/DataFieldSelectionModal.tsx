import React, { useMemo, useState } from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Column, Database } from '@shared/types';
import { XMarkIcon } from '@components/atoms';

const DataFieldSelectionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelect: (selection: { tableName: string; fieldName: string, label: string }) => void;
    database: Database;
}> = ({ isOpen, onClose, onSelect, database }) => {
    const { t } = useTranslation('pdf-template-manager');
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const tables = useMemo(() => Object.keys(database).sort(), [database]);

    const filteredTables = useMemo(() => {
        if (!searchTerm) return tables;
        return tables.filter(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [tables, searchTerm]);

    const columns = useMemo(() => {
        if (!selectedTable) return [];
        return database[selectedTable]?.schema || [];
    }, [selectedTable, database]);

    if (!isOpen) return null;

    const handleSelectField = (column: Column) => {
        if (selectedTable) {
            onSelect({ tableName: selectedTable, fieldName: column.name, label: `${selectedTable} / ${column.name}` });
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-3xl h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-base-300 dark:border-base-dark-300">
                    <h2 className="text-xl font-bold">{t('pdf_template.select_data_field', 'データベース項目を選択')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300"><XMarkIcon className="w-6 h-6" /></button>
                </header>
                <main className="flex-grow flex overflow-hidden">
                    <div className="w-1/3 border-r border-base-300 dark:border-base-dark-300 flex flex-col">
                        <div className="p-2 border-b border-base-300 dark:border-base-dark-300"><input type="text" placeholder={t('pdf_template.search_table', 'テーブルを検索...')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 bg-base-200 dark:bg-base-dark-300 rounded"/></div>
                        <ul className="overflow-y-auto">{filteredTables.map(t => <li key={t} onClick={() => setSelectedTable(t)} className={`p-2 cursor-pointer text-sm hover:bg-base-200 dark:hover:bg-base-dark-300 ${selectedTable === t ? 'bg-brand-secondary/20 font-semibold' : ''}`}>{t}</li>)}</ul>
                    </div>
                    <div className="w-2/3 overflow-y-auto">
                        <ul className="divide-y divide-base-200 dark:divide-base-dark-300">
                            {columns.map(c => <li key={c.id} onClick={() => handleSelectField(c)} className="p-3 cursor-pointer text-sm hover:bg-base-200 dark:hover:bg-base-dark-300">{c.name} <span className="text-xs text-gray-500">({c.type})</span></li>)}
                        </ul>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DataFieldSelectionModal;

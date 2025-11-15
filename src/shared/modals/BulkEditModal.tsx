import React, { useState } from 'react';
import { Column } from '../types';

interface BulkEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    schema: Column[];
    onConfirm: (column: string, value: any) => void;
};

const BulkEditModal: React.FC<BulkEditModalProps> = ({ isOpen, onClose, schema, onConfirm }) => {
    const [column, setColumn] = useState('');
    const [value, setValue] = useState<any>('');
    const [selectedColumnType, setSelectedColumnType] = useState<Column['type'] | null>(null);

    if (!isOpen) return null;

    const editableSchema = schema.slice(1); // 主キーは除外

    const handleColumnChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newColumnName = e.target.value;
        const newColumn = editableSchema.find(c => c.name === newColumnName);
        setColumn(newColumnName);
        setSelectedColumnType(newColumn?.type || null);
        setValue(newColumn?.type === 'BOOLEAN' ? false : '');
    };
    
    const handleConfirm = () => {
        let finalValue = value;
        if (selectedColumnType === 'NUMBER') finalValue = parseFloat(value);
        if (selectedColumnType === 'BOOLEAN') finalValue = value === 'true';
        onConfirm(column, finalValue);
    }
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-base-100 dark:bg-base-dark-200 p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">一括編集</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">編集する列</label>
                        <select value={column} onChange={handleColumnChange} className="w-full bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-secondary focus:outline-none">
                            <option value="">列を選択...</option>
                            {editableSchema.map(col => <option key={col.id} value={col.name}>{col.name}</option>)}
                        </select>
                    </div>
                    {column && (
                        <div>
                             <label className="block text-sm font-medium mb-1">新しい値</label>
                            {selectedColumnType === 'BOOLEAN' ? (
                                <select value={String(value)} onChange={(e) => setValue(e.target.value)} className="w-full bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-secondary focus:outline-none">
                                    <option value="true">はい</option>
                                    <option value="false">いいえ</option>
                                </select>
                            ) : (
                                <input type={selectedColumnType === 'NUMBER' ? 'number' : 'text'} value={value} onChange={(e) => setValue(e.target.value)} className="w-full bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-secondary focus:outline-none" />
                            )}
                        </div>
                    )}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-base-200 hover:bg-base-300 dark:bg-base-dark-300 dark:hover:bg-gray-600">キャンセル</button>
                    <button onClick={handleConfirm} disabled={!column} className="px-4 py-2 text-sm font-medium rounded-md bg-brand-primary text-white hover:bg-blue-800 disabled:bg-gray-400">更新</button>
                </div>
            </div>
        </div>
    );
}

export default BulkEditModal;

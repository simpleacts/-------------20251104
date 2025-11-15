import React, { useEffect, useState } from 'react';
import { Column, Row } from '@shared/types';
import { PlusIcon, TrashIcon, XMarkIcon } from '@components/atoms';

interface BasicPricingSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (tableName: string, data: Row[]) => void;
    tableName: string;
    displayName: string;
    schema: Column[];
    initialData: Row[];
}

const EditableCell: React.FC<{ value: any; onChange: (newValue: any) => void; type: Column['type']; disabled: boolean }> = ({ value, onChange, type, disabled }) => {
    const commonClasses = "w-full bg-base-100 dark:bg-base-dark-200 p-1 border border-base-300 dark:border-base-dark-300 rounded-md text-sm disabled:bg-gray-100 dark:disabled:bg-gray-800/50 disabled:cursor-not-allowed";
    
    if (type === 'BOOLEAN') {
        return <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} disabled={disabled} />;
    }
    
    const displayValue = (type === 'NUMBER' && (value === 0 || value === null)) ? '' : String(value ?? '');
    
    return (
        <input
            type={type === 'NUMBER' ? 'number' : 'text'}
            value={displayValue}
            placeholder={type === 'NUMBER' ? '0' : undefined}
            onChange={e => onChange(type === 'NUMBER' ? parseFloat(e.target.value) || 0 : e.target.value)}
            className={commonClasses}
            disabled={disabled}
        />
    );
};

const BasicPricingSettingsModal: React.FC<BasicPricingSettingsModalProps> = ({ isOpen, onClose, onSave, tableName, displayName, schema, initialData }) => {
    const [data, setData] = useState<Row[]>([]);

    useEffect(() => {
        if (initialData) {
            setData(JSON.parse(JSON.stringify(initialData)));
        }
    }, [initialData]);

    if (!isOpen) return null;

    const handleDataChange = (rowIndex: number, field: string, value: any) => {
        const newData = [...data];
        newData[rowIndex] = { ...newData[rowIndex], [field]: value };
        setData(newData);
    };

    const handleAddRow = () => {
        const newRow: Row = {};
        schema.forEach(col => {
            newRow[col.name] = col.type === 'NUMBER' ? 0 : col.type === 'BOOLEAN' ? false : '';
        });
        setData([...data, newRow]);
    };

    const handleRemoveRow = (rowIndex: number) => {
        setData(data.filter((_, index) => index !== rowIndex));
    };

    const handleSave = () => {
        // For 'settings' table, ensure values are strings as expected
        if (tableName === 'settings') {
            const stringifiedData = data.map(row => ({
                ...row,
                value: String(row.value)
            }));
            onSave(tableName, stringifiedData);
            return;
        }
        onSave(tableName, data);
    };

    const primaryKey = schema[0]?.name;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-base-300 dark:border-base-dark-300">
                    <h2 className="text-xl font-bold">「{displayName}」の編集</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300"><XMarkIcon className="w-6 h-6" /></button>
                </header>
                <main className="overflow-y-auto p-6">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="bg-base-200 dark:bg-base-dark-300">
                                    {schema.map(col => <th key={col.id} className="p-2 text-left font-semibold">{col.name}</th>)}
                                    <th className="p-2 w-12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row, rowIndex) => (
                                    <tr key={rowIndex} className="border-t border-base-200 dark:border-base-dark-300">
                                        {schema.map(col => (
                                            <td key={col.id} className="p-1">
                                                <EditableCell
                                                    value={row[col.name]}
                                                    onChange={value => handleDataChange(rowIndex, col.name, value)}
                                                    type={col.type}
                                                    disabled={tableName === 'settings' && col.name === 'key'}
                                                />
                                            </td>
                                        ))}
                                        <td className="p-1 text-center">
                                            {tableName !== 'settings' && (
                                                <button onClick={() => handleRemoveRow(rowIndex)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                     {tableName !== 'settings' && (
                        <button onClick={handleAddRow} className="mt-4 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-semibold">
                            <PlusIcon className="w-4 h-4" /> 行を追加
                        </button>
                    )}
                </main>
                <footer className="flex justify-end gap-3 p-4 bg-base-200 dark:bg-base-dark-300/50 border-t">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-base-300 hover:bg-gray-300 dark:bg-base-dark-300 dark:hover:bg-gray-600">キャンセル</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm font-medium rounded-md bg-brand-primary text-white hover:bg-blue-800">保存</button>
                </footer>
            </div>
        </div>
    );
};

export default BasicPricingSettingsModal;
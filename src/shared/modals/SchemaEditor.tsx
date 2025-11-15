import React, { useEffect, useState } from 'react';
import { Column } from '../../types';
import { PlusIcon, TrashIcon, XMarkIcon } from '../ui/atoms/icons';

interface SchemaEditorProps {
    isOpen: boolean;
    onClose: () => void;
    schema: Column[];
    onSave: (newSchema: Column[]) => void;
    tableName: string;
}

const SchemaEditor: React.FC<SchemaEditorProps> = ({ isOpen, onClose, schema, onSave, tableName }) => {
    const [localSchema, setLocalSchema] = useState<Column[]>([]);
    const [errors, setErrors] = useState<Record<number, string>>({});

    useEffect(() => {
        if (isOpen) {
            // Deep copy to avoid mutating parent state directly
            setLocalSchema(JSON.parse(JSON.stringify(schema)));
            setErrors({});
        }
    }, [isOpen, schema]);

    if (!isOpen) return null;

    const handleUpdateColumn = (index: number, field: 'name' | 'type', value: string) => {
        const newSchema = [...localSchema];
        const newErrors = { ...errors };
        delete newErrors[index];

        if (field === 'name') {
            const newName = value.replace(/[^a-zA-Z0-9_]/g, ''); // Sanitize name
            if (!newName) {
                newErrors[index] = '列名は空にできません。';
            } else if (newSchema.some((col, i) => i !== index && col.name === newName)) {
                newErrors[index] = '列名は一意である必要があります。';
            }
            newSchema[index] = { ...newSchema[index], name: newName, id: newName };
        } else {
            newSchema[index] = { ...newSchema[index], type: value as Column['type'] };
        }
        setLocalSchema(newSchema);
        setErrors(newErrors);
    };

    const handleAddColumn = () => {
        let newName = `new_column`;
        let counter = 1;
        while(localSchema.some(c => c.name === `${newName}_${counter}`)) {
            counter++;
        }
        newName = `${newName}_${counter}`;
        
        const newColumn: Column = {
            id: newName,
            name: newName,
            type: 'TEXT',
        };
        setLocalSchema([...localSchema, newColumn]);
    };

    const handleRemoveColumn = (index: number) => {
        if (index === 0) {
            setErrors(prev => ({...prev, [index]: '主キーは削除できません。'}));
            return;
        }
        if (window.confirm(`列「${localSchema[index].name}」を削除しますか？この操作は元に戻せません。`)) {
            const newSchema = localSchema.filter((_, i) => i !== index);
            setLocalSchema(newSchema);
        }
    };

    const handleSave = () => {
        if (Object.keys(errors).length > 0) {
            alert('エラーがあります。修正してください。');
            return;
        }
        onSave(localSchema);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-default dark:border-default-dark">
                    <h2 className="text-xl font-bold">スキーマを編集: {tableName}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>
                <main className="overflow-y-auto p-6 space-y-4">
                    {localSchema.map((col, index) => (
                        <div key={index} className={`grid grid-cols-12 gap-3 items-center p-2 rounded-md ${index === 0 ? 'bg-gray-100 dark:bg-gray-800/50' : ''}`}>
                            <div className="col-span-5">
                                <label className="text-xs font-medium">列名</label>
                                <input
                                    type="text"
                                    value={col.name}
                                    onChange={e => handleUpdateColumn(index, 'name', e.target.value)}
                                    disabled={index === 0}
                                    className={`w-full bg-input-bg dark:bg-input-bg-dark border rounded-md px-3 py-2 text-sm focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:text-gray-500 ${errors[index] ? 'border-red-500 focus:ring-red-500' : 'border-default dark:border-default-dark focus:ring-brand-secondary'}`}
                                />
                                {errors[index] && <p className="text-xs text-red-500 mt-1">{errors[index]}</p>}
                            </div>
                            <div className="col-span-5">
                                 <label className="text-xs font-medium">型</label>
                                 <select
                                    value={col.type}
                                    onChange={e => handleUpdateColumn(index, 'type', e.target.value)}
                                    className="w-full bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-secondary focus:outline-none"
                                >
                                    <option value="TEXT">TEXT</option>
                                    <option value="NUMBER">NUMBER</option>
                                    <option value="BOOLEAN">BOOLEAN</option>
                                </select>
                            </div>
                            <div className="col-span-2 text-right self-end">
                                {index === 0 ? (
                                    <span className="text-xs text-gray-500">主キー</span>
                                ) : (
                                    <button onClick={() => handleRemoveColumn(index)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    <button onClick={handleAddColumn} className="w-full flex items-center justify-center gap-2 text-sm bg-button-muted-bg text-button-muted dark:bg-button-muted-bg-dark dark:text-button-muted-dark font-semibold py-2 px-4 rounded-lg transition-colors hover:opacity-90">
                        <PlusIcon className="w-5 h-5" />
                        列を追加
                    </button>
                </main>
                <footer className="flex justify-end gap-3 p-4 bg-base-200 dark:bg-base-dark-300/50 border-t">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-button-muted-bg text-button-muted dark:bg-button-muted-bg-dark dark:text-button-muted-dark hover:opacity-90">
                        キャンセル
                    </button>
                    <button type="button" onClick={handleSave} className="px-4 py-2 text-sm font-medium rounded-md bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark hover:opacity-90 disabled:bg-gray-400" disabled={Object.keys(errors).length > 0}>
                        スキーマを保存
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default SchemaEditor;



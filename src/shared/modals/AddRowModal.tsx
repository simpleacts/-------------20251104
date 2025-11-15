import React, { useEffect, useState, useId } from 'react';
// FIX: Corrected type import path.
import { generateProductDescription } from '../services/geminiService';
import { Column, Database, Row } from '../types';
import { XMarkIcon } from '../ui/atoms/icons';
// FIX: Corrected import path for generateNewId.
import { generateNewId } from '../../features/id-manager/services/idService';

interface AddRowModalProps {
    isOpen: boolean;
    onClose: () => void;
    schema: Column[];
    onAddRow: (newRows: { tableName: string, data: Row }[]) => void;
    tableName: string;
    initialData?: Row | null;
    database: Database;
}

const AddRowModal: React.FC<AddRowModalProps> = ({ isOpen, onClose, schema, onAddRow, tableName, initialData, database }) => {
    const [newRow, setNewRow] = useState<Row>({});
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const modalId = useId();

    const isProductsMasterTable = tableName === 'products_master';

    useEffect(() => {
        if (isOpen && schema.length > 0) {
            const baseRow: Row = {};
            schema.forEach(col => {
                if (col.name === 'is_published') {
                    baseRow[col.name] = false; // Default to not published
                } else if (col.type === 'NUMBER') {
                    baseRow[col.name] = 0;
                } else if (col.type === 'BOOLEAN') {
                    baseRow[col.name] = false;
                } else {
                    baseRow[col.name] = '';
                }
            });

            const primaryKey = schema[0].name;

            const finalRow = initialData
              ? { ...baseRow, ...initialData }
              : baseRow;

            // Delete old primary key for duplication, a new one will be generated on save.
            if (finalRow[primaryKey]) {
                delete finalRow[primaryKey];
            }

            setNewRow(finalRow);
            setAiError(null);
        }
    }, [isOpen, schema, tableName, initialData]);

    if (!isOpen) return null;

    const handleChange = (columnName: string, value: string | number | boolean) => {
        setNewRow(prev => ({ ...prev, [columnName]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const pk = schema[0].name;
        // メーカー依存テーブルの場合はmanufacturer_idを取得
        const manufacturerId = newRow.manufacturer_id as string | undefined;
        const newId = generateNewId(tableName, database, manufacturerId);
        
        const finalData = { ...newRow, [pk]: newId };

        if (tableName === 'products_master') {
            // manufacturerIdは既に定義されているので、finalDataから取得して使用
            const productManufacturerId = finalData.manufacturer_id as string;
            const productCode = finalData.code;
            // メーカーコードを取得（manufacturer_idから）
            const manufacturer = database.manufacturers?.data?.find((m: Row) => m.id === productManufacturerId);
            const manufacturerCode = manufacturer?.code as string;
            if (manufacturerCode && productCode) {
                finalData.unique_code = `${manufacturerCode}-${productCode}`;
            }
        }

        const operations = [{ tableName: tableName, data: finalData }];
        
        if (isProductsMasterTable) {
             operations.push({
                tableName: 'product_details',
                data: {
                    product_id: newId,
                    name: '新しい商品', // Default name
                    description: '',
                    images: ''
                }
            });
        }

        onAddRow(operations);
        onClose();
    };
    
    const handleGenerateDescription = async () => {
        if (!newRow.name) { // This relies on a temporary 'name' field, which is not ideal.
            setAiError("商品説明を生成するには、まず商品名を入力してください。");
            return;
        }
        setIsGeneratingDesc(true);
        setAiError(null);
        try {
            // Note: This won't work correctly without a combined product object.
            // This feature might be better suited for the edit view.
            const { description } = await generateProductDescription(newRow);
            handleChange('description', description);
        } catch (error) {
            setAiError(error instanceof Error ? error.message : '説明を生成できませんでした。');
        } finally {
            setIsGeneratingDesc(false);
        }
    };

    const renderInput = (col: Column) => {
        const value = newRow[col.name];
        const inputId = `add-row-input-${col.id}-${modalId}`;
        
        switch (col.type) {
            case 'NUMBER':
                return <input
                    id={inputId}
                    type="number"
                    name={col.name}
                    value={Number(value ?? 0)}
                    onChange={(e) => handleChange(col.name, parseFloat(e.target.value) || 0)}
                    className="w-full bg-base-100 dark:bg-base-dark-200 border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-secondary focus:outline-none"
                />;
            case 'BOOLEAN':
                return <input
                    id={inputId}
                    type="checkbox"
                    name={col.name}
                    checked={!!value}
                    onChange={(e) => handleChange(col.name, e.target.checked)}
                    className="h-5 w-5 text-brand-secondary bg-base-200 dark:bg-base-dark-300 border-default dark:border-default-dark rounded focus:ring-brand-secondary"
                />;
            case 'TEXT':
            default:
                 return <input
                    id={inputId}
                    type="text"
                    name={col.name}
                    value={String(value ?? '')}
                    onChange={(e) => handleChange(col.name, e.target.value)}
                    className="w-full bg-base-100 dark:bg-base-dark-200 border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-secondary focus:outline-none"
                />;
        }
    };
    
    // AI Description generation is disabled for products in this simplified modal
    // as it requires data from both master and details tables.
    const canGenerateDesc = false; 

    const primaryKey = schema[0]?.name;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className={`bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col`} onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-default dark:border-default-dark">
                    <h2 className="text-xl font-bold">{initialData ? '行を複製' : '新しい行を追加'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                <form onSubmit={handleSubmit}>
                    <main className="overflow-y-auto max-h-[65vh] p-6 space-y-4">
                        {schema.map(col => {
                                // Hide primary key field as it's auto-generated
                                if (col.name === primaryKey) return null;
                                const inputId = `add-row-input-${col.id}-${modalId}`;
                                return (
                                    <div key={col.id}>
                                        <label htmlFor={inputId} className="block text-sm font-medium mb-1">{col.name}</label>
                                        {renderInput(col)}
                                    </div>
                                );
                            })
                        }
                    </main>

                    <footer className="flex justify-end gap-3 p-4 bg-base-200 dark:bg-base-dark-300/50 mt-auto">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-button-muted-bg text-button-muted dark:bg-button-muted-bg-dark dark:text-button-muted-dark hover:opacity-90">
                            キャンセル
                        </button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium rounded-md bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark hover:opacity-90">
                            保存
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
};

export default AddRowModal;
import React, { useEffect, useState, useId } from 'react';
import { Column, Database, Row } from '@shared/types';
import { XMarkIcon } from '@components/atoms';

interface DefinitionEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newItem: Row) => void;
    schema: Column[];
    initialData: Row | null;
    tableName: string;
    database: Database;
}

const DefinitionEditModal: React.FC<DefinitionEditModalProps> = ({ isOpen, onClose, onSave, schema, initialData, tableName, database }) => {
    const [formData, setFormData] = useState<Row>({});
    const modalId = useId();

    const isNew = !initialData;

    useEffect(() => {
        const initialFormState: Row = {};
        schema.forEach(col => {
            if (col.name !== schema[0].name || isNew) { // Don't include PK for new, but do for edit
                let defaultValue: string | boolean | number | string[] = col.type === 'NUMBER' ? '' : col.type === 'BOOLEAN' ? false : '';
                
                if (tableName === 'print_size_constraints' && col.name === 'allowed_print_sizes') {
                    defaultValue = []; // use array for checkboxes
                } else if (tableName === 'category_print_locations' && col.name === 'allowed_location_ids') {
                    defaultValue = []; // use array for checkboxes
                }
                
                initialFormState[col.name] = initialData?.[col.name] ?? defaultValue;

                if (initialData?.[col.name] && (col.name === 'allowed_print_sizes' || col.name === 'allowed_location_ids')) {
                    initialFormState[col.name] = String(initialData[col.name]).split(',');
                }
            }
        });
        if (!isNew && initialData) {
            initialFormState[schema[0].name] = initialData[schema[0].name];
        }

        setFormData(initialFormState);
    }, [initialData, schema, isOpen, tableName, isNew]);


    if (!isOpen) return null;

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    
     const handleCheckboxGroupChange = (field: string, value: string, isChecked: boolean) => {
        const currentValues = new Set(formData[field] as string[] || []);
        if (isChecked) {
            currentValues.add(value);
        } else {
            currentValues.delete(value);
        }
        handleChange(field, Array.from(currentValues));
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalData = { ...formData };

        // Convert checkbox arrays back to comma-separated strings
        if (tableName === 'print_size_constraints' && Array.isArray(finalData.allowed_print_sizes)) {
            finalData.allowed_print_sizes = finalData.allowed_print_sizes.join(',');
        }
        if (tableName === 'category_print_locations' && Array.isArray(finalData.allowed_location_ids)) {
            finalData.allowed_location_ids = finalData.allowed_location_ids.join(',');
        }

        onSave(finalData);
    };

    const renderInput = (column: Column, inputId?: string) => {
        const foreignKeyMap: Record<string, { table: string, valueCol: string, nameCol: string }> = {
            manufacturer_id: { table: 'manufacturers', valueCol: 'id', nameCol: 'name' },
            brand_id: { table: 'brands', valueCol: 'id', nameCol: 'name' },
        };

        if ((tableName === 'colors' || tableName === 'sizes' || tableName === 'brands') && column.name === 'manufacturer_id') {
            const options = database.manufacturers.data || [];
            const selectedManufacturer = options.find((m: any) => m.id === formData[column.name]);
            // メーカー依存テーブルの場合、manufacturer_idは読み取り専用
            if (tableName === 'colors' || tableName === 'sizes') {
                return (
                    <input 
                        id={inputId} 
                        name={column.name} 
                        type="text" 
                        value={selectedManufacturer?.name || formData[column.name] || ''} 
                        disabled 
                        className="w-full bg-gray-100 dark:bg-gray-800 p-2 border border-default rounded cursor-not-allowed text-gray-500" 
                    />
                );
            }
            return (
                <select id={inputId} name={column.name} value={formData[column.name] || ''} onChange={e => handleChange(column.name, e.target.value)} className="w-full bg-input-bg dark:bg-input-bg-dark p-2 border border-default rounded">
                    <option value="">選択してください...</option>
                    {options.map(opt => <option key={opt.id as string} value={opt.id as string}>{opt.name}</option>)}
                </select>
            );
        }

        if (tableName === 'print_size_constraints') {
            if (column.name === 'constraint_type') {
                return (
                    <select id={inputId} name="constraint_type" value={formData.constraint_type || 'tag'} onChange={e => handleChange('constraint_type', e.target.value)} className="w-full bg-input-bg dark:bg-input-bg-dark p-2 border border-default rounded">
                        <option value="tag">タグ</option>
                        <option value="location">箇所</option>
                    </select>
                );
            }
            if (column.name === 'constraint_id') {
                const options = formData.constraint_type === 'location' ? database.print_locations.data : database.tags.data;
                const valueCol = formData.constraint_type === 'location' ? 'locationId' : 'tagId';
                const nameCol = formData.constraint_type === 'location' ? 'label' : 'tagName';
                return (
                     <select id={inputId} name="constraint_id" value={formData.constraint_id || ''} onChange={e => handleChange('constraint_id', e.target.value)} className="w-full bg-input-bg dark:bg-input-bg-dark p-2 border border-default rounded">
                         <option value="">選択してください...</option>
                         {options.map(opt => <option key={opt[valueCol] as string} value={opt[valueCol] as string}>{opt[nameCol]}</option>)}
                     </select>
                );
            }
            if (column.name === 'allowed_print_sizes') {
                const SIZES = ['10x10', '30x40', '35x50'];
                return (
                    <div className="flex gap-4 p-2 border border-default rounded bg-base-200 dark:bg-base-dark-300">
                        {SIZES.map(size => (
                            <label key={size} htmlFor={`${inputId}-size-${size}`} className="flex items-center gap-1">
                                <input id={`${inputId}-size-${size}`} name={`allowed_print_sizes_${size}`} type="checkbox" checked={(formData.allowed_print_sizes as string[])?.includes(size)} onChange={e => handleCheckboxGroupChange('allowed_print_sizes', size, e.target.checked)} />
                                {size}
                            </label>
                        ))}
                    </div>
                );
            }
        }
        
         if (tableName === 'category_print_locations' || tableName === 'print_cost_combination' || tableName === 'plate_cost_combination') {
            if (column.name === 'category_id') {
                return (
                    <select id={inputId} name="category_id" value={formData.category_id || ''} onChange={e => handleChange('category_id', e.target.value)} className="w-full bg-input-bg dark:bg-input-bg-dark p-2 border border-default rounded">
                        <option value="">カテゴリーを選択...</option>
                        {database.categories.data.map(c => <option key={c.categoryId as string} value={c.categoryId as string}>{c.categoryName}</option>)}
                    </select>
                );
            }
            if (column.name === 'allowed_location_ids' && tableName === 'category_print_locations') {
                 return (
                    <div className="p-2 border border-default rounded bg-base-200 dark:bg-base-dark-300 max-h-40 overflow-y-auto grid grid-cols-2 gap-2">
                        {database.print_locations.data.map(loc => (
                             <label key={loc.locationId as string} htmlFor={`${inputId}-location-${loc.locationId}`} className="flex items-center gap-1 text-xs">
                                <input id={`${inputId}-location-${loc.locationId}`} name={`allowed_location_ids_${loc.locationId}`} type="checkbox" checked={(formData.allowed_location_ids as string[])?.includes(loc.locationId as string)} onChange={e => handleCheckboxGroupChange('allowed_location_ids', loc.locationId as string, e.target.checked)} />
                                {loc.label}
                            </label>
                        ))}
                    </div>
                );
            }
        }


        if (Object.keys(foreignKeyMap).includes(column.name)) {
            const fkInfo = foreignKeyMap[column.name];
            const options = database[fkInfo.table]?.data || [];
            return (
                <select id={inputId} name={column.name} value={formData[column.name] || ''} onChange={e => handleChange(column.name, e.target.value)} className="w-full bg-input-bg dark:bg-input-bg-dark p-2 border border-default rounded">
                    <option value="">選択してください...</option>
                    {options.map(opt => <option key={opt[fkInfo.valueCol] as string} value={opt[fkInfo.valueCol] as string}>{opt[fkInfo.nameCol]}</option>)}
                </select>
            );
        }

        switch(column.type) {
            case 'NUMBER':
                return <input id={inputId} name={column.name} type="number" value={formData[column.name] ?? ''} onChange={e => handleChange(column.name, e.target.value === '' ? null : Number(e.target.value))} className="w-full bg-input-bg dark:bg-input-bg-dark p-2 border border-default rounded" />;
            case 'BOOLEAN':
                return <input id={inputId} name={column.name} type="checkbox" checked={!!formData[column.name]} onChange={e => handleChange(column.name, e.target.checked)} className="h-5 w-5" />;
            case 'TEXT':
            default:
                return <input id={inputId} name={column.name} type="text" value={formData[column.name] || ''} onChange={e => handleChange(column.name, e.target.value)} className="w-full bg-input-bg dark:bg-input-bg-dark p-2 border border-default rounded" />;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <form onSubmit={handleSubmit} className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-base-300 dark:border-base-dark-300">
                    <h2 className="text-xl font-bold">{isNew ? '新規追加' : '編集'}</h2>
                    <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300"><XMarkIcon className="w-6 h-6" /></button>
                </header>
                <main className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {schema.filter(col => isNew ? col.name !== schema[0].name : true).map(col => {
                        const inputId = `definition-input-${tableName}-${col.id}-${modalId}`;
                        return (
                            <div key={col.id}>
                                <label htmlFor={inputId} className="block text-sm font-medium mb-1">{col.name}</label>
                                {col.name === schema[0].name ? (
                                    <input id={inputId} name={col.name} type="text" value={formData[col.name] || ''} disabled className="w-full bg-gray-100 dark:bg-gray-800 p-2 border border-default rounded cursor-not-allowed text-gray-500" />
                                ) : renderInput(col, inputId)}
                            </div>
                        );
                    })}
                </main>
                <footer className="flex justify-end gap-3 p-4 bg-base-200 dark:bg-base-dark-300/50 border-t">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-base-300 hover:bg-gray-300 dark:bg-base-dark-300 dark:hover:bg-gray-600">キャンセル</button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium rounded-md bg-brand-primary text-white hover:bg-blue-800">保存</button>
                </footer>
            </form>
        </div>
    );
};

export default DefinitionEditModal;
import React, { useState, useEffect } from 'react';
import { Row, Column } from '@shared/types';
import { XMarkIcon } from '@components/atoms';

export interface EditQuoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    quoteData: Row;
    onSave: (updatedData: Row, isNew: boolean) => void;
    customers: Row[];
    schema: Column[];
    statusOptions: {
        quote_status: string[];
        production_status: string[];
        payment_status: string[];
        shipping_status: string[];
        data_confirmation_status: string[];
    };
    shippingCarriers: Row[];
}

const EditQuoteModal: React.FC<EditQuoteModalProps> = ({
    isOpen,
    onClose,
    quoteData,
    onSave,
    customers,
    schema,
    statusOptions,
    shippingCarriers,
}) => {
    const [formData, setFormData] = useState<Row>({});

    useEffect(() => {
        if (quoteData) {
            setFormData(quoteData);
        }
    }, [quoteData]);

    if (!isOpen) return null;

    const isNew = !quoteData?.id;

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        onSave(formData, isNew);
    };
    
    const renderField = (fieldName: string) => {
        const value = formData[fieldName];
        const fieldId = `edit-quote-${fieldName}`;
        
        switch(fieldName) {
            case 'customer_id':
                return (
                    <select id={fieldId} name={fieldName} value={value || ''} onChange={e => handleChange(fieldName, e.target.value)} className="w-full bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-secondary focus:outline-none">
                        <option value="">顧客を選択...</option>
                        {customers.map(c => <option key={c.id as string} value={c.id as string}>{c.company_name || c.name_kanji}</option>)}
                    </select>
                );
            case 'quote_status':
            case 'production_status':
            case 'payment_status':
            case 'shipping_status':
            case 'data_confirmation_status':
                 return (
                    <select id={fieldId} name={fieldName} value={value || ''} onChange={e => handleChange(fieldName, e.target.value)} className="w-full bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-secondary focus:outline-none">
                        {(statusOptions[fieldName as keyof typeof statusOptions] || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                );
            case 'shipping_carrier_id':
                return (
                    <select id={fieldId} name={fieldName} value={value || ''} onChange={e => handleChange(fieldName, e.target.value)} className="w-full bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-secondary focus:outline-none">
                        <option value="">配送会社を選択...</option>
                        {shippingCarriers.map(c => <option key={c.id as string} value={c.id as string}>{c.name as string}</option>)}
                    </select>
                );
            case 'notes':
            case 'internal_notes':
                return <textarea id={fieldId} name={fieldName} value={value || ''} onChange={e => handleChange(fieldName, e.target.value)} rows={3} className="w-full bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm"/>
            
            case 'estimated_delivery_date':
            case 'shipping_date':
            case 'ordered_at':
            case 'payment_due_date':
                const dateValue = value ? new Date(value as string).toISOString().split('T')[0] : '';
                return <input id={fieldId} name={fieldName} type="date" value={dateValue} onChange={e => handleChange(fieldName, e.target.value)} className="w-full bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm"/>

            case 'total_cost_ex_tax':
            case 'shipping_cost':
            case 'tax':
            case 'total_cost_in_tax':
                 return <input id={fieldId} name={fieldName} type="number" value={value || 0} readOnly className="w-full bg-gray-100 dark:bg-gray-800/50 border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm cursor-not-allowed text-right" />
            
            default:
                 return <input id={fieldId} name={fieldName} type="text" value={value || ''} onChange={e => handleChange(fieldName, e.target.value)} className="w-full bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm" />
        }
    }

    const fieldGroups = {
        '主要情報': ['subject', 'customer_id', 'quote_type'],
        'ステータス': ['quote_status', 'production_status', 'payment_status', 'shipping_status', 'data_confirmation_status'],
        '日付': ['ordered_at', 'estimated_delivery_date', 'payment_due_date', 'shipping_date'],
        '配送': ['shipping_carrier_id', 'tracking_number'],
        '金額': ['total_cost_ex_tax', 'shipping_cost', 'tax', 'total_cost_in_tax'],
        'メモ': ['notes', 'internal_notes'],
    };

    const displayNames: Record<string, string> = {
        'subject': '件名', 'customer_id': '顧客', 'quote_type': '見積種別',
        'quote_status': '見積ステータス', 'production_status': '製作ステータス', 'payment_status': '入金状況', 'shipping_status': '発送状況', 'data_confirmation_status': 'データ確認',
        'ordered_at': '受注日', 'estimated_delivery_date': '希望納品日', 'payment_due_date': '支払期日', 'shipping_date': '発送日',
        'shipping_carrier_id': '配送会社', 'tracking_number': '追跡番号',
        'total_cost_ex_tax': '税抜合計', 'shipping_cost': '送料', 'tax': '消費税', 'total_cost_in_tax': '税込合計',
        'notes': '備考', 'internal_notes': '内部メモ',
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-default dark:border-default-dark">
                    <h2 className="text-xl font-bold">{isNew ? '新規案件作成' : `案件編集: ${quoteData.quote_code}`}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                <main className="overflow-y-auto p-6 space-y-6">
                    {Object.entries(fieldGroups).map(([groupName, fields]) => (
                        <div key={groupName} className="p-4 border border-default dark:border-default-dark rounded-lg">
                            <h3 className="text-lg font-semibold mb-4">{groupName}</h3>
                            <div className={`grid grid-cols-1 ${groupName === 'メモ' ? '' : 'md:grid-cols-2'} gap-4`}>
                                {fields.map(fieldName => (
                                    <div key={fieldName} className={`${groupName === 'メモ' ? 'col-span-1' : ''}`}>
                                        <label htmlFor={`edit-quote-${fieldName}`} className="block text-sm font-medium mb-1">{displayNames[fieldName] || fieldName}</label>
                                        {renderField(fieldName)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </main>

                <footer className="flex justify-end gap-3 p-4 bg-base-200 dark:bg-base-dark-300/50 border-t">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-button-muted-bg text-button-muted dark:bg-button-muted-bg-dark dark:text-button-muted-dark hover:opacity-90">
                        キャンセル
                    </button>
                    <button type="button" onClick={handleSave} className="px-4 py-2 text-sm font-medium rounded-md bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark hover:opacity-90">
                        保存
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default EditQuoteModal;
import React from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { PencilIcon, TrashIcon } from '@components/atoms';
import { EnrichedQuote } from '@features/order-management/types';

const getDocTypeInfo = (docType: string, t: (key: string, fallback: string) => string): { label: string, color: string } => {
    switch (docType) {
        case 'estimate': return { label: t('document.doc_type_estimate', '見積書'), color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' };
        case 'invoice': return { label: t('document.doc_type_invoice', '請求書'), color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' };
        case 'delivery_slip': return { label: t('document.doc_type_delivery_slip', '納品書'), color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200' };
        case 'receipt': return { label: t('document.doc_type_receipt', '領収書'), color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200' };
        case 'worksheet': return { label: t('document.doc_type_worksheet_label', '作業指示書'), color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' };
        default: return { label: docType, color: 'bg-gray-200 text-gray-800' };
    }
};


interface DocumentCardProps {
    doc: EnrichedQuote;
    isSelected: boolean;
    onClick: () => void;
    onEdit?: (doc: EnrichedQuote) => void;
    onDelete?: (doc: EnrichedQuote) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ doc, isSelected, onClick, onEdit, onDelete }) => {
    const { t } = useTranslation('document');
    const docInfo = getDocTypeInfo(doc.document_type as string || 'estimate', t);

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onEdit) {
            onEdit(doc);
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDelete && window.confirm(t('document.delete_confirm', 'この帳票を削除してもよろしいですか？'))) {
            onDelete(doc);
        }
    };

    return (
        <div onClick={onClick} className={`p-3 rounded-lg cursor-pointer border-2 transition-all duration-200 flex flex-col md:h-auto ${isSelected ? 'border-brand-primary bg-blue-50 dark:bg-blue-900/20 shadow-lg' : 'bg-base-100 dark:bg-base-dark-200 border-transparent shadow-md hover:shadow-lg hover:-translate-y-px'}`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold text-sm font-mono">{doc.quote_code}</p>
                    <p className="text-xs text-gray-500 truncate">{doc.customer?.company_name || doc.customer?.name_kanji}</p>
                </div>
                <p className="font-semibold text-lg whitespace-nowrap">¥{(doc.total_cost_in_tax as number || 0).toLocaleString()}</p>
            </div>
            <p className="text-xs text-gray-500 truncate mt-1">{doc.subject}</p>
            <div className="flex justify-between items-center mt-auto pt-2 border-t border-base-200 dark:border-base-dark-300/50">
                <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${docInfo.color}`}>{docInfo.label}</span>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{new Date(doc.created_at as string).toLocaleDateString()}</span>
                    {onEdit && (
                        <button
                            onClick={handleEdit}
                            className="p-1 rounded hover:bg-base-200 dark:hover:bg-base-dark-300 transition-colors"
                            title={t('document.edit', '編集')}
                        >
                            <PencilIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={handleDelete}
                            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                            title={t('document.delete', '削除')}
                        >
                            <TrashIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DocumentCard;


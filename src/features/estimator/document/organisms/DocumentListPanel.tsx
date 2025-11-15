import React from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { EnrichedQuote } from '@features/order-management/types';
import DocumentCard from '../molecules/DocumentCard';

interface DocumentListPanelProps {
    documents: EnrichedQuote[];
    selectedQuote: EnrichedQuote | null;
    onCardClick: (doc: EnrichedQuote) => void;
    onEdit?: (doc: EnrichedQuote) => void;
    onDelete?: (doc: EnrichedQuote) => void;
}

const DocumentListPanel: React.FC<DocumentListPanelProps> = ({
    documents,
    selectedQuote,
    onCardClick,
    onEdit,
    onDelete,
}) => {
    const { t } = useTranslation('document');
    return (
        <div className="md:col-span-5 lg:col-span-4 flex flex-col bg-transparent min-h-0">
            <div className="overflow-y-auto space-y-2 md:space-y-3">
                {documents.map(doc => {
                    const uniqueId = doc.virtual_id || doc.id;
                    const isSelected = (selectedQuote?.virtual_id || selectedQuote?.id) === uniqueId;
                    return (
                        <DocumentCard
                            key={uniqueId as string}
                            doc={doc}
                            isSelected={isSelected}
                            onClick={() => onCardClick(doc)}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    );
                })}
                {documents.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        <p>{t('document.no_documents', '表示する帳票がありません。')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentListPanel;


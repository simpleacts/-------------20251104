import React from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Database, PdfTemplateBlock } from '@shared/types';
import { SparklesIcon, XMarkIcon } from '@components/atoms';
import PdfPreview from '../organisms/PdfPreview';

const AiLayoutModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    layouts: PdfTemplateBlock[][];
    onSelect: (blocks: PdfTemplateBlock[]) => void;
    database: Database;
}> = ({ isOpen, onClose, layouts, onSelect, database }) => {
    const { t } = useTranslation('pdf-template-manager');
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-bold flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-purple-500"/>{t('pdf_template.ai_layout_title', 'AIが提案するレイアウト')}</h3>
                    <button onClick={onClose}><XMarkIcon className="w-6 h-6"/></button>
                </header>
                <main className="p-6 overflow-y-auto bg-base-200 dark:bg-base-dark-300 flex-grow grid grid-cols-1 md:grid-cols-3 gap-6">
                    {layouts.map((layout, index) => (
                        <div key={index} className="flex flex-col gap-4">
                            <h4 className="font-bold text-center">{t('pdf_template.proposal', '提案 {index}').replace('{index}', String(index + 1))}</h4>
                            <div className="flex-grow rounded-lg overflow-hidden shadow-lg cursor-pointer transform hover:scale-105 transition-transform" onClick={() => onSelect(layout)}>
                                <PdfPreview blocks={layout} database={database} documentType="estimate" margins={{top:20, right:15, bottom:20, left:15}} isMultiPageSim={false} initialZoomConfig={{ pc: 80, tablet: 80, mobile: 80, embedded: 90 }} alignment="justify-center items-start" fontFamily="font-sans"/>
                            </div>
                        </div>
                    ))}
                </main>
            </div>
        </div>
    );
};

export default AiLayoutModal;

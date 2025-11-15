
import React from 'react';
import { CanvasState, CompanyInfoData } from '@shared/types';
import { EnrichedQuote, QuoteData } from '@features/order-management/types';
import { SpinnerIcon } from '@components/atoms';
import Worksheet from '@features/work-sheet/organisms/Worksheet';
import PdfRenderer from '@features/pdf-template-manager/organisms/PdfRenderer';

interface DocumentPreviewPanelProps {
    isPreviewLoading: boolean;
    selectedQuote: EnrichedQuote | null;
    worksheetDataList: QuoteData[];
    pdfRenderData: any | null; // This can be improved with a specific type
    relevantCanvases: CanvasState[];
    companyInfo?: CompanyInfoData;
    documentCount: number;
    isMobile?: boolean;
}

const DocumentPreviewPanel: React.FC<DocumentPreviewPanelProps> = ({
    isPreviewLoading,
    selectedQuote,
    worksheetDataList,
    pdfRenderData,
    relevantCanvases,
    companyInfo,
    documentCount,
    isMobile = false
}) => {
    if (isPreviewLoading) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                <SpinnerIcon className="w-8 h-8" />
                <p className="ml-2">プレビューを読み込み中...</p>
            </div>
        );
    }

    const previewContainer = (children: React.ReactNode) => (
        <div className={`flex-grow overflow-auto p-4 ${isMobile ? '' : 'bg-pdf-preview-bg'}`}>
            {children}
        </div>
    );

    if (!selectedQuote) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                <p>{documentCount > 0 ? '左のリストから帳票を選択してください。' : '表示する帳票がありません。'}</p>
            </div>
        );
    }

    if (selectedQuote.document_type === 'worksheet') {
        const worksheetPrereqs = worksheetDataList.length > 0;
        return previewContainer(
            worksheetPrereqs ? (
                worksheetDataList.map((data, index) => (
                    <Worksheet key={index} data={data} selectedCanvases={relevantCanvases} notes={data.quote.internal_notes || ''} companyInfo={companyInfo} />
                ))
            ) : (
                <div className="flex items-center justify-center h-full text-gray-500"><p>作業指示書の表示に必要なデータがありません。</p></div>
            )
        );
    }

    if (pdfRenderData) {
        return previewContainer(
             <div className="mx-auto">
                 <PdfRenderer {...pdfRenderData} />
             </div>
        );
    }
    
    return (
        <div className="flex items-center justify-center h-full text-gray-500">
            <p>プレビューデータを生成できませんでした。</p>
        </div>
    );
};

export default DocumentPreviewPanel;


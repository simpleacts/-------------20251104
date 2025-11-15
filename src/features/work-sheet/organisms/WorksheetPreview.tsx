import React from 'react';
import { CanvasState, CompanyInfoData } from '@shared/types';
import { QuoteData } from '@features/order-management/types';
import Worksheet from './Worksheet';

interface WorksheetPreviewProps {
    worksheetDataList: QuoteData[];
    selectedCanvases: CanvasState[];
    notes: string;
    companyInfo?: CompanyInfoData;
}

const WorksheetPreview: React.FC<WorksheetPreviewProps> = ({
    worksheetDataList,
    selectedCanvases,
    notes,
    companyInfo
}) => {
    return (
        <div className="flex-grow overflow-auto p-4" style={{ backgroundColor: 'var(--color-pdf-preview-bg)' }}>
            {worksheetDataList.length > 0 ? (
                worksheetDataList.map((data, index) => (
                    <Worksheet key={index} data={data} selectedCanvases={selectedCanvases} notes={notes} companyInfo={companyInfo} />
                ))
            ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                    <p>案件を選択するとプレビューが表示されます。</p>
                </div>
            )}
        </div>
    );
};

export default WorksheetPreview;
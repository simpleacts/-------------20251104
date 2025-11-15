import React from 'react';
import { Row, CanvasState } from '@shared/types';
import { PrinterIcon, MagnifyingGlassIcon, PlusIcon, TrashIcon } from '@components/atoms';

interface WorksheetConfigPanelProps {
    selectedQuote: Row | null;
    notes: string;
    setNotes: (notes: string) => void;
    selectedCanvases: CanvasState[];
    onSelectQuoteClick: () => void;
    onAddDesignClick: () => void;
    onRemoveDesign: (canvasId: string) => void;
    onPrintClick: () => void;
}

const WorksheetConfigPanel: React.FC<WorksheetConfigPanelProps> = ({
    selectedQuote,
    notes,
    setNotes,
    selectedCanvases,
    onSelectQuoteClick,
    onAddDesignClick,
    onRemoveDesign,
    onPrintClick
}) => {
    return (
        <div className="w-1/5 flex-shrink-0 bg-container-bg dark:bg-container-bg-dark p-4 rounded-lg shadow-md flex flex-col no-print overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">指示書設定</h2>
            <button onClick={onSelectQuoteClick} className="w-full flex items-center justify-center gap-2 bg-button-muted-bg text-button-muted dark:bg-button-muted-bg-dark dark:text-button-muted-dark font-semibold py-2 px-4 rounded-lg transition-colors text-sm mb-4 hover:opacity-90">
                <MagnifyingGlassIcon className="w-4 h-4"/>
                {selectedQuote ? '別の案件を選択' : '受注案件を選択'}
            </button>
            
            {!selectedQuote ? (
                <div className="text-center text-gray-500 p-8">
                    <p>最初に受注案件を選択してください。</p>
                </div>
            ) : (
                <div className="flex-grow flex flex-col min-h-0">
                    <div className="text-xs p-2 bg-base-200 dark:bg-base-dark-300 rounded-md space-y-1 mb-4">
                        <p><strong>見積コード:</strong> {selectedQuote.quote_code}</p>
                        <p><strong>顧客ID:</strong> {selectedQuote.customer_id}</p>
                    </div>

                    <h3 className="text-md font-semibold mb-2">デザイン</h3>
                    <div className="space-y-2 mb-4">
                        {selectedCanvases.map(canvas => (
                            <div key={canvas.id} className="flex items-center justify-between p-2 bg-base-200 dark:bg-base-dark-300 rounded-md">
                                <span className="text-xs">{canvas.name}</span>
                                <button onClick={() => onRemoveDesign(canvas.id)} className="text-action-danger"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                    <button onClick={onAddDesignClick} className="w-full flex items-center justify-center gap-2 bg-button-muted-bg text-button-muted dark:bg-button-muted-bg-dark dark:text-button-muted-dark font-semibold py-2 px-4 rounded-lg transition-colors text-sm mb-4 hover:opacity-90">
                        <PlusIcon className="w-4 h-4"/> デザインを追加
                    </button>

                    <h3 className="text-md font-semibold mb-2">備考</h3>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} className="w-full text-xs p-2 border rounded-md bg-input-bg dark:bg-input-bg-dark"></textarea>
                    
                    <button onClick={onPrintClick} className="mt-auto w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-blue-800 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                        <PrinterIcon className="w-5 h-5"/> 印刷プレビュー
                    </button>
                </div>
            )}
        </div>
    );
};

export default WorksheetConfigPanel;

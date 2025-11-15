import React, { useEffect, useMemo, useState } from 'react';
import { useDatabase } from '@core/contexts/DatabaseContext';
import PrintableEstimate from '@shared/components/PrintableEstimate';
import { CanvasState, CostDetails, Database, PdfTemplateBlock, PrintDesign, ProcessingGroup, Row } from '@shared/types';
import { MagnifyingGlassIcon, PlusIcon, PrinterIcon, SpinnerIcon, TrashIcon } from '@components/atoms';
import DesignSelectionModal from '@features/proofing-tool/modals/DesignSelectionModal';
import OrderSearchModal from '@features/proofing-tool/modals/OrderSearchModal';
import { useWorksheetData } from '../hooks/useWorksheetData';


interface WorksheetGeneratorProps {
    proofingCanvases: CanvasState[];
}

const WorksheetGenerator: React.FC<WorksheetGeneratorProps> = ({ proofingCanvases }) => {
    const { database } = useDatabase();
    const [selectedQuote, setSelectedQuote] = useState<Row | null>(null);
    
    // 編集モードで見積を自動選択
    useEffect(() => {
        const quoteIdToEdit = sessionStorage.getItem('quoteToEditForWorksheet');
        if (quoteIdToEdit && database?.quotes?.data) {
            const quote = database.quotes.data.find((q: Row) => q.id === quoteIdToEdit);
            if (quote) {
                setSelectedQuote(quote);
                sessionStorage.removeItem('quoteToEditForWorksheet');
            }
        }
    }, [database]);
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
    const [isDesignModalOpen, setIsDesignModalOpen] = useState(false);
    const [selectedCanvasIds, setSelectedCanvasIds] = useState<Set<string>>(new Set());
    
    const [notes, setNotes] = useState('');
    const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

    const { worksheetDataList, companyInfo, isLoading, error } = useWorksheetData(selectedQuote);

    const relevantCanvases = useMemo(() => {
        if (!selectedQuote) return [];
        return proofingCanvases.filter(c => c.quoteId === selectedQuote.id);
    }, [selectedQuote, proofingCanvases]);
    
    const selectedCanvases = useMemo(() => {
        return proofingCanvases.filter(c => selectedCanvasIds.has(c.id));
    }, [selectedCanvasIds, proofingCanvases]);
    
    const handleQuoteSelect = (quote: Row) => {
        setSelectedQuote(quote);
        setNotes(quote.internal_notes || '');
        
        const relevantCanvasesForNewQuote = proofingCanvases.filter(c => c.quoteId === quote.id);
        
        const internalNotes = quote.internal_notes || '';
        const match = (internalNotes as string).match(/PROOFING_IMAGES_JSON_START\n(.*?)\nPROOFING_IMAGES_JSON_END/s);
        let proofingImages: {productId: string, dataUrl: string, colorName: string}[] = [];
        if (match && match[1]) {
            try {
                proofingImages = JSON.parse(match[1]);
            } catch (e) {
                console.error("Failed to parse proofing images JSON from internal_notes", e);
            }
        }

        const relevantCanvasIds = new Set(relevantCanvasesForNewQuote.map(c => c.id));
        setSelectedCanvasIds(relevantCanvasIds);
        
        setIsQuoteModalOpen(false);
    };

    const handleDesignSelect = (canvasId: string) => {
        setSelectedCanvasIds(prev => new Set(prev).add(canvasId));
        setIsDesignModalOpen(false);
    };

    const handleDesignRemove = (canvasId: string) => {
        setSelectedCanvasIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(canvasId);
            return newSet;
        });
    };
    
    const handlePrint = () => {
        if (worksheetDataList.length > 0) {
            setIsPrintPreviewOpen(true);
        } else {
            alert('印刷するデータがありません。');
        }
    };

    const pdfRenderData = useMemo(() => {
        if (!worksheetDataList || worksheetDataList.length === 0 || !companyInfo || !database) return null;

        const data = worksheetDataList[0];
        const designs = (data.quote.database.quote_designs?.data.filter((d: Row) => d.quote_id === data.quote.id) as PrintDesign[] || []);
        
        // FIX: Calculate blocks and margins to satisfy PrintableEstimateProps
        const templates = database.pdf_templates?.data || [];
        const templateId = 'tpl_worksheet_standard';
        const template = templates.find(t => t.id === templateId);

        let blocks: PdfTemplateBlock[] = [];
        let margins = { top: 20, right: 15, bottom: 20, left: 15 };

        if (template?.config_json) {
            try {
                const config = JSON.parse(template.config_json as string);
                blocks = config.blocks || [];
                margins = config.margins || { top: 20, right: 15, bottom: 20, left: 15 };
            } catch (e) { console.error("Failed to parse template config in WorksheetGenerator", e); }
        }

        return {
          templateId: 'tpl_worksheet_standard',
          templates: data.quote.database.pdf_templates?.data || [],
          database: database as Database,
          documentType: 'worksheet' as 'worksheet',
          orderDetails: data.items,
          processingGroups: [{
            id: String(data.quote.id),
            name: String(data.product.name),
            items: data.items,
            printDesigns: designs,
            selectedOptions: [],
          }] as ProcessingGroup[],
          cost: {} as CostDetails, // Not needed for worksheet
          totalQuantity: data.totals.grandTotal,
          customerInfo: data.customer as any,
          estimateId: data.quote.quote_code as string,
          companyInfo: companyInfo!,
          notes: notes,
          selectedCanvases: selectedCanvases,
          // FIX: Add blocks and margins
          blocks,
          margins,
        };
    }, [worksheetDataList, companyInfo, notes, selectedCanvases, database]);

    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <SpinnerIcon className="w-12 h-12 text-brand-primary" />
                <p className="ml-4">指示書メーカーを準備中...</p>
            </div>
        );
    }
    if (error) {
        return <div className="p-4 text-red-600">{error}</div>;
    }

    return (
        <>
        <div className="flex flex-col h-full">
            <header className="mb-6 no-print">
                <h1 className="text-3xl font-bold">指示・指示確認書メーカー</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">受注案件と連携し、印刷現場向けの作業指示書やお客様への確認書を生成します。</p>
            </header>
            
            <div className="flex-grow flex gap-6 overflow-hidden">
                {/* Left Panel: Configuration */}
                <div className="w-1/5 flex-shrink-0 bg-container-bg dark:bg-container-bg-dark p-4 rounded-lg shadow-md flex flex-col no-print overflow-y-auto">
                    <h2 className="text-lg font-bold mb-4">指示書設定</h2>
                    <button onClick={() => setIsQuoteModalOpen(true)} className="w-full flex items-center justify-center gap-2 bg-button-muted-bg text-button-muted dark:bg-button-muted-bg-dark dark:text-button-muted-dark font-semibold py-2 px-4 rounded-lg transition-colors text-sm mb-4 hover:opacity-90">
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
                                        <button onClick={() => handleDesignRemove(canvas.id)} className="text-action-danger"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setIsDesignModalOpen(true)} className="w-full flex items-center justify-center gap-2 bg-button-muted-bg text-button-muted dark:bg-button-muted-bg-dark dark:text-button-muted-dark font-semibold py-2 px-4 rounded-lg transition-colors text-sm mb-4 hover:opacity-90">
                                <PlusIcon className="w-4 h-4"/> デザインを追加
                            </button>

                            <h3 className="text-md font-semibold mb-2">備考</h3>
                            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} className="w-full text-xs p-2 border rounded-md bg-input-bg dark:bg-input-bg-dark"></textarea>
                            
                            <button onClick={handlePrint} className="mt-auto w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-blue-800 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                                <PrinterIcon className="w-5 h-5"/> 印刷プレビュー
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Panel: Preview */}
                <div className="flex-grow overflow-auto p-4" style={{ backgroundColor: 'var(--color-pdf-preview-bg)' }}>
                    {worksheetDataList.length > 0 && pdfRenderData ? (
                        <PrintableEstimate {...pdfRenderData} isEmbedded={true} onClose={() => {}} />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            <p>案件を選択するとプレビューが表示されます。</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
        {isPrintPreviewOpen && pdfRenderData && (
            <PrintableEstimate {...pdfRenderData} onClose={() => setIsPrintPreviewOpen(false)} />
        )}
        {isQuoteModalOpen && database && (
            <OrderSearchModal
                isOpen={isQuoteModalOpen}
                onClose={() => setIsQuoteModalOpen(false)}
                onSelect={handleQuoteSelect}
                database={database as Database}
            />
        )}
        <DesignSelectionModal isOpen={isDesignModalOpen} onClose={() => setIsDesignModalOpen(false)} onSelect={handleDesignSelect} canvases={relevantCanvases} />
        </>
    );
};

export default WorksheetGenerator;
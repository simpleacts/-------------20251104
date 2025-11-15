import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CanvasState, CompanyInfoData, CostDetails, CustomerInfo, Database, DocumentType, OrderDetail, PdfTemplateBlock, ProcessingGroup, Row } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, PrinterIcon, XMarkIcon } from '../ui/atoms/icons';
import PdfRenderer from './PdfRenderer';
import { generateAndDownloadPDF, generateAndOpenPDFForPrint } from '../utils/pdfGenerator';

interface PrintableEstimateProps {
  onClose: () => void;
  templateId: string;
  templates: Row[];
  database: Database;
  documentType: DocumentType;
  orderDetails: OrderDetail[];
  processingGroups: ProcessingGroup[];
  cost: CostDetails;
  totalQuantity: number;
  customerInfo: CustomerInfo;
  companyInfo: CompanyInfoData | Row;
  estimateId: string;
  paymentDueDate?: string | null;
  isForPrint?: boolean;
  isBringInMode?: boolean;
  showGroupTotalsInPdf?: boolean;
  isEmbedded?: boolean;
  embeddedContext?: string;
  selectedCanvases?: CanvasState[];
  blocks: PdfTemplateBlock[];
  margins: { top: number, right: number, bottom: number, left: number };
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;

export const PrintableEstimate: FC<PrintableEstimateProps> = (props) => {
  const { 
    onClose,
    isEmbedded = false,
  } = props;
  
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef({ x: 0, y: 0 });

  const { blocks, margins, alignment, initialZoomConfig, modalWidthVw, fontFamily } = useMemo(() => {
    const template = props.templates.find(t => t.id === props.templateId);
    
    if (template?.config_json) {
      try {
        const config = JSON.parse(template.config_json as string);
        return {
          blocks: config.blocks || [],
          margins: config.margins || { top: 20, right: 15, bottom: 20, left: 15 },
          alignment: config.alignment || 'justify-center items-start',
          initialZoomConfig: config.initialZoomConfig || { pc: 80, tablet: 70, mobile: 60, embedded: 90 },
          modalWidthVw: config.modalWidthVw || 75,
          fontFamily: config.fontFamily || 'font-sans'
        };
      } catch (e) { console.error("Failed to parse template config", e); }
    }
    return { 
        blocks: [], 
        margins: { top: 20, right: 15, bottom: 20, left: 15 },
        alignment: 'justify-center items-start',
        initialZoomConfig: { pc: 80, tablet: 70, mobile: 60, embedded: 90 },
        modalWidthVw: 75,
        fontFamily: 'font-sans'
    };
  }, [props.templateId, props.templates]);

  const fitPreview = useCallback(() => {
    if (viewportRef.current) {
        let zoomPercent = initialZoomConfig.pc;
        if (isEmbedded) {
            zoomPercent = initialZoomConfig.embedded;
        } else {
            const screenWidth = window.innerWidth;
            if (screenWidth < 768) zoomPercent = initialZoomConfig.mobile;
            else if (screenWidth < 1024) zoomPercent = initialZoomConfig.tablet;
        }
        
        const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, zoomPercent / 100));
        setTransform({ scale, x: 0, y: 0 });
    }
  }, [initialZoomConfig, isEmbedded]);

  const handleZoom = useCallback((factor: number, centerX: number, centerY: number) => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const pivotX = centerX - rect.left;
    const pivotY = centerY - rect.top;

    setTransform(prev => {
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * factor));
        if (newScale === prev.scale) return prev;
        const ratio = newScale / prev.scale;
        const newX = pivotX - (pivotX - prev.x) * ratio;
        const newY = pivotY - (pivotY - prev.y) * ratio;
        return { scale: newScale, x: newX, y: newY };
    });
  }, []);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    if (!isEmbedded) {
        document.body.style.overflow = 'hidden';
    }
    
    fitPreview();
    window.addEventListener('resize', fitPreview);
    
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (!isEmbedded) document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', fitPreview);
    };
  }, [isEmbedded, onClose, fitPreview]);

  // wheelイベントを手動で追加（passive: falseでpreventDefaultを有効化）
  useEffect(() => {
    if (isEmbedded || !viewportRef.current) return;
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      handleZoom(1 - e.deltaY * 0.001, e.clientX, e.clientY);
    };
    
    const viewport = viewportRef.current;
    viewport.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      viewport.removeEventListener('wheel', handleWheel);
    };
  }, [isEmbedded, handleZoom]);

  const handleButtonZoom = (factor: number) => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    handleZoom(factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); isPanningRef.current = true;
    lastPanPointRef.current = { x: e.clientX, y: e.clientY };
    if (viewportRef.current) viewportRef.current.style.cursor = 'grabbing';
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanningRef.current) return;
    const dx = e.clientX - lastPanPointRef.current.x;
    const dy = e.clientY - lastPanPointRef.current.y;
    setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    lastPanPointRef.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseUpOrLeave = () => {
    isPanningRef.current = false;
    if (viewportRef.current) viewportRef.current.style.cursor = 'grab';
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // PDF生成用のデータを準備
  const preparePdfData = useCallback(() => {
    // processingGroupsからprintDesignsを抽出
    const printDesigns = props.processingGroups.flatMap(group => 
      (group.printDesigns || []).map((design: any) => ({
        id: design.id || Math.random().toString(),
        location: design.location,
        colors: design.colors || 0,
        ...design
      }))
    );

    // 簡易的なpricingDataとprintLocations（実際のデータがあればそれを使用）
    const pricingData = {
      printPricingTiers: [
        { min: 0, max: 999999, firstColor: 0, additionalColor: 0 }
      ]
    };
    const printLocations: any[] = [];

    return {
      type: props.documentType === 'worksheet' ? 'worksheet' : 
            props.documentType === 'invoice' ? 'invoice' :
            props.documentType === 'delivery_slip' ? 'delivery_slip' :
            props.documentType === 'receipt' ? 'receipt' : 'quote',
      data: {
        documentType: props.documentType,
        estimatorState: {
          estimateId: props.estimateId,
          customerInfo: props.customerInfo,
          senderInfo: props.companyInfo,
          processingGroups: props.processingGroups,
          isBringInMode: props.isBringInMode || false,
        },
        costDetails: props.cost,
        processingGroups: props.processingGroups,
        customerInfo: props.customerInfo,
        companyInfo: props.companyInfo,
        estimateId: props.estimateId,
        paymentDueDate: props.paymentDueDate,
        totalQuantity: props.totalQuantity,
        isBringInMode: props.isBringInMode || false,
        printDesigns,
        pricingData,
        printLocations,
      },
      filename: `${props.estimateId}_${props.customerInfo.company_name || props.customerInfo.name_kanji || 'document'}_${props.documentType}.pdf`
    };
  }, [props]);

  const handlePrint = async () => {
    if (isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    try {
      const pdfData = preparePdfData();
      await generateAndOpenPDFForPrint(pdfData);
    } catch (error) {
      console.error('Failed to generate PDF for print:', error);
      alert('PDFの生成に失敗しました。');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    try {
      const pdfData = preparePdfData();
      await generateAndDownloadPDF(pdfData);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert('PDFのダウンロードに失敗しました。');
    } finally {
      setIsGeneratingPDF(false);
    }
  };
  
  const pdfRenderData = useMemo(() => {
    return { ...props, blocks, margins, fontFamily };
  }, [props, blocks, margins, fontFamily]);

  if (isEmbedded) {
    return (
        <div className={`A4-paper bg-white shadow-lg mx-auto my-4 flex flex-col`}>
            <PdfRenderer {...pdfRenderData as any} />
        </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex flex-col items-center justify-center p-4 print:hidden no-print" onClick={onClose}>
        <div className="w-full h-full flex flex-col bg-container-bg dark:bg-container-bg-dark shadow-xl rounded-lg max-h-[95vh]" style={{ width: `${modalWidthVw}vw`}} onClick={e => e.stopPropagation()}>
          <header className="p-4 bg-white dark:bg-base-dark-200 text-black dark:text-white border-b border-default dark:border-default-dark flex justify-between items-center flex-shrink-0 no-print">
            <h2 className="text-xl font-bold">印刷プレビュー</h2>
            <div className="flex items-center gap-3">
              <button 
                onClick={handlePrint} 
                disabled={isGeneratingPDF}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold transition-colors flex items-center justify-center p-2 rounded-md shadow-md" 
                title="印刷する"
              >
                <PrinterIcon className="w-5 h-5"/>
                {isGeneratingPDF ? '生成中...' : '印刷'}
              </button>
              <button 
                onClick={handleDownloadPDF} 
                disabled={isGeneratingPDF}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold transition-colors flex items-center justify-center p-2 rounded-md shadow-md" 
                title="PDFダウンロード"
              >
                PDF
                {isGeneratingPDF ? '...' : ''}
              </button>
              <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold transition-colors flex items-center justify-center p-2 rounded-md shadow-md" title="閉じる"><XMarkIcon className="w-5 h-5"/></button>
            </div>
          </header>
          
          <div 
            ref={viewportRef}
            className={`flex-1 relative overflow-auto no-print flex ${alignment}`}
            style={{ backgroundColor: 'var(--color-pdf-preview-bg)', cursor: 'grab' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
          >
              <div style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: 'top center' }}>
                  <div className={`A4-paper bg-white shadow-lg my-4 flex flex-col`}>
                      <PdfRenderer {...pdfRenderData as any} />
                  </div>
              </div>
          </div>
          <div className="absolute bottom-8 right-8 z-10 flex items-center gap-2 bg-white/80 dark:bg-base-dark/80 backdrop-blur-sm p-2 rounded-lg shadow-lg" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => handleButtonZoom(1 / 1.25)} className="w-8 h-8 rounded bg-base-200 hover:bg-base-300 dark:bg-base-dark-300 dark:hover:bg-gray-600 transition-colors"><ChevronLeftIcon/></button>
              <span className="w-16 text-center text-sm font-semibold">{Math.round(transform.scale * 100)}%</span>
              <button onClick={() => handleButtonZoom(1.25)} className="w-8 h-8 rounded bg-base-200 hover:bg-base-300 dark:bg-base-dark-300 dark:hover:bg-gray-600 transition-colors"><ChevronRightIcon/></button>
              <button onClick={fitPreview} className="h-8 px-3 text-sm font-semibold rounded bg-base-200 hover:bg-base-300 dark:bg-base-dark-300 dark:hover:bg-gray-600 transition-colors">リセット</button>
          </div>
        </div>
      </div>
      <div className="hidden print:block">
        <div className={`A4-paper bg-white flex flex-col`}>
            <PdfRenderer {...pdfRenderData as any} isForPrint={true} />
        </div>
      </div>
    </>
  );
};

export default PrintableEstimate;
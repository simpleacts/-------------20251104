import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CompanyInfoData, CostDetails, CustomerInfo, Database, DocumentType, OrderDetail, PdfTemplateBlock, ProcessingGroup } from '@shared/types';
import { ChevronLeftIcon, ChevronRightIcon } from '@components/atoms';
import PdfRenderer from './PdfRenderer';

const MIN_SCALE = 0.1;
const MAX_SCALE = 4;

const PdfPreview: React.FC<{ blocks: PdfTemplateBlock[], database: Database, documentType: DocumentType, margins: { top: number, right: number, bottom: number, left: number }, isMultiPageSim: boolean, initialZoomConfig: { pc: number, tablet: number, mobile: number, embedded: number }, alignment: string, fontFamily: string }> = ({ blocks, database, documentType, margins, isMultiPageSim, initialZoomConfig, alignment, fontFamily }) => {
    const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
    const viewportRef = useRef<HTMLDivElement>(null);
    const isPanningRef = useRef(false);
    const lastPanPointRef = useRef({ x: 0, y: 0 });
    const lastTouchDistanceRef = useRef(0);

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

    const handleButtonZoom = (factor: number) => {
        if (!viewportRef.current) return;
        const rect = viewportRef.current.getBoundingClientRect();
        handleZoom(factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
    };

    const fitPreview = useCallback(() => {
        if (viewportRef.current) {
            let zoomPercent = 80;
            const screenWidth = window.innerWidth;
            if (screenWidth >= 1024) {
                zoomPercent = initialZoomConfig.pc;
            } else if (screenWidth >= 768) {
                zoomPercent = initialZoomConfig.tablet;
            } else {
                zoomPercent = initialZoomConfig.mobile;
            }
            const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, zoomPercent / 100));
            setTransform({ scale, x: 0, y: 0 });
        }
    }, [initialZoomConfig]);

    useEffect(() => {
        fitPreview();
        window.addEventListener('resize', fitPreview);
        return () => window.removeEventListener('resize', fitPreview);
    }, [fitPreview]);
    
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
    const getTouchDistance = (touches: React.TouchList) => {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };
    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) { isPanningRef.current = true; lastPanPointRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; } 
        else if (e.touches.length === 2) { isPanningRef.current = false; lastTouchDistanceRef.current = getTouchDistance(e.touches); }
    };
    const handleTouchMove = (e: React.TouchEvent) => {
        e.preventDefault();
        if (e.touches.length === 1 && isPanningRef.current) {
            const dx = e.touches[0].clientX - lastPanPointRef.current.x;
            const dy = e.touches[0].clientY - lastPanPointRef.current.y;
            setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
            lastPanPointRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            const newDist = getTouchDistance(e.touches);
            if (lastTouchDistanceRef.current === 0) { lastTouchDistanceRef.current = newDist; return; }
            const zoomFactor = newDist / lastTouchDistanceRef.current;
            const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            handleZoom(zoomFactor, centerX, centerY);
            lastTouchDistanceRef.current = newDist;
        }
    };
    const handleTouchEnd = () => { isPanningRef.current = false; lastTouchDistanceRef.current = 0; };

    const sampleData = useMemo(() => {
        const companyInfoData: Partial<CompanyInfoData> = {};
        (database.company_info?.data || []).forEach(row => {
            const keyMap: Record<string, keyof CompanyInfoData> = {
                'COMPANY_NAME': 'companyName', 'COMPANY_ZIP': 'zip', 'COMPANY_ADDRESS': 'address', 'COMPANY_TEL': 'tel', 'COMPANY_FAX': 'fax', 'BANK_NAME': 'bankName', 'BANK_BRANCH_NAME': 'bankBranchName', 'BANK_ACCOUNT_TYPE': 'bankAccountType', 'BANK_ACCOUNT_NUMBER': 'bankAccountNumber', 'BANK_ACCOUNT_HOLDER': 'bankAccountHolder', 'INVOICE_ISSUER_NUMBER': 'invoiceIssuerNumber',
            };
            const mappedKey = keyMap[row.key as string];
            if (mappedKey) { (companyInfoData as any)[mappedKey] = row.value; }
        });
        
        const items = Array.from({ length: isMultiPageSim ? 40 : 3 }, (_, i) => ({
            productId: `sample_${i}`,
            productName: `サンプル商品 No.${i + 1} (カラー/サイズ)`,
            unitPrice: 1000 + i * 50,
            quantity: 1 + (i % 5),
            color: 'サンプルカラー',
            size: 'M',
        })) as OrderDetail[];

        return {
            estimateId: "QT-SAMPLE-001",
            customerInfo: { companyName: "株式会社サンプル", nameKanji: "山田 太郎", zipCode: "100-0001", address1: "東京都千代田区千代田1-1", address2: "サンプルビル5F", phone: "03-1234-5678" } as unknown as CustomerInfo,
            companyInfo: companyInfoData as CompanyInfoData,
            orderDetails: items,
            cost: { totalCost: 108400, shippingCost: 0, tax: 10840, totalCostWithTax: 119240 } as CostDetails,
            notes: "ここに備考が入ります。納期や注意事項などを記載します。",
            worksheetNotes: "・Tシャツの色味は最終サンプルで確認してください。\n・プリント位置は指定の箇所からズレがないように注意してください。"
        };
    }, [database.company_info, isMultiPageSim]);

    const pdfRenderData = useMemo(() => ({
        ...sampleData,
        documentType,
        blocks,
        margins,
        database,
        fontFamily,
        templateId: 'tpl_sample',
        processingGroups: [{
            id: 'group_sample',
            name: 'サンプルグループ',
            items: sampleData.orderDetails,
            printDesigns: [],
        }] as ProcessingGroup[],
        totalQuantity: sampleData.orderDetails.reduce((sum, item) => sum + item.quantity, 0),
    }), [sampleData, documentType, blocks, margins, database, fontFamily]);
    
    const transformOrigin = useMemo(() => {
        let origin = 'center ';
        if (alignment.includes('items-start')) {
            origin = 'top ';
        } else if (alignment.includes('items-end')) {
            origin = 'bottom ';
        }
        
        if (alignment.includes('justify-start')) {
            origin += 'left';
        } else if (alignment.includes('justify-end')) {
            origin += 'right';
        } else {
            origin += 'center';
        }
        
        return origin.trim();
    }, [alignment]);

    return (
         <div
            ref={viewportRef}
            className={`w-full h-full relative overflow-auto touch-none p-5 flex ${alignment}`}
            style={{ cursor: 'grab', backgroundColor: 'var(--color-pdf-preview-bg)' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
             <div style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin }}>
                 <div className={`A4-paper bg-white shadow-lg my-4 flex flex-col`}>
                    <PdfRenderer {...pdfRenderData as any} />
                 </div>
            </div>
            <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 bg-white/80 dark:bg-base-dark/80 backdrop-blur-sm p-2 rounded-lg shadow-lg" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => handleButtonZoom(1 / 1.25)} className="w-8 h-8 rounded bg-base-200 hover:bg-base-300 dark:bg-base-dark-300 dark:hover:bg-gray-600 transition-colors"><ChevronLeftIcon/></button>
                <span className="w-16 text-center text-sm font-semibold">{Math.round(transform.scale * 100)}%</span>
                <button onClick={() => handleButtonZoom(1.25)} className="w-8 h-8 rounded bg-base-200 hover:bg-base-300 dark:bg-base-dark-300 dark:hover:bg-gray-600 transition-colors"><ChevronRightIcon/></button>
                <button onClick={fitPreview} className="h-8 px-3 text-sm font-semibold rounded bg-base-200 hover:bg-base-300 dark:bg-base-dark-300 dark:hover:bg-gray-600 transition-colors">リセット</button>
            </div>
        </div>
    );
};

export default PdfPreview;

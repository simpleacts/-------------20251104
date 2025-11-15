import React, { FC, useMemo, useCallback } from 'react';
import {
    PdfTemplateBlock,
    Database,
    DocumentType,
    OrderDetail,
    CostDetails,
    CustomerInfo,
    CompanyInfoData,
    ProcessingGroup,
    Row,
    CanvasState
} from '@shared/types';

export interface PdfRendererProps {
  blocks: PdfTemplateBlock[];
  margins: { top: number; right: number; bottom: number; left: number };
  database: Database;
  documentType: DocumentType;
  templateId: string;
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
  selectedCanvases?: CanvasState[];
  fontFamily?: string;
}

const PdfRenderer: FC<PdfRendererProps> = (props) => {
    const {
        blocks, margins, database, documentType, templateId,
        orderDetails, cost, totalQuantity,
        customerInfo, companyInfo, estimateId, paymentDueDate,
        isForPrint = false, isBringInMode = false, showGroupTotalsInPdf = false,
        selectedCanvases,
        fontFamily = 'font-sans'
    } = props;
    
    const processingGroups = useMemo(() => {
        return props.processingGroups;
    }, [props.processingGroups]);


    const renderBlock = useCallback((block: PdfTemplateBlock, pageContext: { currentPage: number, totalPages: number }) => {
        if (!block.enabled) return null;

        const alignClass = `text-${block.config.align || 'left'}`;

        let title = block.config.title || "御見積書";
        if (documentType === 'invoice') title = block.config.title || '御請求書';
        else if (documentType === 'delivery_slip') title = block.config.title || '納品書';
        else if (documentType === 'worksheet') title = block.config.title || '作業指示書';

        const totalLabel = title.includes('請求') ? '御請求金額 (税込)' : '御見積金額 (税込)';
        const documentNumberLabel = title.includes('請求') ? '請求書番号' : '見積書番号';
        const addresseeLine = [customerInfo.companyName, customerInfo.nameKanji].filter(Boolean).join(' ') || '(宛名)';
        const postalCodeLine = customerInfo.zipCode ? `〒${customerInfo.zipCode.slice(0,3)}-${customerInfo.zipCode.slice(3)}` : '';


        switch (block.type) {
            case 'HEADER': return <div className={`my-8 ${alignClass}`}><h1 className="text-3xl font-bold">{title}</h1></div>;
            case 'RECIPIENT_INFO': return (<div className={`space-y-1 text-xs ${alignClass}`}><div className="text-base border-b-2 border-black pb-1">{addresseeLine} 様</div><div className="pt-2">{postalCodeLine && <p>{postalCodeLine}</p>}<p>{customerInfo.address1}</p><p>{customerInfo.address2}</p><p>TEL: {customerInfo.phone}</p></div></div>);
            case 'SENDER_INFO': {
                if (!companyInfo) return null;
                const isCustomSender = 'company_name' in companyInfo;
                
                return (
                    <div className={`${alignClass}`}>
                        <div className="space-y-1 text-xs">
                            <p className="font-bold">{isCustomSender ? companyInfo.company_name || companyInfo.name_kanji : (companyInfo as CompanyInfoData).companyName}</p>
                            <p>〒{isCustomSender ? companyInfo.zip_code : (companyInfo as CompanyInfoData).zip}</p>
                            <p>{isCustomSender ? companyInfo.address1 : (companyInfo as CompanyInfoData).address}</p>
                            <p>TEL: {isCustomSender ? companyInfo.phone : (companyInfo as CompanyInfoData).tel}</p>
                            {(companyInfo as CompanyInfoData).invoiceIssuerNumber && !isCustomSender && 
                                <p className="pt-2">適格請求書発行事業者登録番号：<br/>{(companyInfo as CompanyInfoData).invoiceIssuerNumber}</p>
                            }
                        </div>
                    </div>
                );
            }
            case 'STAMP': return <div className="h-20 w-20 border border-black flex items-center justify-center text-black/50 text-xs">捺印欄</div>;
            case 'INFO': return <div className={`text-xs mb-4 ${alignClass}`}><p>{documentNumberLabel}: {estimateId}</p><p>発行日: {new Date().toLocaleDateString('ja-JP-u-ca-japanese', { era: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p></div>;
            case 'TOTALS_HEADER': return <div className="border-y-2 border-black py-4 mb-6"><p className="flex justify-between items-baseline"><span className="text-lg font-bold">{totalLabel}</span><span className="text-2xl font-bold">¥ {cost ? (cost.totalCostWithTax || 0).toLocaleString() : '...'}</span></p></div>;
            case 'SUMMARY': return (<div className="flex justify-end mt-4"><div className="w-1/2"><table className="w-full text-xs"><tbody><tr><td className="p-1 bg-gray-100 font-bold border-2 border-black">小計</td><td className="p-1 text-right border-y-2 border-r-2 border-black">¥{cost ? (cost.totalCost || 0).toLocaleString() : '...'}</td></tr><tr><td className="p-1 bg-gray-100 font-bold border-x-2 border-b-2 border-black">送料</td><td className="p-1 text-right border-b-2 border-r-2 border-black">{cost && (cost.shippingCost || 0) > 0 ? `¥${cost.shippingCost.toLocaleString()}` : '無料'}</td></tr><tr><td className="p-1 bg-gray-100 font-bold border-x-2 border-b-2 border-black">消費税</td><td className="p-1 text-right border-b-2 border-r-2 border-black">¥{cost ? (cost.tax || 0).toLocaleString() : '...'}</td></tr><tr><td className="p-1 bg-gray-100 font-bold border-x-2 border-b-2 border-black">合計</td><td className="p-1 text-right border-b-2 border-r-2 border-black font-bold text-base">¥{cost ? (cost.totalCostWithTax || 0).toLocaleString() : '...'}</td></tr></tbody></table></div></div>);
            case 'NOTES': return <div className="mt-8"><h3 className="font-bold border-b border-black text-sm">備考</h3><div className="mt-2 text-xs whitespace-pre-wrap">{customerInfo.notes || ' '}</div></div>;
            case 'BANK_INFO': {
                 const bankInfo = companyInfo as CompanyInfoData; // Assume bank info is always from company
                 return (<div className="mt-8 p-3 border-2 border-black"><h3 className="font-bold text-center mb-2 text-sm">お振込先</h3><div className="text-xs grid grid-cols-3 gap-x-2"><div className="col-span-1 font-semibold">金融機関名</div><div className="col-span-2">{bankInfo.bankName}</div><div className="col-span-1 font-semibold">支店名</div><div className="col-span-2">{bankInfo.bankBranchName}</div><div className="col-span-1 font-semibold">口座種別・番号</div><div className="col-span-2">{bankInfo.bankAccountType} {bankInfo.bankAccountNumber}</div><div className="col-span-1 font-semibold">口座名義</div><div className="col-span-2">{bankInfo.bankAccountHolder}</div></div>{paymentDueDate && <p className="text-center mt-2 font-bold">お支払い期限: {paymentDueDate}</p>}</div>);
            }
            case 'GROUPED_ITEMS': {
                // This is a simplified version. A full implementation would be more complex.
                return (
                    <table className="w-full text-xs border-collapse">
                        <thead className="bg-gray-100"><tr><th className="font-bold border-2 border-black p-1 text-left w-[55%]">品目</th><th className="font-bold border-2 border-black p-1 text-center w-[15%]">単価</th><th className="font-bold border-2 border-black p-1 text-center w-[10%]">数量</th><th className="font-bold border-2 border-black p-1 text-right w-[20%]">価格</th></tr></thead>
                        <tbody>
                            {orderDetails.map((item, index) => (
                                <tr key={index}>
                                    <td className="border-2 border-black p-1">{item.productName} ({item.color} / {item.size})</td>
                                    <td className="border-2 border-black p-1 text-center">¥{(item.unitPrice || 0).toLocaleString()}</td>
                                    <td className="border-2 border-black p-1 text-center">{item.quantity}</td>
                                    <td className="border-2 border-black p-1 text-right">¥{((item.unitPrice || 0) * (item.quantity as number)).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            }
            case 'DESIGN_INFO': {
                const canvases = selectedCanvases || [];
                if (canvases.length === 0) return null;
            
                return (
                    <div className="mt-4">
                        <h3 className="font-bold border-b-2 border-black text-lg mb-2">デザイン</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {canvases.map(canvas => {
                                const firstProductLayer = canvas.productImageLayers.find(l => l.visible);
                                const designLayers = canvas.layers.filter(l => l.visible);
            
                                return (
                                    <div key={canvas.id} className="border p-2">
                                        <h4 className="font-semibold text-sm">{canvas.name}</h4>
                                        <div className="relative w-full aspect-square mt-1 bg-white border overflow-hidden">
                                            {firstProductLayer && (
                                                <img src={firstProductLayer.imageSrc} alt="product" className="absolute top-0 left-0 w-full h-full object-contain" style={{ zIndex: 1 }}/>
                                            )}
                                            {designLayers.map((layer, index) => (
                                                <img 
                                                    key={layer.id}
                                                    src={layer.src}
                                                    alt="design"
                                                    style={{
                                                        position: 'absolute',
                                                        left: `${(layer.x / 600) * 100}%`,
                                                        top: `${(layer.y / 600) * 100}%`,
                                                        width: `${(layer.width / 600) * 100}%`,
                                                        height: `${(layer.height / 600) * 100}%`,
                                                        transform: `rotate(${layer.rotation}deg)`,
                                                        zIndex: 10 + index,
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            }
            default: return null;
        }
    }, [database, documentType, cost, customerInfo, companyInfo, estimateId, orderDetails, processingGroups, totalQuantity, isBringInMode, showGroupTotalsInPdf, paymentDueDate, selectedCanvases]);
    
    const pageRows: PdfTemplateBlock[][] = [];
    let currentRow: PdfTemplateBlock[] = [];
    blocks.forEach(block => {
        if (block.config.startNewRow !== false && currentRow.length > 0) {
            pageRows.push(currentRow);
            currentRow = [];
        }
        currentRow.push(block);
    });
    if (currentRow.length > 0) pageRows.push(currentRow);
    
    return (
        <div className={`bg-white text-black shadow-lg mx-auto ${isForPrint ? '' : 'mb-4'} ${fontFamily}`} style={{ width: '210mm', minHeight: '297mm' }}>
            <div className="flex flex-col min-h-[297mm]" style={{ padding: `${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm` }}>
                <div className="flex-grow flex flex-col">
                    {pageRows.map((rowBlocks, rowIndex) => {
                        const senderInfoIndex = rowBlocks.findIndex(b => b.type === 'SENDER_INFO');
                        const stampIndex = rowBlocks.findIndex(b => b.type === 'STAMP' && b.config.startNewRow === false);

                        if (senderInfoIndex > -1 && stampIndex > -1) {
                            const senderBlock = rowBlocks.find(b => b.type === 'SENDER_INFO')!;
                            const stampBlock = rowBlocks.find(b => b.type === 'STAMP')!;
                            const otherBlocks = rowBlocks.filter(b => b.type !== 'SENDER_INFO' && b.type !== 'STAMP');
    
                            return (
                                <div key={rowIndex} className="flex flex-row items-start">
                                    {otherBlocks.map(block => (
                                        <div key={block.id} className="mb-2" style={{ flexBasis: `${block.config.width || 100}%`, padding: '0 4px' }}>
                                            {renderBlock(block, { currentPage: 1, totalPages: 1 })}
                                        </div>
                                    ))}
                                    <div className="relative" style={{ flexBasis: `${senderBlock.config.width || 30}%`, padding: '0 4px' }}>
                                        {renderBlock(senderBlock, { currentPage: 1, totalPages: 1 })}
                                        <div className="absolute top-0 right-0" style={{ transform: 'translate(20%, -20%)' }}>
                                            {renderBlock(stampBlock, { currentPage: 1, totalPages: 1 })}
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                        
                        return (
                            <div key={rowIndex} className="flex flex-row items-start">
                                {rowBlocks.map(block => (
                                    <div key={block.id} className="mb-2" style={{ flexBasis: `${block.config.width || 100}%`, padding: '0 4px' }}>
                                        {renderBlock(block, { currentPage: 1, totalPages: 1 })}
                                    </div>
                                ))}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

export default PdfRenderer;

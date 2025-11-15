import React, { useState, useMemo, FC, useRef, useEffect, useCallback } from 'react';
import { OrderDetail, PrintDesign, CostDetails, PrintLocation, CustomerInfo, Product, BrandColor, SpecialInkType, PrintSize, PricingData, PrintLocationData, CompanyInfoData } from '../types';

interface PrintableEstimateProps {
  orderDetails: OrderDetail[];
  printDesigns: PrintDesign[];
  cost: CostDetails;
  totalQuantity: number;
  customerInfo: CustomerInfo;
  products: Product[];
  colorPalettes: Record<string, Record<string, BrandColor>>;
  onClose: () => void;
  documentType?: 'estimate' | 'invoice';
  paymentDueDate?: string | null;
  estimateId: string;
  pricingData: PricingData;
  printLocations: PrintLocationData[];
  companyInfo: CompanyInfoData;
  isBringInMode?: boolean;
  uiText: Record<string, string>;
}

type GroupedItem = {
  name: string;
  productId: string;
  unitPrice: number;
  totalQuantity: number;
  subtotal: number;
  details: { color: string; size: string; quantity: number }[];
}


declare global {
  interface Window {
    // html2pdf and html2canvas are no longer used for PDF generation
  }
}

const formatDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
};

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;

export const PrintableEstimate: FC<PrintableEstimateProps> = ({ 
  documentType = 'estimate', 
  orderDetails, 
  printDesigns, 
  cost, 
  totalQuantity, 
  customerInfo, 
  products, 
  colorPalettes, 
  paymentDueDate,
  estimateId,
  pricingData,
  printLocations,
  companyInfo,
  onClose,
  isBringInMode = false,
  uiText
}) => {
  
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef({ x: 0, y: 0 });
  const lastTouchDistanceRef = useRef(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleReset = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const handleZoom = useCallback((factor: number, centerX: number, centerY: number) => {
    if (!viewportRef.current) return;

    const rect = viewportRef.current.getBoundingClientRect();
    const pivotX = centerX - rect.left;
    const pivotY = centerY - rect.top;

    const dx = pivotX - rect.width / 2;
    const dy = pivotY - rect.height / 2;

    setScale(oldScale => {
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, oldScale * factor));

        if (newScale === oldScale) return oldScale;

        const ratio = newScale / oldScale;
        
        setPan(oldPan => ({
            x: dx * (1 - ratio) + oldPan.x * ratio,
            y: dy * (1 - ratio) + oldPan.y * ratio
        }));
        
        return newScale;
    });
  }, []);
  
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const wheelHandler = (e: WheelEvent) => {
        e.preventDefault();
        const zoomFactor = 1 - e.deltaY * 0.001;
        handleZoom(zoomFactor, e.clientX, e.clientY);
    };

    viewport.addEventListener('wheel', wheelHandler, { passive: false });

    return () => {
        viewport.removeEventListener('wheel', wheelHandler);
    };
  }, [handleZoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isPanningRef.current = true;
    lastPanPointRef.current = { x: e.clientX, y: e.clientY };
    if (viewportRef.current) viewportRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanningRef.current) return;
    const dx = e.clientX - lastPanPointRef.current.x;
    const dy = e.clientY - lastPanPointRef.current.y;
    setPan(prevPan => ({ x: prevPan.x + dx, y: prevPan.y + dy }));
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
    if (e.touches.length === 1) {
        isPanningRef.current = true;
        lastPanPointRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
        isPanningRef.current = false; // Stop panning when pinch starts
        lastTouchDistanceRef.current = getTouchDistance(e.touches);
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1 && isPanningRef.current) {
        const dx = e.touches[0].clientX - lastPanPointRef.current.x;
        const dy = e.touches[0].clientY - lastPanPointRef.current.y;
        setPan(prevPan => ({ x: prevPan.x + dx, y: prevPan.y + dy }));
        lastPanPointRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
        const newDist = getTouchDistance(e.touches);
        if (lastTouchDistanceRef.current === 0) { // Avoid division by zero on first move
            lastTouchDistanceRef.current = newDist;
            return;
        }

        const zoomFactor = newDist / lastTouchDistanceRef.current;
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        
        handleZoom(zoomFactor, centerX, centerY);
        
        lastTouchDistanceRef.current = newDist;
    }
  };

  const handleTouchEnd = () => {
    isPanningRef.current = false;
    lastTouchDistanceRef.current = 0;
  };
  
  const handleButtonZoom = (factor: number) => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    handleZoom(factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  const groupedItems = useMemo(() => {
    const grouped = orderDetails.reduce((acc: Record<string, GroupedItem>, item: OrderDetail) => {
      const key = `${item.productId}_${item.unitPrice}`;
      if (!acc[key]) {
        acc[key] = {
          name: item.productName,
          productId: item.productId,
          unitPrice: item.unitPrice,
          totalQuantity: 0,
          subtotal: 0,
          details: [],
        };
      }
      acc[key].totalQuantity += item.quantity;
      acc[key].subtotal += item.quantity * item.unitPrice;
      acc[key].details.push({ color: item.color, size: item.size, quantity: item.quantity });
      return acc;
    }, {} as Record<string, GroupedItem>);
    return Object.values(grouped);
  }, [orderDetails]);

  const detailedPrintItems = useMemo(() => {
    const tier = pricingData.printPricingTiers.find(t => totalQuantity >= t.min && totalQuantity <= t.max);
    if (!tier || totalQuantity === 0) return { designItems: [], itemSurcharge: null, plateTypeSurcharge: null };

    const designItems = printDesigns
        .map((design, index) => ({ design, index })) // keep original index
        .filter(({ design }) => design.location && design.colors > 0)
        .map(({ design, index }) => {
            const locationInfo = printLocations.find(l => l.locationId === design.location);
            const groupName = locationInfo?.groupName || '';
            const locationLabel = locationInfo?.label || '';
            const name = `プリント代: デザイン${index + 1} ${groupName} ${locationLabel}`;

            const basePrintPrice = tier.firstColor + Math.max(0, design.colors - 1) * tier.additionalColor;
            const sizeSurcharge = pricingData.additionalPrintCostsBySize[design.size] ?? 0;
            const locationSurcharge = pricingData.additionalPrintCostsByLocation[design.location as PrintLocation] ?? 0;
            
            const specialInkLabels: Record<SpecialInkType, string> = {
                'silver': 'シルバー',
                'gold': 'ゴールド',
                'foam': '発泡',
                'luminous': '蓄光',
            };

            const breakdown: { label: string; amount: number }[] = [{ label: `基本 (${design.colors}色)`, amount: basePrintPrice }];
            if (sizeSurcharge > 0) breakdown.push({ label: `大判 (${design.size})`, amount: sizeSurcharge });
            if (locationSurcharge > 0) breakdown.push({ label: '特殊箇所', amount: locationSurcharge });

            design.specialInks.forEach(ink => {
                const inkSurcharge = (pricingData.specialInkCosts[ink.type] || 0) * ink.count;
                const inkLabel = specialInkLabels[ink.type] || ink.type;
                breakdown.push({ label: `${inkLabel} (x${ink.count})`, amount: inkSurcharge });
            });
            
            const unitPrice = breakdown.reduce((sum, item) => sum + item.amount, 0);

            return {
                name,
                breakdown,
                unitPrice,
                quantity: totalQuantity,
                subtotal: unitPrice * totalQuantity
            };
        });
    
    let itemSurcharge = null;
    if (cost.printCostDetail.byItem > 0) {
        const perItemSurcharge = Math.round(cost.printCostDetail.byItem / totalQuantity);
        itemSurcharge = {
            name: '商品特性による追加料金 (裏起毛など)',
            unitPrice: perItemSurcharge,
            quantity: totalQuantity,
            subtotal: cost.printCostDetail.byItem
        };
    }
    
    let plateTypeSurcharge = null;
    if (cost.printCostDetail.byPlateType > 0) {
        const perItemSurcharge = Math.round(cost.printCostDetail.byPlateType / totalQuantity);
        plateTypeSurcharge = {
            name: '分解版による追加料金',
            unitPrice: perItemSurcharge,
            quantity: totalQuantity,
            subtotal: cost.printCostDetail.byPlateType
        };
    }

    return { designItems, itemSurcharge, plateTypeSurcharge };
  }, [printDesigns, totalQuantity, cost.printCostDetail, pricingData, printLocations]);

  const handlePrint = () => {
    window.print();
  };
  
  const handleGeneratePdf = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);

    const payload = {
      documentType,
      orderDetails,
      printDesigns,
      cost,
      totalQuantity,
      customerInfo,
      products,
      colorPalettes,
      paymentDueDate,
      estimateId,
      pricingData,
      printLocations,
      companyInfo,
      isBringInMode,
    };

    try {
      const response = await fetch('/api/generate_pdf.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMsg = 'PDFの生成に失敗しました。';
        if (response.headers.get('Content-Type')?.includes('application/json')) {
            const errorData = await response.json();
            errorMsg = errorData.message || errorData.error || errorMsg;
        } else {
            errorMsg = `サーバーエラーが発生しました (HTTP ${response.status})。`;
        }
        throw new Error(errorMsg);
      }
      
      const blob = await response.blob();
      if (blob.type !== 'application/pdf') {
        throw new Error('サーバーから無効なファイル形式が返されました。');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const docTitle = documentType === 'invoice' ? '御請求書' : '御見積書';
      a.download = `【${docTitle}】${estimateId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("PDF generation failed:", error);
      alert(error instanceof Error ? error.message : "PDFの生成に失敗しました。");
    } finally {
      setIsGeneratingPdf(false);
    }
  };


  const renderContent = () => {
    const title = documentType === 'invoice' ? '御請求書' : '御見積書';
    const totalLabel = documentType === 'invoice' ? '御請求金額 (税込)' : '御見積金額 (税込)';
    const documentNumberLabel = documentType === 'invoice' ? '請求書番号' : '見積書番号';
    const tshirtLabel = isBringInMode ? '持ち込み手数料' : 'Tシャツ本体代';


    const addresseeLine = [customerInfo.companyName, customerInfo.nameKanji].filter(Boolean).join(' ') || '(宛名)';
    const postalCodeLine = customerInfo.zipCode ? `〒${customerInfo.zipCode.slice(0,3)}-${customerInfo.zipCode.slice(3)}` : '';
    
    const shippingAddresseeLine = customerInfo.shippingName || addresseeLine;
    const shippingPostalCodeLine = customerInfo.shippingZipCode ? `〒${customerInfo.shippingZipCode.slice(0,3)}-${customerInfo.shippingZipCode.slice(3)}` : '';


    const renderBankInfo = () => (
      <div className="mt-8 p-4 border-2 border-black break-inside-avoid">
          <h3 className="font-bold text-center mb-2">お振込先</h3>
          <div className="text-sm grid grid-cols-3 gap-x-4">
              <div className="col-span-1 font-semibold">金融機関名</div>
              <div className="col-span-2">{companyInfo.bankName}</div>
              <div className="col-span-1 font-semibold">支店名</div>
              <div className="col-span-2">{companyInfo.bankBranchName} ({companyInfo.bankAccountType}) {companyInfo.bankAccountNumber}</div>
              <div className="col-span-1 font-semibold">口座名義</div>
              <div className="col-span-2">{companyInfo.bankAccountHolder}</div>
          </div>
          {paymentDueDate && <p className="text-center text-sm mt-3 font-bold">お支払い期限: {paymentDueDate}</p>}
      </div>
    );

    return (
      <>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold">{title}</h1>
        </div>
  
        <div className="grid grid-cols-2 gap-8 mb-4">
          <div className="space-y-1">
            <div className="text-lg border-b-2 border-black pb-1">
                {addresseeLine} 様
            </div>
            <div className="text-sm pt-2">
                {postalCodeLine && <p>{postalCodeLine}</p>}
                {customerInfo.address1 && <p>{customerInfo.address1}</p>}
                {customerInfo.address2 && <p>{customerInfo.address2}</p>}
                {customerInfo.phone && <p>TEL: {customerInfo.phone}</p>}
                {customerInfo.email && <p>Email: {customerInfo.email}</p>}
            </div>
             {customerInfo.hasSeparateShippingAddress && (
                <div className="text-sm pt-4 mt-4 border-t">
                    <p className="font-bold">【配送先】</p>
                    <p>{shippingAddresseeLine} 様</p>
                    {shippingPostalCodeLine && <p>{shippingPostalCodeLine}</p>}
                    {customerInfo.shippingAddress1 && <p>{customerInfo.shippingAddress1}</p>}
                    {customerInfo.shippingAddress2 && <p>{customerInfo.shippingAddress2}</p>}
                    {customerInfo.shippingPhone && <p>TEL: {customerInfo.shippingPhone}</p>}
                </div>
            )}
          </div>
          <div className="flex justify-end">
            <div className="relative">
              <div className="space-y-1 text-sm">
                <p>{companyInfo.companyName}</p>
                <p>〒{companyInfo.zip}</p>
                <p>{companyInfo.address}</p>
                <p>TEL: {companyInfo.tel}</p>
                <p>FAX: {companyInfo.fax}</p>
                {companyInfo.invoiceIssuerNumber && <p className="pt-2">適格請求書発行事業者番号：{companyInfo.invoiceIssuerNumber}</p>}
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 border-4 border-red-500 flex items-center justify-center text-red-500 opacity-70 transform -rotate-12 translate-x-4 -translate-y-4">
                <span className="text-5xl font-bold">社判</span>
              </div>
            </div>
          </div>
        </div>
  
        <div className="text-right text-sm mb-4">
          <p>{documentNumberLabel}: {estimateId}</p>
          <p>発行日: {formatDate(new Date())}</p>
        </div>
        
        <div className="border-y-2 border-black py-4 mb-6">
          <p className="flex justify-between items-baseline">
            <span className="text-xl font-bold">{totalLabel}</span>
            <span className="text-3xl font-bold">¥ {cost.totalCostWithTax.toLocaleString()}</span>
          </p>
        </div>
  
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="font-bold border-2 border-black p-2 text-left w-[60%]">品目</th>
              <th className="font-bold border-2 border-black p-2 text-center w-[15%]">単価</th>
              <th className="font-bold border-2 border-black p-2 text-center w-[10%]">数量</th>
              <th className="font-bold border-2 border-black p-2 text-right w-[15%]">価格</th>
            </tr>
          </thead>
          <tbody>
            {groupedItems.length > 0 && (
              <tr className="break-inside-avoid">
                <td className="border-2 border-black p-2 align-top">
                  <p className="font-semibold">{tshirtLabel}</p>
                  {groupedItems.map((item, index) => {
                      const product = products.find((p: Product) => p.id === item.productId);
                      const brand = product ? product.brand : '';
                      const palette = colorPalettes[brand] || {};

                      const detailsByColor = item.details.reduce((acc, detail) => {
                          if (!acc[detail.color]) acc[detail.color] = [];
                          acc[detail.color].push(`${detail.size}-${detail.quantity}`);
                          return acc;
                      }, {} as Record<string, string[]>);

                      const sortedColors = Object.keys(detailsByColor).sort((a, b) => {
                          // FIX: Added explicit type for 'c' to resolve property access on 'unknown' error.
                          const colorCodeA = Object.values(palette).find((c: BrandColor) => c.name === a)?.code || '9999';
                          // FIX: Added explicit type for 'c' to resolve property access on 'unknown' error.
                          const colorCodeB = Object.values(palette).find((c: BrandColor) => c.name === b)?.code || '9999';
                          return colorCodeA.localeCompare(colorCodeB);
                      });

                      return (
                          <div key={index} className="pl-4 text-xs">
                              <p className="font-normal">{isBringInMode ? `${item.name} (持ち込み)` : item.name}</p>
                              {sortedColors.map(color => (
                                  <p key={color} className="pl-4">{color}&emsp;{detailsByColor[color].join(' ')}</p>
                              ))}
                          </div>
                      );
                  })}
                </td>
                <td className="border-2 border-black p-2 text-center align-middle">-</td>
                <td className="border-2 border-black p-2 text-center align-middle">{totalQuantity}</td>
                <td className="border-2 border-black p-2 text-right align-middle">¥{cost.tshirtCost.toLocaleString()}</td>
              </tr>
            )}

            {detailedPrintItems.designItems.map((item, index) => (
              <tr key={`print-${index}`} className="break-inside-avoid">
                <td className="border-2 border-black p-2 align-top">
                  <p className="font-semibold">{item.name}</p>
                  <div className="text-xs pl-4 space-y-1 mt-1">
                    {item.breakdown.map((d, i) => (
                      <p key={i} className="flex justify-between pr-2">
                        <span>{d.label}</span>
                        <span>¥{d.amount.toLocaleString()}</span>
                      </p>
                    ))}
                  </div>
                </td>
                <td className="border-2 border-black p-2 text-center align-middle font-bold">
                  ¥{item.unitPrice.toLocaleString()}
                </td>
                <td className="border-2 border-black p-2 text-center align-middle">{item.quantity}</td>
                <td className="border-2 border-black p-2 text-right align-middle">¥{item.subtotal.toLocaleString()}</td>
              </tr>
            ))}
            {detailedPrintItems.itemSurcharge && (
                <tr className="break-inside-avoid">
                    <td className="border-2 border-black p-2 align-top font-semibold">
                        {detailedPrintItems.itemSurcharge.name}
                    </td>
                    <td className="border-2 border-black p-2 text-center align-middle">
                        ¥{detailedPrintItems.itemSurcharge.unitPrice.toLocaleString()}
                    </td>
                    <td className="border-2 border-black p-2 text-center align-middle">
                        {detailedPrintItems.itemSurcharge.quantity}
                    </td>
                    <td className="border-2 border-black p-2 text-right align-middle">
                        ¥{detailedPrintItems.itemSurcharge.subtotal.toLocaleString()}
                    </td>
                </tr>
            )}
            {detailedPrintItems.plateTypeSurcharge && (
                <tr className="break-inside-avoid">
                    <td className="border-2 border-black p-2 align-top font-semibold">
                        {detailedPrintItems.plateTypeSurcharge.name}
                    </td>
                    <td className="border-2 border-black p-2 text-center align-middle">
                        ¥{detailedPrintItems.plateTypeSurcharge.unitPrice.toLocaleString()}
                    </td>
                    <td className="border-2 border-black p-2 text-center align-middle">
                        {detailedPrintItems.plateTypeSurcharge.quantity}
                    </td>
                    <td className="border-2 border-black p-2 text-right align-middle">
                        ¥{detailedPrintItems.plateTypeSurcharge.subtotal.toLocaleString()}
                    </td>
                </tr>
            )}
            {printDesigns.filter(d => d.location && d.colors > 0).map((design, index) => {
                const costForDesign = cost.setupCostDetail[design.id] ?? 0;
                if (costForDesign === 0) return null;
                
                const locationInfo = printLocations.find(l => l.locationId === design.location);
                const groupName = locationInfo?.groupName || '';
                const locationLabel = locationInfo?.label || '';
                const plateTypeLabel = design.plateType === 'decomposition' ? '分解版' : '通常版';
                const name = `版代: デザイン${index + 1} ${groupName} ${locationLabel} (${design.size}, ${plateTypeLabel})`;
                
                const plateCostKey = `${design.size}-${design.plateType || 'normal'}`;
                const plateInfo = pricingData.plateCosts[plateCostKey];
                const unitPrice = plateInfo?.cost || 0;

                return (
                    <tr key={`setup-${design.id}`} className="break-inside-avoid">
                        <td className="border-2 border-black p-2 align-top font-semibold">{name}</td>
                        <td className="border-2 border-black p-2 text-center align-middle">¥{unitPrice.toLocaleString()}</td>
                        <td className="border-2 border-black p-2 text-center align-middle">{design.colors}</td>
                        <td className="border-2 border-black p-2 text-right align-middle">¥{costForDesign.toLocaleString()}</td>
                    </tr>
                );
            })}
          </tbody>
        </table>
        
        <div className="flex justify-end mt-4">
          <div className="w-1/2">
            <table className="w-full text-sm">
              <tbody>
                <tr className="break-inside-avoid">
                  <td className="p-2 bg-gray-100 font-bold border-2 border-black">小計</td>
                  <td className="p-2 text-right border-y-2 border-r-2 border-black">¥{cost.totalCost.toLocaleString()}</td>
                </tr>
                <tr className="break-inside-avoid">
                  <td className="p-2 bg-gray-100 font-bold border-x-2 border-b-2 border-black">送料</td>
                  <td className="p-2 text-right border-b-2 border-r-2 border-black">{cost.shippingCost > 0 ? `¥${cost.shippingCost.toLocaleString()}` : '無料'}</td>
                </tr>
                <tr className="break-inside-avoid">
                  <td className="p-2 bg-gray-100 font-bold border-x-2 border-b-2 border-black">消費税</td>
                  <td className="p-2 text-right border-b-2 border-r-2 border-black">¥{cost.tax.toLocaleString()}</td>
                </tr>
                <tr className="break-inside-avoid">
                  <td className="p-2 bg-gray-100 font-bold border-x-2 border-b-2 border-black">合計</td>
                  <td className="p-2 text-right border-b-2 border-r-2 border-black font-bold text-base">¥{cost.totalCostWithTax.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
  
        <div className="mt-8">
          <h3 className="font-bold border-b border-black">備考</h3>
          <div className="mt-2 text-sm whitespace-pre-wrap">{customerInfo.notes}</div>
        </div>

        {documentType === 'invoice' && renderBankInfo()}
      </>
    );
  };


  return (
    <>
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex flex-col items-center p-4 print:p-0 print:bg-white">
        <div className="w-full max-w-5xl bg-white shadow-xl flex flex-col h-full max-h-[95vh] print:hidden">
          <header className="p-4 bg-white text-black border-b border-gray-200 flex justify-between items-center flex-shrink-0">
            <h2 className="text-xl font-bold">{uiText['printableEstimate.title']}</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={handleGeneratePdf}
                disabled={isGeneratingPdf}
                className="bg-red-600 hover:bg-red-700 text-white w-10 h-10 font-semibold transition-colors flex items-center justify-center shadow-md disabled:opacity-50 disabled:cursor-wait"
                title={isGeneratingPdf ? uiText['printableEstimate.savePdf.loading'] : uiText['printableEstimate.savePdf.ariaLabel']}
                aria-label={uiText['printableEstimate.savePdf.ariaLabel']}
              >
                {isGeneratingPdf ? <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div> : <i className="fas fa-file-pdf"></i>}
              </button>
              <button 
                onClick={handlePrint} 
                className="bg-blue-600 hover:bg-blue-700 text-white w-10 h-10 font-semibold transition-colors flex items-center justify-center shadow-md"
                title={uiText['printableEstimate.print.ariaLabel']}
                aria-label={uiText['printableEstimate.print.ariaLabel']}
              >
                <i className="fas fa-print"></i>
              </button>
              <button 
                onClick={onClose} 
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 w-10 h-10 font-semibold transition-colors flex items-center justify-center shadow-md"
                title={uiText['printableEstimate.close.ariaLabel']}
                aria-label={uiText['printableEstimate.close.ariaLabel']}
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
          </header>

          <main 
            ref={viewportRef}
            className="flex-1 overflow-hidden bg-gray-200 p-4 relative touch-none"
            style={{ cursor: 'grab' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
              <div
                  ref={contentRef}
                  style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: 'center center' }}
              >
                  {/* A4 Preview Area */}
                  <div id="printable-area" className="w-[210mm] min-h-[297mm] mx-auto bg-white shadow-lg p-10 text-black font-sans">
                      {renderContent()}
                  </div>
              </div>
              <div 
                className="absolute bottom-6 right-6 flex items-center gap-2 bg-white/80 backdrop-blur-sm p-2 rounded shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                  <button onClick={() => handleButtonZoom(1 / 1.25)} className="w-8 h-8 bg-gray-200 text-black text-lg font-bold shadow-md hover:bg-gray-300 transition-colors rounded" title={uiText['printableEstimate.zoom.out']}><i className="fas fa-minus"></i></button>
                  <span className="w-12 text-center text-sm font-mono tabular-nums px-1 text-black">{Math.round(scale * 100)}%</span>
                  <button onClick={() => handleButtonZoom(1.25)} className="w-8 h-8 bg-gray-200 text-black text-lg font-bold shadow-md hover:bg-gray-300 transition-colors rounded" title={uiText['printableEstimate.zoom.in']}><i className="fas fa-plus"></i></button>
                  <button onClick={handleReset} className="h-8 px-3 bg-gray-200 text-black text-sm font-bold shadow-md hover:bg-gray-300 transition-colors rounded" title={uiText['printableEstimate.zoom.reset']}>{uiText['printableEstimate.zoom.reset']}</button>
              </div>
          </main>
        </div>
        
        {/* Hidden div for printing and image generation */}
        <div className="hidden print:block">
          <div 
            id="printable-area-for-print" 
            className="text-black font-sans"
            style={{ 
              width: '210mm', 
              minHeight: '297mm', 
              backgroundColor: 'white',
              padding: '5mm 15mm 10mm 15mm',
              boxSizing: 'border-box'
            }}
          >
              {renderContent()}
          </div>
        </div>
      </div>
    </>
  );
};
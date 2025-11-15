import React, { useCallback, useState } from 'react';
import { CostDetails, EstimatorState, PrintDesign, PrintLocationData } from '@shared/types';
import { calculateLaborUnitPrice, calculateSalesUnitPrice } from '@features/estimator/services/unitPriceService';


interface CostSummaryProps {
  totalCost: number; // subtotal
  shippingCost: number;
  tax: number;
  totalCostWithTax: number;
  costPerShirt: number;
  quantity: number;
  tshirtCost: number;
  setupCost: number;
  printCost: number;
  totalCustomItemsCost: number;
  totalProductDiscount: number;
  totalSampleItemsCost: number;
  printDesigns: PrintDesign[];
  costDetails: CostDetails;
  printLocations: PrintLocationData[];
  isBringInMode?: boolean;
  estimatorState: EstimatorState;
}

const DetailRow: React.FC<{ label: React.ReactNode; value: number; valueDisplay?: React.ReactNode; subDetails?: React.ReactNode; isOpen?: boolean; onToggle?: () => void; isCollapsible?: boolean; isDiscount?: boolean; }> = 
({ label, value, valueDisplay, subDetails, isOpen, onToggle, isCollapsible = false, isDiscount = false }) => (
    <div>
        <div 
            className={`flex justify-between items-center text-sm py-1 ${onToggle ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 px-2 -mx-2' : ''}`}
            onClick={onToggle}
        >
            <div className="flex items-center">
                <span>{label}</span>
                {isCollapsible && (
                    <i className={`fas fa-chevron-down text-xs text-gray-400 ml-2 transition-transform transform ${isOpen ? 'rotate-180' : ''}`}></i>
                )}
            </div>
            <span className={`font-medium ${isDiscount ? 'text-red-600' : ''}`}>
                {typeof valueDisplay !== 'undefined' ? valueDisplay : (isDiscount ? `- ¥${Math.abs(value).toLocaleString()}` : (value < 0 ? `- ¥${Math.abs(value).toLocaleString()}`: `¥${value.toLocaleString()}`) )}
            </span>
        </div>
        {isOpen && subDetails && (
            <div className="mt-1 pl-4 pr-2 py-2 bg-base-100 dark:bg-base-dark-200 border-l-2 border-brand-secondary">
                {subDetails}
            </div>
        )}
    </div>
);

const InfoRow: React.FC<{ label: string; value: string; }> = ({ label, value }) => (
    <div className="flex justify-between items-center text-sm py-1">
        <span>{label}</span>
        <span className="font-medium">{value}</span>
    </div>
);


const CostSummary: React.FC<CostSummaryProps> = (props) => {
  const { totalCost, shippingCost, tax, totalCostWithTax, costPerShirt, quantity, printDesigns, costDetails, printLocations, isBringInMode = false, totalCustomItemsCost, totalProductDiscount, totalSampleItemsCost, estimatorState } = props;
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({});

  const toggleDetails = (key: string) => {
      setOpenDetails(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  const getPrintLocationLabel = useCallback((locationId: string): string => {
    const loc = printLocations.find(loc => loc.locationId === locationId);
    return loc ? `${loc.groupName} ${loc.label}` : locationId;
  }, [printLocations]);

  const tshirtLabel = isBringInMode ? '持ち込み手数料' : 'Tシャツ本体代';

  const subTotalBeforeDiscount = costDetails.tshirtCost + costDetails.printCost + costDetails.setupCost + costDetails.additionalOptionsCost + totalSampleItemsCost;

  return (
    <>
      <div className="bg-base-100 dark:bg-base-dark-200 p-6 border border-base-300 dark:border-base-dark-300 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold text-base-content dark:text-base-dark-content mb-4 border-b border-base-300 dark:border-base-dark-300 pb-2">お見積もり結果</h2>
        <div className="space-y-4">
            
          {quantity > 0 && (
            <div className="pt-4 space-y-4">
              <h3 className="text-md font-semibold text-gray-500 mb-2">内訳</h3>
              {costDetails.groupCosts?.map(groupCost => {
                  const fullGroup = estimatorState.processingGroups.find(g => g.id === groupCost.groupId);
                  if (!fullGroup) return null;

                  const bringInItems = fullGroup.items.filter(i => i.isBringIn);
                  const sampleItems = fullGroup.sampleItems || [];
                  const customItems = (fullGroup.customItems || []).filter(i => i.enabled);
                  
                  const salesQuantity = groupCost.quantity - (groupCost.bringInQuantity || 0);
                  const bringInQuantity = groupCost.bringInQuantity || 0;
                  const totalGroupQuantity = groupCost.quantity;

                  const groupTotalCost = groupCost.tshirtCost + groupCost.silkscreenPrintCost + groupCost.dtfPrintCost + groupCost.setupCost + (groupCost.additionalOptionsCost || 0) + (groupCost.customItemsCost || 0) + (groupCost.sampleItemsCost || 0);
                  
                  const laborUnitPrice = calculateLaborUnitPrice(groupCost);
                  const salesItemUnitPrice = calculateSalesUnitPrice(groupCost, laborUnitPrice);


                  return (
                      <div key={groupCost.groupId} className="text-gray-700 dark:text-gray-200 space-y-2 p-3 bg-base-200 dark:bg-base-dark-300 rounded-md">
                          <h4 className="font-bold text-base text-black dark:text-white">{groupCost.groupName}</h4>
                          
                            <div className="text-sm space-y-1 mb-3 p-2 border-b border-gray-300 dark:border-gray-600">
                                <div className="flex justify-between items-center py-1">
                                    <span>販売分 {salesQuantity}枚 + 持ち込み {bringInQuantity}枚</span>
                                    <span className="font-medium text-red-600">{totalGroupQuantity}枚</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                    <span>合計金額</span>
                                    <span className="font-medium text-red-600">¥{groupTotalCost.toLocaleString()}</span>
                                </div>
                                {salesQuantity > 0 && (
                                    <div className="flex justify-between items-center py-1">
                                        <span>1枚単価 (目安)</span>
                                        <span className="font-medium text-red-600">販売分: ¥{salesItemUnitPrice.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center py-1">
                                    <span>工賃単価</span>
                                    <span className="font-medium text-red-600">¥{laborUnitPrice.toLocaleString()}</span>
                                </div>
                            </div>

                          <DetailRow label={`${tshirtLabel} (${salesQuantity} 枚)`} value={groupCost.tshirtCost + groupCost.productDiscount} />

                          {groupCost.designPrintCosts?.map((dc, index) => {
                            const design = printDesigns.find(pd => pd.id === dc.designId);
                            if (!design) return null;

                            const locationLabel = getPrintLocationLabel(design.location);
                            let designLabel = '';
                            let subDetailsContent: React.ReactNode = null;
                            const groupQuantity = groupCost.quantity;

                            if (design.printMethod === 'silkscreen' && dc.detail) {
                                designLabel = `シルクプリント代: ${locationLabel}`;
                                subDetailsContent = (
                                    <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                        {dc.detail.base > 0 && <div className="flex justify-between"><span>・基本プリント代</span><span>(単価 ¥{groupQuantity > 0 ? Math.round(dc.detail.base / groupQuantity).toLocaleString() : 0})</span></div>}
                                        {dc.detail.bySize > 0 && <div className="flex justify-between"><span>・大判サイズ追加</span><span>(単価 ¥{groupQuantity > 0 ? Math.round(dc.detail.bySize / groupQuantity).toLocaleString() : 0})</span></div>}
                                        {dc.detail.byLocation > 0 && <div className="flex justify-between"><span>・特殊箇所追加</span><span>(単価 ¥{groupQuantity > 0 ? Math.round(dc.detail.byLocation / groupQuantity).toLocaleString() : 0})</span></div>}
                                        {dc.detail.byPlateType > 0 && <div className="flex justify-between"><span>・分解版追加</span><span>(単価 ¥{groupQuantity > 0 ? Math.round(dc.detail.byPlateType / groupQuantity).toLocaleString() : 0})</span></div>}
                                        {dc.detail.byInk > 0 && <div className="flex justify-between"><span>・特殊インク追加</span><span>(単価 ¥{groupQuantity > 0 ? Math.round(dc.detail.byInk / groupQuantity).toLocaleString() : 0})</span></div>}
                                    </div>
                                );
                            } else if (design.printMethod === 'dtf') {
                                designLabel = `DTFプリント代: ${locationLabel}`;
                                subDetailsContent = (
                                    <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                        <div className="flex justify-between">
                                            <span>・{design.widthCm}cm × {design.heightCm}cm</span>
                                            <span>(単価 ¥{groupQuantity > 0 ? Math.round(dc.totalCost / groupQuantity).toLocaleString() : 0})</span>
                                        </div>
                                    </div>
                                );
                            }
                            
                            if (!designLabel) return null;

                            return (
                                <DetailRow
                                    key={dc.designId}
                                    label={designLabel}
                                    value={dc.totalCost}
                                    isCollapsible={true}
                                    isOpen={openDetails[`print_${groupCost.groupId}_${dc.designId}`] || false}
                                    onToggle={() => toggleDetails(`print_${groupCost.groupId}_${dc.designId}`)}
                                    subDetails={subDetailsContent}
                                />
                            );
                          })}
                           
                           <DetailRow 
                              label="版代" 
                              value={groupCost.setupCost}
                              isCollapsible={groupCost.setupCost > 0}
                              isOpen={openDetails[`setup_${groupCost.groupId}`] || false}
                              onToggle={() => toggleDetails(`setup_${groupCost.groupId}`)}
                              subDetails={
                                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                                  {groupCost.setupCostDetail && Object.entries(groupCost.setupCostDetail).map(([designId, costForDesign]) => {
                                      const design = printDesigns.find(d => d.id === designId);
                                      if (!design || costForDesign === 0) return null;
                                      const locationLabel = getPrintLocationLabel(design.location);
                                      return (
                                          <div key={design.id} className="flex justify-between items-center">
                                              <span>デザイン: {locationLabel} ({design.size}, {design.colors}色)</span>
                                              <span className="text-gray-800 dark:text-gray-200 font-medium">¥{costForDesign.toLocaleString()}</span>
                                          </div>
                                      )
                                  })}
                                </div>
                              }
                          />
                          
                          <DetailRow
                            label="追加オプション代"
                            value={groupCost.additionalOptionsCost || 0}
                            isCollapsible={(groupCost.additionalOptionsCost || 0) > 0}
                            isOpen={openDetails[`options_${groupCost.groupId}`] || false}
                            onToggle={() => toggleDetails(`options_${groupCost.groupId}`)}
                            subDetails={
                                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                                    {Object.entries(groupCost.additionalOptionsCostDetail || {}).map(([name, cost]) => (
                                        <div key={name} className="flex justify-between">
                                            <span className="truncate pr-2" title={name}>・{name}</span>
                                            <span className="text-gray-800 dark:text-gray-200 font-medium">¥{cost.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            }
                          />

                          {bringInItems.length > 0 && (
                            <DetailRow
                                label="持ち込み商品"
                                value={0}
                                valueDisplay={`${bringInQuantity} 枚`}
                                isCollapsible={true}
                                isOpen={openDetails[`bringin_${groupCost.groupId}`] || false}
                                onToggle={() => toggleDetails(`bringin_${groupCost.groupId}`)}
                                subDetails={
                                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                    {bringInItems.map((item, index) => (
                                    <div key={index} className="flex justify-between">
                                        <span className="truncate pr-2" title={item.productName}>{item.productName || '品名未設定'}</span>
                                        <span>{item.quantity} 枚</span>
                                    </div>
                                    ))}
                                </div>
                                }
                            />
                           )}
                          
                          {groupCost.sampleItemsCost > 0 && (
                            <DetailRow
                                label="サンプル代"
                                value={groupCost.sampleItemsCost}
                                isCollapsible={true}
                                isOpen={openDetails[`sample_${groupCost.groupId}`] || false}
                                onToggle={() => toggleDetails(`sample_${groupCost.groupId}`)}
                                subDetails={
                                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                    {sampleItems.map((item, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-2">
                                        <span className="col-span-6 truncate" title={item.label}>{item.label || '品名未設定'}</span>
                                        <span className="col-span-6 text-right font-mono">
                                        ¥{item.unitPrice.toLocaleString()} × {item.quantity} = ¥{(item.unitPrice * item.quantity).toLocaleString()}
                                        </span>
                                    </div>
                                    ))}
                                </div>
                                }
                            />
                           )}

                           {groupCost.customItemsCost !== 0 && (
                            <DetailRow 
                                label="調整項目"
                                value={groupCost.customItemsCost}
                                isCollapsible={true}
                                isOpen={openDetails[`custom_${groupCost.groupId}`] || false}
                                onToggle={() => toggleDetails(`custom_${groupCost.groupId}`)}
                                subDetails={
                                    <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                        {customItems.map((item, index) => (
                                            <div key={index} className="flex justify-between">
                                                <span className="truncate pr-2" title={item.label}>{item.label || '項目名未設定'}</span>
                                                <span className="font-mono">{item.amount >= 0 ? `¥${item.amount.toLocaleString()}` : `- ¥${Math.abs(item.amount).toLocaleString()}`}</span>
                                            </div>
                                        ))}
                                    </div>
                                }
                            />
                           )}
                      </div>
                  )
              })}
            </div>
          )}
          
          <div className="space-y-2 pt-4 border-t border-base-300 dark:border-base-300 mt-4">
            <div className="flex justify-between items-baseline text-sm">
              <span className="text-gray-600 dark:text-gray-400">小計</span>
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {quantity > 0 ? `¥${subTotalBeforeDiscount.toLocaleString()}` : '-'}
              </span>
            </div>
            {totalProductDiscount > 0 && <DetailRow label="商品割引" value={totalProductDiscount} isDiscount={true}/>}
            {totalCustomItemsCost !== 0 && <DetailRow label="調整金額" value={totalCustomItemsCost} />}

            <div className="flex justify-between items-baseline text-sm pt-2 border-t font-semibold">
              <span className="text-gray-600 dark:text-gray-400">合計 (税抜)</span>
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {quantity > 0 ? `¥${totalCost.toLocaleString()}` : '-'}
              </span>
            </div>

            <div className="flex justify-between items-baseline text-sm">
              <span className="text-gray-600 dark:text-gray-400">送料</span>
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {quantity > 0 ? (shippingCost > 0 ? `¥${shippingCost.toLocaleString()}` : '無料') : '-'}
              </span>
            </div>
            <div className="flex justify-between items-baseline text-sm">
              <span className="text-gray-600 dark:text-gray-400">消費税 (10%)</span>
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {quantity > 0 ? `¥${tax.toLocaleString()}` : '-'}
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-base-300 dark:border-base-dark-300 mt-2">
              <span className="text-gray-600 dark:text-gray-200 font-bold">合計金額 (税込)</span>
              <span className="text-3xl font-bold text-black dark:text-white">
                {quantity > 0 ? `¥${totalCostWithTax.toLocaleString()}` : '-'}
              </span>
            </div>
          </div>

        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
          ※ デザイン内容と印刷仕様に問題がない場合、このお見積もり金額が正式なご請求金額となります。
          <br />
          ※ 上記金額には、Tシャツ本体、プリント代、版代、消費税、送料が含まれています。
          <br />
          ※ 税抜50,000円以上のご注文で送料無料となります。
        </p>
      </div>
    </>
  );
};

export default CostSummary;
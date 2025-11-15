
import React, { useState } from 'react';
import { AppData, CustomItem, EstimatorState, OrderDetail, PrintDesign, SampleItem } from '@shared/types';
import { DuplicateIcon, PencilIcon, PlusIcon, TrashIcon, Input, ToggleSwitch } from '@components/atoms';
import OrderDetailRow from '@components/molecules/OrderDetailRow';
import AdditionalOptionsModal from '../modals/AdditionalOptionsModal';
import PrintDesignForm from '../modals/PrintDesignForm';
import ProductSelectionPage from '../modals/ProductSelectionPage';
import BringInItemRow from '../molecules/BringInItemRow';
import FreeInputItemRow from '../molecules/FreeInputItemRow';
import ProductDiscountSection from '../molecules/ProductDiscountSection';
import SampleItemRow from '../molecules/SampleItemRow';

interface ProcessingGroupSectionProps {
    estimatorState: EstimatorState;
    setEstimatorState: React.Dispatch<React.SetStateAction<EstimatorState>>;
    appData: AppData;
    onAddGroup: () => void;
    onRemoveGroup: (groupId: string) => void;
    onDuplicateGroup: (groupId: string) => void;
}

const ProcessingGroup: React.FC<Omit<ProcessingGroupSectionProps, 'onAddGroup' | 'estimatorState'> & { group: any, groupIndex: number }> = ({
    setEstimatorState,
    appData,
    onRemoveGroup,
    onDuplicateGroup,
    group,
    groupIndex
}) => {
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [productFilterKeyword, setProductFilterKeyword] = useState<string | null>(null);
    const [editingDesign, setEditingDesign] = useState<Partial<PrintDesign> | null>(null);
    const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
    const [isPriceEditingMap, setIsPriceEditingMap] = useState<Record<number, boolean>>({});
    const [isAllPriceEditing, setIsAllPriceEditing] = useState(false);

    const openProductModal = (keyword: string | null) => {
        setProductFilterKeyword(keyword);
        setIsProductModalOpen(true);
    };

    const updateGroup = (updater: (g: any) => any) => {
        setEstimatorState(prev => ({
            ...prev,
            processingGroups: prev.processingGroups.map(g => g.id === group.id ? updater(g) : g)
        }));
    };
    
    const handleUpdateOrderDetails = (updatedItemsForProduct: OrderDetail[], productId: string) => {
        updateGroup(group => {
            const otherItems = group.items.filter((item: OrderDetail) => item.productId !== productId);
            const itemsToAdd = updatedItemsForProduct.filter(item => item.quantity > 0 || (item.spareQuantity || 0) > 0);
            return { ...group, items: [...otherItems, ...itemsToAdd] };
        });
    };

    const handleModalUpdate = (items: OrderDetail[], productId: string) => {
        handleUpdateOrderDetails(items, productId);
        setIsProductModalOpen(false);
    };

    const handleUpdateItem = (itemIndex: number, updates: Partial<OrderDetail>) => {
        updateGroup(g => ({ ...g, items: g.items.map((item: OrderDetail, i: number) => i === itemIndex ? {...item, ...updates} : item) }));
    };

    const removeOrderDetail = (itemIndex: number) => { 
        updateGroup(g => ({...g, items: g.items.filter((_: any, i: number) => i !== itemIndex)}))
    };
    
    const handleDesignSave = (design: PrintDesign) => { 
        updateGroup(g => ({ ...g, printDesigns: g.printDesigns.find((d: PrintDesign) => d.id === design.id) ? g.printDesigns.map((d: PrintDesign) => d.id === design.id ? design : d) : [...g.printDesigns, design] }));
        setEditingDesign(null);
    };

    const removePrintDesign = (designId: string) => { updateGroup(g => ({ ...g, printDesigns: g.printDesigns.filter((d: PrintDesign) => d.id !== designId) })) };
    
    const handleAddBringInItem = () => {
        updateGroup(g => ({ ...g, items: [...g.items, { productId: `bringin_${Date.now()}`, productName: '', color: '持ち込み', size: '', quantity: 1, unitPrice: 0, isBringIn: true }] }));
    };

    const handleAddCustomItem = () => {
        updateGroup(g => ({ ...g, customItems: [...(g.customItems || []), { 
            id: `custom_${Date.now()}`, 
            label: '', 
            amount: 0, 
            enabled: true,
            type: 'amount_only',
            unitPrice: 0,
            quantity: 1,
        }] }));
    };
    
    const handleAddSampleItem = () => {
        updateGroup(g => ({ ...g, sampleItems: [...(g.sampleItems || []), { 
            id: `sample_${Date.now()}`, 
            label: '',
            unitPrice: 0,
            quantity: 1,
        }] }));
    };
    
    const handleUpdateSampleItem = (itemIndex: number, updates: Partial<SampleItem>) => {
        updateGroup(g => ({ ...g, sampleItems: g.sampleItems.map((item: SampleItem, i: number) => i === itemIndex ? {...item, ...updates} : item) }));
    };
    
    const handleRemoveSampleItem = (itemIndex: number) => {
        updateGroup(g => ({ ...g, sampleItems: g.sampleItems.filter((_: any, i: number) => i !== itemIndex) }));
    };

    const handleUpdateCustomItem = (itemIndex: number, updates: Partial<CustomItem>) => {
        updateGroup(g => ({ ...g, customItems: g.customItems.map((item: CustomItem, i: number) => i === itemIndex ? {...item, ...updates} : item) }));
    };
    
    const handleRemoveCustomItem = (itemIndex: number) => {
        updateGroup(g => ({ ...g, customItems: g.customItems.filter((_: any, i: number) => i !== itemIndex) }));
    };
    
    const handleSaveOptions = (newSelectedIds: string[]) => {
        updateGroup(g => ({ ...g, selectedOptions: newSelectedIds.map(id => ({ optionId: id })) }));
        setIsOptionsModalOpen(false);
    };

    const handleRemoveOption = (optionIdToRemove: string) => {
        updateGroup(g => {
            const newSelectedIds = (g.selectedOptions || [])
                .map((o: any) => o.optionId)
                .filter((id: string) => id !== optionIdToRemove);
            return { ...g, selectedOptions: newSelectedIds.map(id => ({ optionId: id })) };
        });
    };

    const handleToggleAllPriceEditing = (isEditing: boolean) => {
        setIsAllPriceEditing(isEditing);
        if (!isEditing) {
            setIsPriceEditingMap({});
            updateGroup(g => ({
                ...g,
                items: g.items.map((item: OrderDetail) => {
                    if (item.isBringIn) return item;
                    const { adjustedUnitPrice, ...rest } = item;
                    return { ...rest };
                })
            }));
        }
    };
    
    const handlePriceEditToggle = (itemIndex: number, isEditing: boolean) => {
        setIsPriceEditingMap(p => ({...p, [itemIndex]: isEditing }));
        if (!isEditing) {
            const currentItem = group.items[itemIndex];
            if (currentItem.adjustedUnitPrice !== undefined) {
                const { adjustedUnitPrice, ...rest } = currentItem;
                handleUpdateItem(itemIndex, { adjustedUnitPrice: undefined });
            }
        }
    };
    
    const selectedOptionsDetails = (group.selectedOptions || [])
        .map((so: any) => appData.additionalOptions.find(opt => opt.id === so.optionId))
        .filter((opt): opt is NonNullable<typeof opt> => Boolean(opt));
    
    return (
      <>
        <div className="bg-container-bg dark:bg-container-bg-dark p-4 rounded-lg mb-4 shadow-sm border border-default">
            <div className="flex justify-between items-center mb-2 border-b pb-2 border-default dark:border-default-dark">
                <div className="flex items-center gap-3 flex-grow min-w-0">
                    <label htmlFor={`group-name-${group.id}`} className="flex-shrink-0 text-right">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">グループタイトル</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">(編集可)</span>
                    </label>
                    <Input 
                        id={`group-name-${group.id}`}
                        name={`group-name-${group.id}`}
                        type="text" 
                        value={group.name} 
                        onChange={e => updateGroup(g => ({...g, name: e.target.value}))} 
                        className="text-lg font-bold bg-transparent w-full focus:outline-none focus:ring-1 focus:ring-brand-secondary rounded pl-2 py-1"
                    />
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button onClick={() => onDuplicateGroup(group.id)} className="p-1.5 text-gray-500 hover:text-blue-600 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30" title="このグループを複製"><DuplicateIcon className="w-5 h-5" /></button>
                    <button onClick={() => onRemoveGroup(group.id)} disabled={groupIndex === 0} className="p-1.5 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed" title="このグループを削除"><TrashIcon className="w-5 h-5" /></button>
                </div>
            </div>
            
            <div className="space-y-4">
                {/* 商品 */}
                <div>
                    <h4 className="font-semibold text-sm mb-2">商品</h4>
                    <div className="flex flex-col gap-2 mb-2">
                        <button onClick={() => openProductModal(null)} className="text-sm bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark py-2 font-bold rounded-lg hover:opacity-90">+ 商品・枚数を追加</button>
                        <button onClick={() => openProductModal('傘')} className="text-sm bg-button-muted-bg text-button-muted dark:bg-button-muted-bg-dark dark:text-button-muted-dark py-2 font-bold rounded-lg hover:opacity-90">傘を選択</button>
                        <button onClick={() => openProductModal('DTF')} className="text-sm bg-button-muted-bg text-button-muted dark:bg-button-muted-bg-dark dark:text-button-muted-dark py-2 font-bold rounded-lg hover:opacity-90">DTF関連商品</button>
                    </div>

                    {group.items.filter((item: OrderDetail) => !item.isBringIn).length > 0 && (
                        <div className="flex items-center gap-2 text-xs mb-2">
                            <label className="flex items-center gap-1"><ToggleSwitch checked={isAllPriceEditing} onChange={handleToggleAllPriceEditing} /> 全体の売値を変更</label>
                        </div>
                    )}
                    
                    {group.items.filter((item: OrderDetail) => !item.isBringIn).length > 0 && (
                        <div className="hidden md:grid grid-cols-12 items-center gap-x-2 text-xs font-bold text-muted dark:text-muted-dark px-2 mb-1">
                            <div className="col-span-1 text-center whitespace-pre-line" dangerouslySetInnerHTML={{ __html: '売値<br/>変更' }} />
                            <div className="col-span-4">商品</div>
                            <div className="col-span-2 text-center whitespace-pre-line" dangerouslySetInnerHTML={{ __html: '調整後<br/>単価' }} />
                            <div className="col-span-2 text-center">数量</div>
                            <div className="col-span-2 text-right">売値</div>
                            <div className="col-span-1"></div>
                        </div>
                    )}

                    {group.items.map((item: OrderDetail, index: number) => !item.isBringIn && (
                        <OrderDetailRow
                            key={`${item.productId}-${item.color}-${item.size}-${index}`}
                            item={item}
                            onUpdate={(updates) => handleUpdateItem(index, updates)}
                            onRemove={() => removeOrderDetail(index)}
                            isPriceEditing={isPriceEditingMap[index] || false}
                            onPriceEditToggle={(isEditing) => handlePriceEditToggle(index, isEditing)}
                            isAllPriceEditing={isAllPriceEditing}
                        />
                    ))}
                </div>

                {/* プリントデザイン */}
                <div>
                    <h4 className="font-semibold text-sm mb-2">プリントデザイン</h4>
                    <button onClick={() => setEditingDesign({id: `new_${Date.now()}`})} className="w-full mb-2 text-sm bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark py-2 font-bold rounded-lg hover:opacity-90">+ プリントデザインを追加</button>
                    {group.printDesigns.map((design: PrintDesign, index: number) => {
                        const locationLabel = appData.printLocations.find(l => l.locationId === design.location)?.label || design.location;
                        const specialInksText = (design.specialInks || [])
                            .map(ink => `${appData.pricing.specialInkOptions.find(o => o.type === ink.type)?.displayName || ink.type} x${ink.count}色`)
                            .join(', ');

                        return (
                            <div key={design.id} className="flex items-center gap-2 p-2 mt-1 bg-base-200 dark:bg-base-dark-300 border border-base-200 dark:border-base-dark-300 rounded-md">
                                {design.imageSrc && <img src={design.imageSrc} alt="プレビュー" className="w-12 h-12 object-contain bg-white border rounded-md" />}
                                <div className="flex-grow text-xs">
                                    <p className="font-bold">{`デザイン${index + 1}`}</p>
                                    {design.printMethod === 'silkscreen' ? (
                                        <>
                                            <p>{`箇所: ${locationLabel}, サイズ: ${design.size}, 色数: ${design.colors}, 版: ${design.plateType}`}</p>
                                            {specialInksText && <p className="text-blue-600 dark:text-blue-400">{`特殊インク: ${specialInksText}`}</p>}
                                        </>
                                    ) : (
                                        <p>{`箇所: ${locationLabel}, DTF: ${design.widthCm}x${design.heightCm}cm`}</p>
                                    )}
                                </div>
                                <button onClick={() => setEditingDesign(design)} className="text-gray-400 hover:text-blue-600 p-1"><PencilIcon className="w-4 h-4"/></button>
                                <button onClick={() => removePrintDesign(design.id)} className="text-gray-400 hover:text-red-600 p-1"><TrashIcon className="w-4 h-4"/></button>
                            </div>
                        );
                    })}
                </div>

                {/* 追加オプション */}
                <div>
                    <h4 className="font-semibold text-sm mb-2">追加オプション</h4>
                    <button onClick={() => setIsOptionsModalOpen(true)} className="w-full mb-2 text-sm bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark py-2 font-bold rounded-lg hover:opacity-90">+ 追加オプションを編集</button>
                    {selectedOptionsDetails.length > 0 && (
                        <div className="space-y-1 mb-2">
                            {selectedOptionsDetails.map(opt => (
                                <div key={opt.id} className="flex items-center justify-between p-2 text-xs bg-base-200 dark:bg-base-dark-300 rounded-md">
                                    <span>{opt.name} (+¥{opt.cost_per_item}/枚)</span>
                                    <button onClick={() => handleRemoveOption(opt.id)} className="text-gray-400 hover:text-red-600 p-1">
                                        <TrashIcon className="w-4 h-4"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* 持ち込み */}
                <div>
                    <h4 className="font-semibold text-sm mb-2">持ち込み</h4>
                    <button onClick={handleAddBringInItem} className="w-full mb-2 text-sm bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark py-2 font-bold rounded-lg hover:opacity-90">+ 持ち込みを追加</button>
                    {group.items.map((item: OrderDetail, index: number) => item.isBringIn && (
                        <BringInItemRow key={item.productId} item={item} onUpdate={(updates) => handleUpdateItem(index, updates)} onRemove={() => removeOrderDetail(index)} />
                    ))}
                </div>

                {/* サンプル代 */}
                <div>
                    <h4 className="font-semibold text-sm mb-2">サンプル代</h4>
                    <button onClick={handleAddSampleItem} className="w-full mb-2 text-sm bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark py-2 font-bold rounded-lg hover:opacity-90">+ サンプル代を追加</button>
                    {(group.sampleItems || []).map((item: SampleItem, index: number) => (
                        <SampleItemRow
                            key={item.id}
                            item={item}
                            onUpdate={(updates) => handleUpdateSampleItem(index, updates)}
                            onRemove={() => handleRemoveSampleItem(index)}
                        />
                    ))}
                </div>

                {/* 調整項目 */}
                <div>
                    <h4 className="font-semibold text-sm mb-2">調整項目</h4>
                    <button onClick={handleAddCustomItem} className="w-full mb-2 text-sm bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark py-2 font-bold rounded-lg hover:opacity-90">+ 調整項目を追加</button>
                    {(group.customItems || []).map((item: CustomItem, index: number) => (
                        <FreeInputItemRow key={item.id} item={item} onUpdate={(updates) => handleUpdateCustomItem(index, updates)} onRemove={() => handleRemoveCustomItem(index)} />
                    ))}
                </div>
                
                {/* 商品割引 */}
                <ProductDiscountSection items={group.items} />

            </div>
        </div>
        {isProductModalOpen && <ProductSelectionPage onClose={() => setIsProductModalOpen(false)} onUpdateItems={handleModalUpdate} appData={appData} existingOrderDetails={group.items || []} lockedManufacturerId={null} filterKeyword={productFilterKeyword} />}
        {editingDesign && <PrintDesignForm isOpen={!!editingDesign} onClose={() => setEditingDesign(null)} onSave={handleDesignSave} design={editingDesign} appData={appData} selectedCategoryId={""} />}
        {isOptionsModalOpen && <AdditionalOptionsModal isOpen={isOptionsModalOpen} onClose={() => setIsOptionsModalOpen(false)} options={appData.additionalOptions} selectedOptionIds={group.selectedOptions?.map((o:any) => o.optionId) || []} onSave={handleSaveOptions} />}
      </>
    );
};

// FIX: Add missing ProcessingGroupSection component that wraps ProcessingGroup and is the default export.
const ProcessingGroupSection: React.FC<ProcessingGroupSectionProps> = (props) => {
    return (
        <div className="bg-base-100 dark:bg-base-dark-200 p-6 rounded-lg shadow-md border border-base-200 dark:border-base-dark-300">
            <h2 className="text-xl font-bold mb-4">1. 加工グループ</h2>
            {props.estimatorState.processingGroups.map((group, groupIndex) => (
                <ProcessingGroup key={group.id} {...props} group={group} groupIndex={groupIndex} />
            ))}
            <button onClick={props.onAddGroup} className="mt-4 w-full flex items-center justify-center gap-2 text-sm bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                <PlusIcon className="w-5 h-5"/> 加工グループを追加
            </button>
        </div>
    );
};

export default ProcessingGroupSection;

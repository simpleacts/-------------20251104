import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Database, Row, PdfItemGroupConfig, PdfItemGroupConfigItem } from '@shared/types';
import { PlusIcon, TrashIcon, Bars2Icon } from '@components/atoms';
import { useNavigation } from '@core/contexts/NavigationContext';
import { updateDatabase } from '@core/utils';

interface ItemDefinition {
    label: string;
    description: string;
    hasBreakdown?: boolean;
    breakdownOptions?: { id: string; label: string }[];
}

const getItemTypeDefinitions = (t: (key: string, fallback: string) => string): Record<string, ItemDefinition> => ({
    'product_items': { 
        label: t('pdf_item_group.item_product_items', '商品明細'), 
        description: t('pdf_item_group.item_product_items_desc', 'Tシャツ本体など、各商品の数量と単価を表示します。'),
        hasBreakdown: true,
        breakdownOptions: [
            { id: 'productName', label: t('pdf_item_group.item_product_name', '商品名') },
            { id: 'color', label: t('pdf_item_group.item_color', 'カラー') },
            { id: 'size', label: t('pdf_item_group.item_size', 'サイズ') },
        ]
    },
    'print_costs': { 
        label: t('pdf_item_group.item_print_costs', 'プリント代'), 
        description: t('pdf_item_group.item_print_costs_desc', 'シルクスクリーンやDTFなどのプリント料金を表示します。'), 
        hasBreakdown: true,
    },
    'setup_costs': { 
        label: t('pdf_item_group.item_setup_costs', '製版代'), 
        description: t('pdf_item_group.item_setup_costs_desc', 'シルクスクリーン印刷に必要な版の料金を表示します。'),
        hasBreakdown: true,
    },
    'additional_options': { 
        label: t('pdf_item_group.item_additional_options', '追加オプション'), 
        description: t('pdf_item_group.item_additional_options_desc', '袋詰めやタグ付けなど、追加オプションの料金を表示します。'),
        hasBreakdown: true,
    },
    'print_and_setup': { 
        label: t('pdf_item_group.item_print_and_setup', 'プリント・製版代一式'), 
        description: t('pdf_item_group.item_print_and_setup_desc', 'プリント代と製版代を合算して一つの項目として表示します。') 
    },
    'custom_items': { 
        label: t('pdf_item_group.item_custom_items', 'カスタム項目'), 
        description: t('pdf_item_group.item_custom_items_desc', '任意のラベル、単価、数量を持つ項目です。見積もり時に手動で入力します。') 
    },
    'sample_items': {
        label: t('pdf_item_group.item_sample_items', 'サンプル品'),
        description: t('pdf_item_group.item_sample_items_desc', 'サンプル品の料金を表示します。'),
        hasBreakdown: true,
    },
    'product_discount': {
        label: t('pdf_item_group.item_product_discount', '商品割引'),
        description: t('pdf_item_group.item_product_discount_desc', '商品に対する割引額を表示します。'),
    },
    'shipping': {
        label: t('pdf_item_group.item_shipping', '送料'),
        description: t('pdf_item_group.item_shipping_desc', '送料を表示します。'),
    }
});


interface PdfItemGroupManagerProps {
    database: Partial<Database>;
    setDatabase: React.Dispatch<React.SetStateAction<Partial<Database> | null>>;
}

const PdfItemGroupManager: React.FC<PdfItemGroupManagerProps> = ({ database, setDatabase }) => {
    const { t } = useTranslation('pdf-item-group-manager');
    const { currentPage } = useNavigation();
    const [configs, setConfigs] = useState<PdfItemGroupConfig[]>([]);
    const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
    const [editingConfig, setEditingConfig] = useState<PdfItemGroupConfig | null>(null);
    const [editingItems, setEditingItems] = useState<PdfItemGroupConfigItem[]>([]);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    
    const ITEM_TYPE_DEFINITIONS = useMemo(() => getItemTypeDefinitions(t), [t]);

    useEffect(() => {
        const dbConfigs = (database.pdf_item_display_configs?.data as PdfItemGroupConfig[]) || [];
        setConfigs(dbConfigs);
        if (!selectedConfigId && dbConfigs.length > 0) {
            setSelectedConfigId(dbConfigs[0].id);
        }
    }, [database.pdf_item_display_configs, selectedConfigId]);

    useEffect(() => {
        if (selectedConfigId) {
            const config = configs.find(c => c.id === selectedConfigId);
            if (config) {
                setEditingConfig(JSON.parse(JSON.stringify(config)));
                try {
                    const items = JSON.parse(config.config_json);
                    setEditingItems(items.sort((a: any, b: any) => a.sort_order - b.sort_order));
                } catch {
                    setEditingItems([]);
                }
            }
        } else {
            setEditingConfig(null);
            setEditingItems([]);
        }
    }, [selectedConfigId, configs]);

    const handleSave = async () => {
        if (!editingConfig) return;
        const updatedConfig = { ...editingConfig, config_json: JSON.stringify(editingItems) };
        
        // まずローカル状態を更新
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            const index = newDb.pdf_item_display_configs.data.findIndex((c: Row) => c.id === updatedConfig.id);
            if (index > -1) {
                newDb.pdf_item_display_configs.data[index] = updatedConfig;
            }
            return newDb;
        });

        // サーバーに保存
        try {
            const operation = [{
                type: 'UPDATE' as const,
                data: updatedConfig,
                where: { id: updatedConfig.id }
            }];
            const result = await updateDatabase(currentPage, 'pdf_item_display_configs', operation, database as Database);
            if (!result.success) {
                throw new Error(result.error || 'Failed to save pdf item display config to server');
            }
            alert(t('pdf_item_group.save_success', '設定を保存しました。'));
        } catch (error) {
            console.error('[PdfItemGroupManager] Failed to save to server:', error);
            alert(t('pdf_item_group.save_failed', 'サーバーへの保存に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
        }
    };
    
    const handleAddConfig = async () => {
        const newConfig: PdfItemGroupConfig = {
            id: `item_conf_${Date.now()}`,
            name: t('pdf_item_group.new_config', '新規設定'),
            config_json: JSON.stringify([
                { id: 'product_items', label: t('pdf_item_group.item_product_amount', '商品代金'), enabled: true, sort_order: 10, config: { showBreakdown: true, consolidation: 'by_color_and_price' } },
                { id: 'print_costs', label: t('pdf_item_group.item_print_costs', 'プリント代'), enabled: true, sort_order: 20 },
                { id: 'setup_costs', label: t('pdf_item_group.item_setup_costs', '製版代'), enabled: true, sort_order: 30 },
            ])
        };
        
        // まずローカル状態を更新
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            newDb.pdf_item_display_configs.data.push(newConfig);
            return newDb;
        });

        // サーバーに保存
        try {
            const operation = [{ type: 'INSERT' as const, data: newConfig }];
            const result = await updateDatabase(currentPage, 'pdf_item_display_configs', operation, database as Database);
            if (!result.success) {
                throw new Error(result.error || 'Failed to save new pdf item display config to server');
            }
        } catch (error) {
            console.error('[PdfItemGroupManager] Failed to save new config to server:', error);
            alert(t('pdf_item_group.save_failed', 'サーバーへの保存に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
        }

        setSelectedConfigId(newConfig.id);
    };

    const handleDeleteConfig = async () => {
        if (!selectedConfigId || !window.confirm(t('pdf_item_group.delete_confirm', 'この設定を削除しますか？'))) return;
        
        // まずローカル状態から削除
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            newDb.pdf_item_display_configs.data = newDb.pdf_item_display_configs.data.filter((c: Row) => c.id !== selectedConfigId);
            return newDb;
        });

        // サーバーから削除
        try {
            const operation = [{ type: 'DELETE' as const, where: { id: selectedConfigId } }];
            const result = await updateDatabase(currentPage, 'pdf_item_display_configs', operation, database as Database);
            if (!result.success) {
                throw new Error(result.error || 'Failed to delete pdf item display config from server');
            }
        } catch (error) {
            console.error('[PdfItemGroupManager] Failed to delete from server:', error);
            alert(t('pdf_item_group.delete_failed', 'サーバーからの削除に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
        }

        setSelectedConfigId(null);
    };

    const handleItemUpdate = (itemId: string, updates: Partial<PdfItemGroupConfigItem> | { config: Partial<PdfItemGroupConfigItem['config']> }) => {
        setEditingItems(items => items.map(item => {
            if (item.id === itemId) {
                if ('config' in updates) {
                    return { ...item, config: { ...item.config, ...updates.config } };
                }
                return { ...item, ...updates };
            }
            return item;
        }));
    };
    
    const handleAddItem = (itemId: string) => {
        if (!itemId) return;
        const definition = ITEM_TYPE_DEFINITIONS[itemId];

        let config: PdfItemGroupConfigItem['config'] = {};
        if (definition.hasBreakdown) {
            if (itemId === 'product_items') {
                config = {
                    showBreakdown: true,
                    consolidation: 'by_color_and_price',
                };
            }
        }
    
        const newItem: PdfItemGroupConfigItem = {
            id: itemId as PdfItemGroupConfigItem['id'],
            label: definition.label,
            enabled: true,
            sort_order: (editingItems.length + 1) * 10,
            config,
        };
        setEditingItems(prev => [...prev, newItem]);
    };

    const handleDragStart = (e: React.DragEvent, id: string) => setDraggingId(id);
    const handleDragEnd = () => setDraggingId(null);
    const handleDragOver = (e: React.DragEvent) => e.preventDefault();
    const handleDrop = (dropId: string) => {
        if (!draggingId || draggingId === dropId) return;
        const dragIndex = editingItems.findIndex(item => item.id === draggingId);
        const dropIndex = editingItems.findIndex(item => item.id === dropId);
        const newItems = [...editingItems];
        const [draggedItem] = newItems.splice(dragIndex, 1);
        newItems.splice(dropIndex, 0, draggedItem);
        setEditingItems(newItems.map((item, index) => ({ ...item, sort_order: (index + 1) * 10 })));
    };

    const availableItemsToAdd = Object.keys(ITEM_TYPE_DEFINITIONS)
        .filter(id => !editingItems.some(item => item.id === id));

    type IncludeInUnitPriceType = 'byItem' | 'bySize' | 'byLocation' | 'byPlateType';

    const ADDITIONAL_COST_OPTIONS: { id: IncludeInUnitPriceType, label: string }[] = useMemo(() => [
        { id: 'byItem', label: t('pdf_item_group.additional_cost_by_item', '商品特性による追加料金') },
        { id: 'bySize', label: t('pdf_item_group.additional_cost_by_size', '大判サイズ料金') },
        { id: 'byLocation', label: t('pdf_item_group.additional_cost_by_location', '特殊箇所料金') },
        { id: 'byPlateType', label: t('pdf_item_group.additional_cost_by_plate_type', '分解版追加料金') },
    ], [t]);

    const handleIncludeInUnitPriceChange = (itemId: string, costType: IncludeInUnitPriceType, isChecked: boolean) => {
        handleItemUpdate(itemId, {
            config: {
                includeInUnitPrice: isChecked
                    ? [...(editingItems.find(i => i.id === itemId)?.config?.includeInUnitPrice || []), costType]
                    : (editingItems.find(i => i.id === itemId)?.config?.includeInUnitPrice || []).filter(ct => ct !== costType)
            }
        });
    };

    return (
        <div className="flex flex-col h-full">
            <header className="mb-6">
                <h1 className="text-3xl font-bold">{t('pdf_item_group.title', 'PDF明細項目管理')}</h1>
                <p className="text-gray-500 mt-1">{t('pdf_item_group.description', 'PDF帳票の「グループ化された明細」ブロックに表示される項目を管理します。')}</p>
            </header>
            <div className="grid grid-cols-12 gap-6 flex-grow min-h-0">
                <aside className="col-span-4 bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">{t('pdf_item_group.config_list', '設定一覧')}</h2>
                        <button onClick={handleAddConfig} className="p-2 text-brand-primary"><PlusIcon className="w-5 h-5"/></button>
                    </div>
                    <ul className="overflow-y-auto flex-grow">
                        {configs.map(c => <li key={c.id} onClick={() => setSelectedConfigId(c.id)} className={`p-3 rounded-md cursor-pointer mb-2 ${selectedConfigId === c.id ? 'bg-brand-secondary/20 font-semibold' : 'hover:bg-base-200'}`}>{c.name}</li>)}
                    </ul>
                </aside>
                <main className="col-span-8 bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md flex flex-col">
                    {editingConfig ? (
                        <>
                            <div className="flex justify-between items-center mb-4">
                                <input type="text" value={editingConfig.name} onChange={e => setEditingConfig(c => ({...c!, name: e.target.value}))} className="text-xl font-bold bg-transparent border-b-2 p-1"/>
                                <div className="flex gap-2">
                                    <button onClick={handleDeleteConfig} className="px-3 py-1 bg-red-500 text-white rounded text-sm">{t('pdf_item_group.delete', '削除')}</button>
                                    <button onClick={handleSave} className="px-4 py-2 bg-brand-primary text-white rounded font-semibold">{t('pdf_item_group.save', '保存')}</button>
                                </div>
                            </div>
                            <div className="mb-4">
                                <h3 className="text-lg font-semibold mb-2">{t('pdf_item_group.add_item', '項目を追加')}</h3>
                                <div className="flex flex-wrap gap-2 p-3 bg-base-200 dark:bg-base-dark-300 rounded-md">
                                    {availableItemsToAdd.map(id => (
                                        <button key={id} onClick={() => handleAddItem(id)} className="px-3 py-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 rounded text-sm">
                                            + {ITEM_TYPE_DEFINITIONS[id].label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="overflow-y-auto flex-grow space-y-3 pr-2">
                                {editingItems.map(item => {
                                    const definition = ITEM_TYPE_DEFINITIONS[item.id];
                                    return (
                                        <div key={item.id} draggable onDragStart={(e) => handleDragStart(e, item.id)} onDragEnd={handleDragEnd} onDragOver={handleDragOver} onDrop={() => handleDrop(item.id)}
                                            className={`p-3 bg-base-200 dark:bg-base-dark-300 rounded-md border border-base-300 dark:border-base-dark-300 flex gap-4 ${draggingId === item.id ? 'opacity-30' : ''}`}>
                                            <div className="cursor-grab text-gray-400 pt-1"><Bars2Icon className="w-5 h-5"/></div>
                                            <div className="flex-grow space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <h4 className="font-semibold">{definition?.label || item.id}</h4>
                                                    <input type="checkbox" checked={item.enabled} onChange={e => handleItemUpdate(item.id, {enabled: e.target.checked})} />
                                                </div>
                                                <p className="text-xs text-gray-500">{definition?.description}</p>
                                                <input type="text" value={item.label} onChange={e => handleItemUpdate(item.id, {label: e.target.value})} className="w-full p-1 border rounded text-sm bg-base-100 dark:bg-base-dark-200" />

                                                {definition?.hasBreakdown && item.id === 'product_items' && (
                                                    <div className="mt-2 pt-2 border-t border-base-300 dark:border-base-dark-300/50 space-y-2">
                                                        <label htmlFor={`show-breakdown-${item.id}`} className="text-xs flex items-center gap-2 cursor-pointer"><input id={`show-breakdown-${item.id}`} name={`show-breakdown-${item.id}`} type="checkbox" checked={item.config?.showBreakdown || false} onChange={e => handleItemUpdate(item.id, {config: { showBreakdown: e.target.checked }})}/>{t('pdf_item_group.show_breakdown', '詳細内訳を表示')}</label>
                                                        {item.config?.showBreakdown && (
                                                            <div className="mt-2 pl-4">
                                                                <p className="text-xs font-medium mb-1">{t('pdf_item_group.consolidation', 'まとめ方:')}</p>
                                                                <div className="flex flex-col gap-1 text-xs">
                                                                    <label htmlFor={`consolidation-none-${item.id}`} className="flex items-center gap-2"><input id={`consolidation-none-${item.id}`} type="radio" name={`consolidation-${item.id}`} value="none" checked={!item.config.consolidation || item.config.consolidation === 'none'} onChange={() => handleItemUpdate(item.id, {config: { consolidation: 'none'}})} /> {t('pdf_item_group.consolidation_none', 'なし (1行1アイテム)')}</label>
                                                                    <label htmlFor={`consolidation-color-price-${item.id}`} className="flex items-center gap-2"><input id={`consolidation-color-price-${item.id}`} type="radio" name={`consolidation-${item.id}`} value="by_color_and_price" checked={item.config.consolidation === 'by_color_and_price'} onChange={() => handleItemUpdate(item.id, {config: { consolidation: 'by_color_and_price'}})} /> {t('pdf_item_group.consolidation_color_price', '品番・カラー・単価でまとめる')}</label>
                                                                    <label htmlFor={`consolidation-price-${item.id}`} className="flex items-center gap-2"><input id={`consolidation-price-${item.id}`} type="radio" name={`consolidation-${item.id}`} value="by_price" checked={item.config.consolidation === 'by_price'} onChange={() => handleItemUpdate(item.id, {config: { consolidation: 'by_price'}})} /> {t('pdf_item_group.consolidation_price', '品番・単価でまとめる')}</label>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {(item.id === 'print_costs' || item.id === 'setup_costs' || item.id === 'additional_options') && (
                                                    <div className="mt-2 pt-2 border-t border-base-300 dark:border-base-dark-300/50 space-y-2 text-xs">
                                                        <p className="font-medium mb-1">{t('pdf_item_group.display_method', '表示方法:')}</p>
                                                        <div className="flex flex-col gap-1 pl-2">
                                                            {item.id === 'print_costs' && <>
                                                                <label htmlFor={`dm-lump-sum-${item.id}`}><input id={`dm-lump-sum-${item.id}`} type="radio" name={`dm-${item.id}`} value="lump_sum" checked={!item.config?.displayMode || item.config?.displayMode === 'lump_sum'} onChange={() => handleItemUpdate(item.id, {config: { displayMode: 'lump_sum' }})} /> {t('pdf_item_group.display_lump_sum', 'プリント代一式で表示')}</label>
                                                                <label htmlFor={`dm-summary-item-${item.id}`}><input id={`dm-summary-item-${item.id}`} type="radio" name={`dm-${item.id}`} value="summary_per_item" checked={item.config?.displayMode === 'summary_per_item'} onChange={() => handleItemUpdate(item.id, {config: { displayMode: 'summary_per_item' }})} /> {t('pdf_item_group.display_summary_item', '1枚単価にまとめる (B)')}</label>
                                                                <label htmlFor={`dm-summary-location-${item.id}`}><input id={`dm-summary-location-${item.id}`} type="radio" name={`dm-${item.id}`} value="summary_per_location" checked={item.config?.displayMode === 'summary_per_location'} onChange={() => handleItemUpdate(item.id, {config: { displayMode: 'summary_per_location' }})} /> {t('pdf_item_group.display_summary_location', 'プリント箇所ごとにまとめる (A-2)')}</label>
                                                                <label htmlFor={`dm-detailed-location-${item.id}`}><input id={`dm-detailed-location-${item.id}`} type="radio" name={`dm-${item.id}`} value="detailed_per_location" checked={item.config?.displayMode === 'detailed_per_location'} onChange={() => handleItemUpdate(item.id, {config: { displayMode: 'detailed_per_location' }})} /> {t('pdf_item_group.display_detailed_location', 'プリント箇所ごとに詳細を表示 (A-1)')}</label>
                                                            </>}
                                                            {item.id === 'setup_costs' && <>
                                                                <label htmlFor={`dm-setup-lump-sum-${item.id}`}><input id={`dm-setup-lump-sum-${item.id}`} type="radio" name={`dm-${item.id}`} value="lump_sum" checked={!item.config?.displayMode || item.config?.displayMode === 'lump_sum'} onChange={() => handleItemUpdate(item.id, {config: { displayMode: 'lump_sum' }})} /> {t('pdf_item_group.display_setup_lump_sum', 'すべて合計して表示 (D)')}</label>
                                                                <label htmlFor={`dm-setup-per-location-${item.id}`}><input id={`dm-setup-per-location-${item.id}`} type="radio" name={`dm-${item.id}`} value="per_location" checked={item.config?.displayMode === 'per_location'} onChange={() => handleItemUpdate(item.id, {config: { displayMode: 'per_location' }})} /> {t('pdf_item_group.display_setup_per_location', 'プリント箇所ごとに表示 (C)')}</label>
                                                            </>}
                                                            {item.id === 'additional_options' && <>
                                                                <label htmlFor={`dm-options-lump-sum-${item.id}`}><input id={`dm-options-lump-sum-${item.id}`} type="radio" name={`dm-${item.id}`} value="lump_sum" checked={!item.config?.displayMode || item.config?.displayMode === 'lump_sum'} onChange={() => handleItemUpdate(item.id, {config: { displayMode: 'lump_sum' }})} /> {t('pdf_item_group.display_options_lump_sum', 'すべて合計して表示')}</label>
                                                                <label htmlFor={`dm-options-per-option-${item.id}`}><input id={`dm-options-per-option-${item.id}`} type="radio" name={`dm-${item.id}`} value="per_option" checked={item.config?.displayMode === 'per_option'} onChange={() => handleItemUpdate(item.id, {config: { displayMode: 'per_option' }})} /> {t('pdf_item_group.display_options_per_option', 'オプション項目ごとに表示 (E)')}</label>
                                                            </>}
                                                        </div>
                                                         {item.config?.displayMode && item.config.displayMode !== 'lump_sum' && (
                                                            <div className="mt-2 pt-2 border-t border-base-300 dark:border-base-dark-300/50">
                                                                <label htmlFor={`show-unit-price-${item.id}`} className="flex items-center gap-2">
                                                                    <input id={`show-unit-price-${item.id}`} name={`show-unit-price-${item.id}`} type="checkbox" checked={item.config?.showUnitPriceInBreakdown || false} onChange={e => handleItemUpdate(item.id, { config: { showUnitPriceInBreakdown: e.target.checked } })} />
                                                                    {t('pdf_item_group.show_unit_price_breakdown', '内訳に単価/金額を表示')}
                                                                </label>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {item.id === 'print_costs' && (
                                                    <div className="mt-2 pt-2 border-t border-base-300 dark:border-base-dark-300/50 space-y-2 text-xs">
                                                        <p className="font-medium mb-1">{t('pdf_item_group.include_in_unit_price', '単価に含める追加料金:')}</p>
                                                        <div className="grid grid-cols-2 gap-1 pl-2">
                                                            {ADDITIONAL_COST_OPTIONS.map(opt => (
                                                                <label key={opt.id} className="flex items-center gap-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={(item.config?.includeInUnitPrice || []).includes(opt.id)}
                                                                        onChange={(e) => handleIncludeInUnitPriceChange(item.id, opt.id, e.target.checked)}
                                                                    />
                                                                    {opt.label}
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                            </div>
                                             <button onClick={() => setEditingItems(items => items.filter(i => i.id !== item.id))} className="text-gray-400 hover:text-red-500 self-start p-1"><TrashIcon className="w-4 h-4" /></button>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">{t('pdf_item_group.select_config', '設定を選択または新規作成してください。')}</div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default PdfItemGroupManager;
import React, { useMemo, useState } from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { AppData, CustomerInfo, Database, OrderDetail, PrintDesign, ProcessingGroup, Product, Row } from '@shared/types';
import { CheckIcon, PencilIcon, XMarkIcon } from '@components/atoms';
import EditableField from '@components/molecules/EditableField';
import { calculateCost } from '@features/estimator/services/estimateService';
import { useNavigation } from '@core/contexts/NavigationContext';
import { updateDatabase } from '@core/utils';

const LogicSection: React.FC<{ title: React.ReactNode; description?: string; children?: React.ReactNode }> = ({ title, description, children }) => (
    <div className="mb-6 bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md">
        { typeof title === 'string' ? <h3 className="font-bold text-lg mb-2">{title}</h3> : title }
        {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}
        {children}
    </div>
);

const SectionHeader: React.FC<{ title: string; sectionKey: string; editingSection: string | null; onEdit: () => void; onSave: () => void; onCancel: () => void; }> = ({ title, sectionKey, editingSection, onEdit, onSave, onCancel }) => {
    const { t } = useTranslation('silkscreen');
    const isEditing = editingSection === sectionKey;
    return (
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">{title}</h3>
            {isEditing ? (
                <div className="flex gap-2">
                    <button onClick={onSave} className="px-3 py-1 text-sm bg-green-600 text-white rounded flex items-center gap-1"><CheckIcon className="w-4 h-4" /> {t('silkscreen.save', '保存')}</button>
                    <button onClick={onCancel} className="px-3 py-1 text-sm bg-gray-500 text-white rounded flex items-center gap-1"><XMarkIcon className="w-4 h-4" /> {t('silkscreen.cancel', 'キャンセル')}</button>
                </div>
            ) : (
                <button onClick={onEdit} className="p-2 text-gray-500 hover:text-blue-600"><PencilIcon className="w-5 h-5" /></button>
            )}
        </div>
    );
};

interface SilkscreenLogicToolProps {
    appData: AppData;
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
}

const SilkscreenLogicTool: React.FC<SilkscreenLogicToolProps> = ({ appData, database, setDatabase }) => {
    const { t } = useTranslation('silkscreen');
    const { currentPage } = useNavigation();
    const [simInputs, setSimInputs] = useState({
        quantity: 50,
        colors: 2,
        size: '30x40',
        specialInkCount: 1,
        isReorder: false,
    });
    
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [tempData, setTempData] = useState<any>({});

    const simResult = useMemo(() => {
        const dummyProduct: Product = { 
            id: 'prod_sample', 
            name: 'サンプルTシャツ', 
            categoryId: 'c001', 
            prices: [{ size: 'M', color: 'カラー', purchasePrice: 500, listPrice: 1000 }], 
            tags: [],
            brand: 'SampleBrand',
            manufacturerId: '2', 
            description: 'A sample T-shirt for simulation.',
            code: 'SMP-001',
            jan_code: '',
            colors: [],
            is_published: true,
        };
        const dummyItems: OrderDetail[] = [{ productId: 'prod_sample', productName: 'サンプルTシャツ', color: 'ブラック', size: 'M', quantity: simInputs.quantity, unitPrice: 0 }];
        const dummyDesign: PrintDesign = { id: 'design_sample', location: 'frontCenter', printMethod: 'silkscreen', colors: simInputs.colors, size: simInputs.size as any, specialInks: simInputs.specialInkCount > 0 ? [{type: 'silver', count: 1}] : []};
        const dummyGroup: ProcessingGroup = { id: 'group_sample', name: 'サンプル', items: dummyItems, printDesigns: [dummyDesign] };
        const dummyCustomerInfo: CustomerInfo = {
            companyName: '', nameKanji: '', nameKana: '', email: '', phone: '',
            zipCode: '', address1: '', address2: '', notes: '', customer_group_id: 'cgrp_00001',
            has_separate_shipping_address: false, shipping_name: '', shipping_phone: '',
            shipping_zip_code: '', shipping_address1: '', shipping_address2: '',
        };
        const dtfData = { consumables: [], equipment: [], laborCosts: [], pressTimeCosts: [], electricityRates: [] };

        const { costDetails } = calculateCost({ processingGroups: [dummyGroup] }, [dummyProduct], dummyCustomerInfo, appData, dtfData, appData.dtfPrintSettings, { isReorder: simInputs.isReorder }, database);
        return costDetails;

    }, [simInputs, appData, database]);
    
    const handleEdit = (section: string) => {
        setEditingSection(section);
        const dataMap: { [key: string]: any } = {
            params: { defaultMarkup: appData.pricing.defaultSellingMarkup, bringInMarkup: appData.pricing.defaultBringInMarkup },
            plateCosts: database.plate_costs.data,
        };
        setTempData({ [section]: JSON.parse(JSON.stringify(dataMap[section])) });
    };

    const handleCancel = () => {
        setEditingSection(null);
        setTempData({});
    };

    const handleSave = async () => {
        if (!editingSection) return;

        // まずローカル状態を更新
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            if (editingSection === 'params') {
                const defaultMarkupIndex = newDb.settings.data.findIndex((r:Row) => r.key === 'DEFAULT_SELLING_MARKUP');
                if (defaultMarkupIndex > -1) newDb.settings.data[defaultMarkupIndex].value = String(tempData.params.defaultMarkup);
                const bringInMarkupIndex = newDb.settings.data.findIndex((r:Row) => r.key === 'DEFAULT_BRING_IN_MARKUP');
                if (bringInMarkupIndex > -1) newDb.settings.data[bringInMarkupIndex].value = String(tempData.params.bringInMarkup);
            } else if (editingSection === 'plateCosts') {
                newDb.plate_costs.data = tempData.plateCosts;
            }
            return newDb;
        });

        // サーバーに保存
        try {
            if (editingSection === 'params') {
                const settingsOperations: any[] = [];
                ['DEFAULT_SELLING_MARKUP', 'DEFAULT_BRING_IN_MARKUP'].forEach(key => {
                    const value = key === 'DEFAULT_SELLING_MARKUP' 
                        ? String(tempData.params.defaultMarkup)
                        : String(tempData.params.bringInMarkup);
                    const existing = (database.settings?.data || []).find((s: Row) => s.key === key);
                    if (existing) {
                        settingsOperations.push({
                            type: 'UPDATE' as const,
                            data: { value },
                            where: { key }
                        });
                    } else {
                        settingsOperations.push({
                            type: 'INSERT' as const,
                            data: { key, value }
                        });
                    }
                });
                if (settingsOperations.length > 0) {
                    const result = await updateDatabase(currentPage, 'settings', settingsOperations, database);
                    if (!result.success) {
                        throw new Error(result.error || 'Failed to save settings to server');
                    }
                }
            } else if (editingSection === 'plateCosts') {
                const existingIds = (database.plate_costs?.data || []).map((c: Row) => c.id);
                const operations = [
                    ...existingIds.map(id => ({ type: 'DELETE' as const, where: { id } })),
                    ...tempData.plateCosts.map((cost: Row) => ({ type: 'INSERT' as const, data: cost }))
                ];
                if (operations.length > 0) {
                    const result = await updateDatabase(currentPage, 'plate_costs', operations, database);
                    if (!result.success) {
                        throw new Error(result.error || 'Failed to save plate costs to server');
                    }
                }
            }
            setEditingSection(null);
        } catch (error) {
            console.error('[SilkscreenLogic] Failed to save to server:', error);
            alert(t('silkscreen.save_failed', 'サーバーへの保存に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    const handleTempChange = (field: string, value: any, index?: number) => {
        setTempData(prev => {
            if (index !== undefined) {
                const newArray = [...prev[editingSection!]];
                newArray[index] = { ...newArray[index], [field]: value };
                return { ...prev, [editingSection!]: newArray };
            }
            const newSectionData = { ...prev[editingSection!], [field]: value };
            return { ...prev, [editingSection!]: newSectionData };
        });
    };
    
    const plateCostsData = editingSection === 'plateCosts' ? tempData.plateCosts : database.plate_costs.data;
    const paramsData = editingSection === 'params' ? tempData.params : { defaultMarkup: appData.pricing.defaultSellingMarkup, bringInMarkup: appData.pricing.defaultBringInMarkup };

    return (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
                <LogicSection title={t('silkscreen.logic_overview_title', '計算ロジックの概要')} description={t('silkscreen.logic_overview_description', 'シルクスクリーン印刷の見積もりは、主に「商品代」「プリント代」「製版代」の3つの要素から構成されます。')}>
                    <ul className="space-y-2 text-sm">
                        <li><strong>{t('silkscreen.logic_product_cost', '1. 商品代:')}</strong> {t('silkscreen.logic_product_cost_desc', '顧客グループやカテゴリに応じた価格ルールに基づき、商品の販売単価を決定します。')}</li>
                        <li><strong>{t('silkscreen.logic_print_cost', '2. プリント代:')}</strong> {t('silkscreen.logic_print_cost_desc', '注文枚数に応じて変動する単価（単価マトリクス）を基準に、色数、プリントサイズ、特殊インクなどの追加料金を加算します。')}</li>
                        <li><strong>{t('silkscreen.logic_plate_cost', '3. 製版代:')}</strong> {t('silkscreen.logic_plate_cost_desc', 'プリントサイズと色数に基づき、必要な版の作成費用を計算します。（リピート注文では0円）')}</li>
                    </ul>
                </LogicSection>

                <LogicSection title={<SectionHeader title={t('silkscreen.params_title', '主要パラメータ')} sectionKey="params" editingSection={editingSection} onEdit={() => handleEdit('params')} onSave={handleSave} onCancel={handleCancel} />}>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center"><label htmlFor="silkscreen-default-markup">{t('silkscreen.default_markup_label', 'デフォルトのマークアップ率')}</label><EditableField id="silkscreen-default-markup" name="default_markup" type="number" value={paramsData.defaultMarkup} onChange={v => handleTempChange('defaultMarkup', v)} disabled={editingSection !== 'params'} className="w-24 text-right" /></div>
                        <div className="flex justify-between items-center"><label htmlFor="silkscreen-bring-in-markup">{t('silkscreen.bring_in_markup_label', '持ち込み時のマークアップ率')}</label><EditableField id="silkscreen-bring-in-markup" name="bring_in_markup" type="number" value={paramsData.bringInMarkup} onChange={v => handleTempChange('bringInMarkup', v)} disabled={editingSection !== 'params'} className="w-24 text-right" /></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">{t('silkscreen.pricing_note', '※より詳細な単価設定（単価マトリクス、追加料金など）は「プリント単価表管理」ツールで行います。')}</p>
                </LogicSection>

                <LogicSection title={<SectionHeader title={t('silkscreen.plate_cost_title', '製版代設定')} sectionKey="plateCosts" editingSection={editingSection} onEdit={() => handleEdit('plateCosts')} onSave={handleSave} onCancel={handleCancel} />}>
                     <table className="min-w-full text-sm">
                        <thead className="bg-base-200 dark:bg-base-dark-300"><tr><th className="p-1">{t('silkscreen.table_header_size', 'サイズ')}</th><th className="p-1">{t('silkscreen.table_header_plate_type', '版種別')}</th><th className="p-1">{t('silkscreen.table_header_cost', '費用')}</th><th className="p-1">{t('silkscreen.table_header_surcharge', '色毎追加料金')}</th></tr></thead>
                        <tbody>
                            {plateCostsData.map((costRow: Row, index: number) => (
                                <tr key={costRow.id} className="border-t">
                                    <td className="p-1">{costRow.size}</td><td className="p-1">{costRow.plateType}</td>
                                    <td className="p-1"><EditableField id={`silkscreen-cost-${index}`} name={`cost_${index}`} type="number" value={costRow.cost} onChange={v => handleTempChange('cost', v, index)} disabled={editingSection !== 'plateCosts'} className="text-right" /></td>
                                    <td className="p-1"><EditableField id={`silkscreen-surcharge-${index}`} name={`surcharge_${index}`} type="number" value={costRow.surchargePerColor} onChange={v => handleTempChange('surchargePerColor', v, index)} disabled={editingSection !== 'plateCosts'} className="text-right" /></td>
                                </tr>
                            ))}
                        </tbody>
                     </table>
                </LogicSection>
            </div>
            
            <div>
                 <LogicSection title={t('silkscreen.simulator_title', 'シミュレーター')}>
                     <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div><label htmlFor="sim-quantity-input">{t('silkscreen.sim_quantity', '数量')}</label><input id="sim-quantity-input" name="sim_quantity" type="number" value={simInputs.quantity} onChange={e => setSimInputs(s => ({...s, quantity: +e.target.value}))} className="w-full p-1 border rounded mt-1 bg-base-200 dark:bg-base-dark-300"/></div>
                        <div><label htmlFor="sim-colors-input">{t('silkscreen.sim_colors', '色数')}</label><input id="sim-colors-input" name="sim_colors" type="number" value={simInputs.colors} onChange={e => setSimInputs(s => ({...s, colors: +e.target.value}))} className="w-full p-1 border rounded mt-1 bg-base-200 dark:bg-base-dark-300"/></div>
                        <div><label htmlFor="sim-size-select">{t('silkscreen.sim_size', 'プリントサイズ')}</label><select id="sim-size-select" name="sim_size" value={simInputs.size} onChange={e => setSimInputs(s => ({...s, size: e.target.value}))} className="w-full p-1 border rounded mt-1 bg-base-200 dark:bg-base-dark-300"><option value="10x10">10x10</option><option value="30x40">30x40</option><option value="35x50">35x50</option></select></div>
                        <div><label htmlFor="sim-special-ink-input">{t('silkscreen.sim_special_ink', '特殊インク（色数）')}</label><input id="sim-special-ink-input" name="sim_special_ink" type="number" value={simInputs.specialInkCount} onChange={e => setSimInputs(s => ({...s, specialInkCount: +e.target.value}))} className="w-full p-1 border rounded mt-1 bg-base-200 dark:bg-base-dark-300"/></div>
                        <div className="col-span-2"><label htmlFor="sim-reorder-checkbox" className="flex items-center gap-2"><input id="sim-reorder-checkbox" name="sim_reorder" type="checkbox" checked={simInputs.isReorder} onChange={e => setSimInputs(s => ({...s, isReorder: e.target.checked}))} />{t('silkscreen.sim_reorder', 'リピート注文（版代なし）')}</label></div>
                     </div>
                     <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-2">
                        <div className="flex justify-between items-baseline"><span className="font-semibold">{t('silkscreen.sim_cost_per_shirt', '1枚あたり単価 (税込)')}</span><span className="text-2xl font-bold text-blue-800 dark:text-blue-300">¥{Math.round(simResult.costPerShirt).toLocaleString()}</span></div>
                        <div className="text-xs space-y-1 pt-2 border-t">
                            <div className="flex justify-between"><span>{t('silkscreen.sim_tshirt_cost', 'Tシャツ代')}</span><span>¥{Math.round(simResult.tshirtCost).toLocaleString()}</span></div>
                            <div className="flex justify-between"><span>{t('silkscreen.sim_print_cost', 'プリント代')}</span><span>¥{Math.round(simResult.printCost).toLocaleString()}</span></div>
                            <div className="flex justify-between"><span>{t('silkscreen.sim_setup_cost', '製版代')}</span><span>¥{Math.round(simResult.setupCost).toLocaleString()}</span></div>
                            <div className="flex justify-between font-bold pt-1 border-t"><span>{t('silkscreen.sim_total', '合計 (税抜)')}</span><span>¥{Math.round(simResult.totalCost).toLocaleString()}</span></div>
                        </div>
                     </div>
                 </LogicSection>
            </div>
        </div>
    );
};

export default SilkscreenLogicTool;
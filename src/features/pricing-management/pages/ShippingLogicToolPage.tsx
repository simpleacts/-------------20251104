import React, { useState } from 'react';
import { AppData, Database, Row } from '@shared/types';
import { CheckIcon, PencilIcon, XMarkIcon } from '@components/atoms';
import EditableField from '@components/molecules/EditableField';
import { PageHeader } from '@components/molecules';
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
    const isEditing = editingSection === sectionKey;
    return (
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">{title}</h3>
            {isEditing ? (
                <div className="flex gap-2">
                    <button onClick={onSave} className="px-3 py-1 text-sm bg-green-600 text-white rounded flex items-center gap-1"><CheckIcon className="w-4 h-4" /> 保存</button>
                    <button onClick={onCancel} className="px-3 py-1 text-sm bg-gray-500 text-white rounded flex items-center gap-1"><XMarkIcon className="w-4 h-4" /> キャンセル</button>
                </div>
            ) : (
                <button onClick={onEdit} className="p-2 text-gray-500 hover:text-blue-600"><PencilIcon className="w-5 h-5" /></button>
            )}
        </div>
    );
};

interface ShippingLogicToolProps {
    appData: AppData;
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
}

const ShippingLogicTool: React.FC<ShippingLogicToolProps> = ({ appData, database, setDatabase }) => {
    const { currentPage } = useNavigation();
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [tempData, setTempData] = useState<any>({});

    const handleEdit = (section: string) => {
        setEditingSection(section);
        const dataMap: { [key: string]: any } = {
            shippingCosts: database.shipping_costs.data,
            freeThreshold: appData.pricing.shippingFreeThreshold,
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
            if (editingSection === 'shippingCosts') {
                newDb.shipping_costs.data = tempData.shippingCosts;
            } else if (editingSection === 'freeThreshold') {
                const index = newDb.settings.data.findIndex((r: Row) => r.key === 'SHIPPING_FREE_THRESHOLD');
                if (index > -1) newDb.settings.data[index].value = String(tempData.freeThreshold);
            }
            return newDb;
        });

        // サーバーに保存
        try {
            if (editingSection === 'shippingCosts') {
                const existingIds = (database.shipping_costs?.data || []).map((c: Row) => c.id);
                const operations = [
                    ...existingIds.map(id => ({ type: 'DELETE' as const, where: { id } })),
                    ...tempData.shippingCosts.map((cost: Row) => ({ type: 'INSERT' as const, data: cost }))
                ];
                if (operations.length > 0) {
                    const result = await updateDatabase(currentPage, 'shipping_costs', operations, database);
                    if (!result.success) {
                        throw new Error(result.error || 'Failed to save shipping costs to server');
                    }
                }
            } else if (editingSection === 'freeThreshold') {
                const existing = (database.settings?.data || []).find((s: Row) => s.key === 'SHIPPING_FREE_THRESHOLD');
                const operation = existing
                    ? [{ type: 'UPDATE' as const, data: { value: String(tempData.freeThreshold) }, where: { key: 'SHIPPING_FREE_THRESHOLD' } }]
                    : [{ type: 'INSERT' as const, data: { key: 'SHIPPING_FREE_THRESHOLD', value: String(tempData.freeThreshold) } }];
                const result = await updateDatabase(currentPage, 'settings', operation, database);
                if (!result.success) {
                    throw new Error(result.error || 'Failed to save shipping free threshold to server');
                }
            }
            setEditingSection(null);
        } catch (error) {
            console.error('[ShippingLogic] Failed to save to server:', error);
            alert('サーバーへの保存に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
        }
    };
    
    const handleTempChange = (value: any, index?: number, field?: string) => {
        if (editingSection === 'freeThreshold') {
            setTempData({ freeThreshold: value });
        } else if (editingSection === 'shippingCosts' && index !== undefined && field) {
            setTempData(prev => {
                const newCosts = [...prev.shippingCosts];
                newCosts[index] = { ...newCosts[index], [field]: value };
                return { shippingCosts: newCosts };
            });
        }
    };
    
    const shippingCostsData = editingSection === 'shippingCosts' ? tempData.shippingCosts : database.shipping_costs.data;
    const freeThresholdData = editingSection === 'freeThreshold' ? tempData.freeThreshold : appData.pricing.shippingFreeThreshold;

    return (
         <div className="flex flex-col h-full">
            <PageHeader title="送料計算ロジック" description="送料の計算ロジックを管理します。" />
            <div className="space-y-6 flex-grow overflow-auto">
                <LogicSection title="計算ロジックの概要" description="送料は、顧客の住所（都道府県）に基づいて地域を特定し、その地域の送料を適用します。合計金額が送料無料のしきい値を超えた場合、送料は0円になります。">
                    <ul className="space-y-2 text-sm">
                        <li><strong>1. 地域特定:</strong> 顧客の住所の都道府県から、送料設定で定義された地域を特定します。</li>
                        <li><strong>2. 送料適用:</strong> 特定された地域の送料を適用します。どの地域にも属さない場合はデフォルトの送料が適用されます。</li>
                        <li><strong>3. 無料条件:</strong> 商品代＋プリント代＋製版代の合計が、設定されたしきい値を超えると送料無料になります。</li>
                    </ul>
                </LogicSection>

                <LogicSection title={<SectionHeader title="送料無料しきい値" sectionKey="freeThreshold" {...{editingSection, onEdit: () => handleEdit('freeThreshold'), onSave: handleSave, onCancel: handleCancel}} />}>
                    <div className="flex items-center gap-2">
                        <label htmlFor="shipping-free-threshold" className="sr-only">送料無料しきい値</label>
                        <EditableField id="shipping-free-threshold" name="free_threshold" type="number" value={freeThresholdData} onChange={v => handleTempChange(v)} disabled={editingSection !== 'freeThreshold'} className="w-40 text-right" />
                        <span>円 (税抜) 以上で送料無料</span>
                    </div>
                </LogicSection>

                <LogicSection title={<SectionHeader title="地域別送料" sectionKey="shippingCosts" {...{editingSection, onEdit: () => handleEdit('shippingCosts'), onSave: handleSave, onCancel: handleCancel}} />}>
                    <table className="min-w-full text-sm">
                        <thead className="bg-base-200 dark:bg-base-dark-300">
                            <tr>
                                <th className="p-1">地域</th>
                                <th className="p-1">送料</th>
                                <th className="p-1">対象都道府県</th>
                            </tr>
                        </thead>
                        <tbody>
                            {shippingCostsData.map((costRow: Row, index: number) => (
                                <tr key={costRow.region} className="border-t">
                                    <td className="p-1">{costRow.region}</td>
                                    <td className="p-1"><EditableField id={`shipping-cost-${index}`} name={`shipping_cost_${index}`} type="number" value={costRow.cost} onChange={v => handleTempChange(v, index, 'cost')} disabled={editingSection !== 'shippingCosts'} className="text-right" /></td>
                                    <td className="p-1"><EditableField id={`shipping-prefectures-${index}`} name={`shipping_prefectures_${index}`} value={costRow.prefectures} onChange={v => handleTempChange(v, index, 'prefectures')} disabled={editingSection !== 'shippingCosts'} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </LogicSection>
            </div>
        </div>
    );
};

export default ShippingLogicTool;
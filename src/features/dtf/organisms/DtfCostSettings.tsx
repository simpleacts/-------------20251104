import React, { useState } from 'react';
import { AppData, Database, Row } from '@shared/types';
import { DtfConsumable, DtfElectricityRate, DtfEquipment, DtfLaborCost } from '../types';
import { CheckIcon, PencilIcon, XMarkIcon } from '@components/atoms';
import EditableField from '@components/molecules/EditableField';
import { useNavigation } from '@core/contexts/NavigationContext';
import { updateDatabase } from '@core/utils';

const LogicSection: React.FC<{ title: React.ReactNode; children?: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-6 bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md">
        { typeof title === 'string' ? <h3 className="font-bold text-lg mb-2">{title}</h3> : title }
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

interface DtfCostSettingsProps {
    appData: AppData;
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
}

const DtfCostSettings: React.FC<DtfCostSettingsProps> = ({ appData, database, setDatabase }) => {
    const { currentPage } = useNavigation();
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [tempData, setTempData] = useState<any>({});
    
    const handleEdit = (section: string) => {
        setEditingSection(section);
        const dataMap: { [key: string]: any } = {
            consumables: database.dtf_consumables.data,
            equipment: database.dtf_equipment.data,
            laborCosts: database.dtf_labor_costs.data,
            electricity: database.dtf_electricity_rates.data,
        };
        setTempData({ [section]: JSON.parse(JSON.stringify(dataMap[section])) });
    };

    const handleCancel = () => { setEditingSection(null); setTempData({}); };
    
    const handleSave = async () => {
        if (!editingSection) return;
        
        // まずローカル状態を更新
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            const dataToSave = tempData[editingSection];
            switch(editingSection) {
                case 'consumables': newDb.dtf_consumables.data = dataToSave; break;
                case 'equipment': newDb.dtf_equipment.data = dataToSave; break;
                case 'laborCosts': newDb.dtf_labor_costs.data = dataToSave; break;
                case 'electricity': newDb.dtf_electricity_rates.data = dataToSave; break;
            }
            return newDb;
        });

        // サーバーに保存
        try {
            const dataToSave = tempData[editingSection];
            let tableName: string;
            switch(editingSection) {
                case 'consumables': tableName = 'dtf_consumables'; break;
                case 'equipment': tableName = 'dtf_equipment'; break;
                case 'laborCosts': tableName = 'dtf_labor_costs'; break;
                case 'electricity': tableName = 'dtf_electricity_rates'; break;
                default: return;
            }

            const existingIds = (database[tableName]?.data || []).map((r: Row) => r.id);
            const operations = [
                ...existingIds.map(id => ({ type: 'DELETE' as const, where: { id } })),
                ...dataToSave.map((item: Row) => ({ type: 'INSERT' as const, data: item }))
            ];

            if (operations.length > 0) {
                const result = await updateDatabase(currentPage, tableName, operations, database);
                if (!result.success) {
                    throw new Error(result.error || `Failed to save ${tableName} to server`);
                }
            }

            setEditingSection(null);
            alert('設定を保存しました。');
        } catch (error) {
            console.error('[DtfCostSettings] Failed to save to server:', error);
            alert('サーバーへの保存に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    const handleTempChange = (section: string, field: string, value: any, index: number) => {
        setTempData(prev => {
            const sectionData = prev[section];
            let newSectionData;
            if (index !== undefined && Array.isArray(sectionData)) {
                newSectionData = [...sectionData];
                newSectionData[index] = { ...newSectionData[index], [field]: value };
            } else {
                newSectionData = { ...sectionData, [field]: value };
            }
            return { ...prev, [section]: newSectionData };
        });
    };

    const consumablesData = editingSection === 'consumables' ? tempData.consumables : database.dtf_consumables.data;
    const equipmentData = editingSection === 'equipment' ? tempData.equipment : database.dtf_equipment.data;
    const laborCostsData = editingSection === 'laborCosts' ? tempData.laborCosts : database.dtf_labor_costs.data;
    const electricityData = editingSection === 'electricity' ? tempData.electricity : database.dtf_electricity_rates.data;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <LogicSection title={<SectionHeader title="消耗品費設定" sectionKey="consumables" {...{editingSection, onEdit: () => handleEdit('consumables'), onSave: handleSave, onCancel: handleCancel}} />}>
                <table className="w-full text-xs"><thead><tr className="bg-base-200 dark:bg-base-dark-300"><th>品名</th><th>単価</th><th>消費率</th></tr></thead><tbody>{consumablesData.map((c: DtfConsumable, i:number) => <tr key={i} className="border-t"><td>{c.name}</td><td><EditableField value={c.unit_price} onChange={v=>handleTempChange('consumables','unit_price',v,i)} type="number" disabled={editingSection!=='consumables'}/>/{c.unit}</td><td><EditableField value={c.consumption_rate} onChange={v=>handleTempChange('consumables','consumption_rate',v,i)} type="number" disabled={editingSection!=='consumables'}/>{c.consumption_unit}</td></tr>)}</tbody></table>
            </LogicSection>
            <LogicSection title={<SectionHeader title="設備費設定" sectionKey="equipment" {...{editingSection, onEdit: () => handleEdit('equipment'), onSave: handleSave, onCancel: handleCancel}} />}>
                 <table className="w-full text-xs"><thead><tr className="bg-base-200 dark:bg-base-dark-300"><th>設備名</th><th>購入価格</th><th>償却年数</th><th>消費電力(W)</th></tr></thead><tbody>{equipmentData.map((e: DtfEquipment, i:number) => <tr key={i} className="border-t"><td>{e.name}</td><td><EditableField value={e.purchase_price} onChange={v=>handleTempChange('equipment','purchase_price',v,i)} type="number" disabled={editingSection!=='equipment'}/></td><td><EditableField value={e.depreciation_years} onChange={v=>handleTempChange('equipment','depreciation_years',v,i)} type="number" disabled={editingSection!=='equipment'}/></td><td><EditableField value={e.power_consumption_w} onChange={v=>handleTempChange('equipment','power_consumption_w',v,i)} type="number" disabled={editingSection!=='equipment'}/></td></tr>)}</tbody></table>
            </LogicSection>
            <LogicSection title={<SectionHeader title="人件費設定" sectionKey="laborCosts" {...{editingSection, onEdit: () => handleEdit('laborCosts'), onSave: handleSave, onCancel: handleCancel}} />}>
               <table className="w-full text-xs"><thead><tr className="bg-base-200 dark:bg-base-dark-300"><th>作業</th><th>時給</th><th>セットアップ費</th></tr></thead><tbody>{laborCostsData.map((l: DtfLaborCost, i:number) => <tr key={i} className="border-t"><td>{l.name}</td><td><EditableField value={l.cost_per_hour} onChange={v=>handleTempChange('laborCosts','cost_per_hour',v,i)} type="number" disabled={editingSection!=='laborCosts'}/></td><td><EditableField value={l.setup_fee} onChange={v=>handleTempChange('laborCosts','setup_fee',v,i)} type="number" disabled={editingSection!=='laborCosts'}/></td></tr>)}</tbody></table>
            </LogicSection>
            <LogicSection title={<SectionHeader title="電気料金設定" sectionKey="electricity" {...{editingSection, onEdit: () => handleEdit('electricity'), onSave: handleSave, onCancel: handleCancel}} />}>
                {electricityData.map((e: DtfElectricityRate, i:number) => <div key={i} className="text-xs space-y-1"><div>{e.provider}</div><div className="flex gap-2"><span>第2段階:</span><EditableField value={e.tier2_rate} onChange={v=>handleTempChange('electricity','tier2_rate',v,i)} type="number" disabled={editingSection!=='electricity'}/>/kWh</div></div>)}
            </LogicSection>
        </div>
    );
};

export default DtfCostSettings;

import React, { useEffect, useMemo, useState } from 'react';
import { AppData, Database, Row } from '@shared/types';
import { DtfPrinter, DtfPrintSpeed } from '../types';
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

const SectionHeader: React.FC<{ title: string; onEdit: () => void; onSave: () => void; onCancel: () => void; isEditing: boolean; }> = ({ title, onEdit, onSave, onCancel, isEditing }) => {
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

interface DtfPriceSettingsProps {
    appData: AppData;
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
}

const DtfPriceSettings: React.FC<DtfPriceSettingsProps> = ({ appData, database, setDatabase }) => {
    const { currentPage } = useNavigation();
    const [isEditing, setIsEditing] = useState(false);
    
    const [profitMargin, setProfitMargin] = useState(2.0);
    const [roundUp, setRoundUp] = useState(true);
    const [pressTime, setPressTime] = useState(3);
    const [defaultPrinterId, setDefaultPrinterId] = useState<number | ''>('');
    const [defaultSpeedId, setDefaultSpeedId] = useState<number | ''>('');

    const { printers, printSpeeds } = useMemo(() => ({
        printers: (database.dtf_printers?.data as DtfPrinter[]) || [],
        printSpeeds: (database.dtf_print_speeds?.data as DtfPrintSpeed[]) || []
    }), [database]);

    const loadInitialState = () => {
        setProfitMargin(appData.pricing.dtfProfitMargin || 2.0);
        setRoundUp(appData.pricing.dtfRoundUpTo10 ?? true);
        setPressTime(appData.dtfPrintSettings.pressTimeMinutesPerItem);
        const defaultPrinter = printers.find(p => p.is_default);
        if (defaultPrinter) {
            setDefaultPrinterId(defaultPrinter.id);
            const speedsForPrinter = printSpeeds.filter(s => s.printer_id === defaultPrinter.id);
            const defaultSpeed = speedsForPrinter.find(s => s.is_default);
            setDefaultSpeedId(defaultSpeed ? defaultSpeed.id : '');
        }
    };

    useEffect(() => {
        loadInitialState();
    }, [appData, printers, printSpeeds]);
    
    const handleSave = async () => {
        // まずローカル状態を更新
        setDatabase(db => {
            if(!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            
            const updateSetting = (key: string, value: string) => {
                const index = newDb.settings.data.findIndex((r:Row) => r.key === key);
                if(index > -1) newDb.settings.data[index].value = value;
                else newDb.settings.data.push({key, value});
            };

            updateSetting('dtf_profit_margin', String(profitMargin));
            updateSetting('DTF_ROUND_UP_TO_10', String(roundUp));
            updateSetting('dtf_press_time_minutes_per_item', String(pressTime));

            newDb.dtf_printers.data.forEach((p: Row) => { p.is_default = p.id === defaultPrinterId; });
            newDb.dtf_print_speeds.data.forEach((s: Row) => {
                if (s.printer_id === defaultPrinterId) {
                    s.is_default = s.id === defaultSpeedId;
                } else {
                    s.is_default = false;
                }
            });
            
            return newDb;
        });

        // サーバーに保存
        try {
            // settings
            const settingsOperations: any[] = [];
            ['dtf_profit_margin', 'DTF_ROUND_UP_TO_10', 'dtf_press_time_minutes_per_item'].forEach(key => {
                const value = key === 'dtf_profit_margin' ? String(profitMargin)
                    : key === 'DTF_ROUND_UP_TO_10' ? String(roundUp)
                    : String(pressTime);
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
                const settingsResult = await updateDatabase(currentPage, 'settings', settingsOperations, database);
                if (!settingsResult.success) {
                    throw new Error(settingsResult.error || 'Failed to save settings to server');
                }
            }

            // dtf_printers
            const printerOperations = (database.dtf_printers?.data || []).map((p: Row) => ({
                type: 'UPDATE' as const,
                data: { is_default: p.id === defaultPrinterId ? 1 : 0 },
                where: { id: p.id }
            }));
            if (printerOperations.length > 0) {
                const printerResult = await updateDatabase(currentPage, 'dtf_printers', printerOperations, database);
                if (!printerResult.success) {
                    throw new Error(printerResult.error || 'Failed to save printer settings to server');
                }
            }

            // dtf_print_speeds
            const speedOperations = (database.dtf_print_speeds?.data || []).map((s: Row) => ({
                type: 'UPDATE' as const,
                data: { is_default: (s.printer_id === defaultPrinterId && s.id === defaultSpeedId) ? 1 : 0 },
                where: { id: s.id }
            }));
            if (speedOperations.length > 0) {
                const speedResult = await updateDatabase(currentPage, 'dtf_print_speeds', speedOperations, database);
                if (!speedResult.success) {
                    throw new Error(speedResult.error || 'Failed to save speed settings to server');
                }
            }

            setIsEditing(false);
            alert('価格・デフォルト設定を保存しました。');
        } catch (error) {
            console.error('[DtfPriceSettings] Failed to save to server:', error);
            alert('サーバーへの保存に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
        }
    };
    
    const handleCancel = () => {
        setIsEditing(false);
        loadInitialState();
    };
    
    const availableSpeedsForSelectedPrinter = printSpeeds.filter(s => s.printer_id === defaultPrinterId);

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <LogicSection title={
                <SectionHeader 
                    title="価格・デフォルト設定"
                    isEditing={isEditing}
                    onEdit={() => setIsEditing(true)}
                    onSave={handleSave}
                    onCancel={handleCancel}
                />
            }>
                <div className="space-y-4 text-sm">
                    <div className="flex justify-between items-center">
                        <label htmlFor="dtf-profit-margin">利益率（掛率）</label>
                        {isEditing ? <EditableField id="dtf-profit-margin" name="profit_margin" type="number" value={profitMargin} onChange={v => setProfitMargin(Number(v))} className="w-24 text-right"/> : <span className="font-semibold">{profitMargin}</span>}
                    </div>
                    <div className="flex justify-between items-center">
                        <label htmlFor="dtf-round-up">単価を10の倍数に切り上げる</label>
                        {isEditing ? <input id="dtf-round-up" name="round_up" type="checkbox" checked={roundUp} onChange={e => setRoundUp(e.target.checked)} className="h-4 w-4"/> : <span className="font-semibold">{roundUp ? 'はい' : 'いいえ'}</span>}
                    </div>
                    <div className="flex justify-between items-center">
                        <label htmlFor="dtf-press-time">1アイテムあたりのプレス時間（分）</label>
                        {isEditing ? <EditableField id="dtf-press-time" name="press_time" type="number" value={pressTime} onChange={v => setPressTime(Number(v))} className="w-24 text-right"/> : <span className="font-semibold">{pressTime} 分</span>}
                    </div>
                    <div className="flex justify-between items-center">
                        <label htmlFor="dtf-default-printer-select">デフォルトプリンター</label>
                        {isEditing ? (
                            <select id="dtf-default-printer-select" name="default_printer_id" value={defaultPrinterId} onChange={e => { setDefaultPrinterId(Number(e.target.value)); setDefaultSpeedId(''); }} className="p-1 border rounded w-48 bg-input-bg dark:bg-input-bg-dark">
                                {printers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        ) : <span className="font-semibold">{printers.find(p => p.id === defaultPrinterId)?.name || '未設定'}</span>}
                    </div>
                     <div className="flex justify-between items-center">
                        <label htmlFor="dtf-default-speed-select">デフォルト印刷速度</label>
                        {isEditing ? (
                            <select id="dtf-default-speed-select" name="default_speed_id" value={defaultSpeedId} onChange={e => setDefaultSpeedId(Number(e.target.value))} className="p-1 border rounded w-48 bg-input-bg dark:bg-input-bg-dark" disabled={!defaultPrinterId}>
                                <option value="">速度を選択...</option>
                                {availableSpeedsForSelectedPrinter.map(s => <option key={s.id} value={s.id}>{s.resolution_dpi} {s.pass_count}pass ({s.notes || '標準'})</option>)}
                            </select>
                        ) : <span className="font-semibold">{printSpeeds.find(s => s.id === defaultSpeedId)?.notes || '未設定'}</span>}
                    </div>
                </div>
            </LogicSection>
        </div>
    );
};

export default DtfPriceSettings;

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Database, Row } from '@shared/types';
import { useNavigation } from '@core/contexts/NavigationContext';
import { updateDatabase } from '@core/utils';

interface ProductionSettingsToolProps {
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
}

const ProductionSettingsTool: React.FC<ProductionSettingsToolProps> = ({ database, setDatabase }) => {
    const { t } = useTranslation('production-settings');
    const { currentPage } = useNavigation();
    const [generalSettings, setGeneralSettings] = useState({
        PRODUCTION_CAPACITY_PER_DAY: '300',
        DAILY_GROSS_PROFIT_TARGET: '50000',
    });
    
    useEffect(() => {
        const settingsMap = new Map(database.settings?.data.map(s => [s.key, s.value]));
        setGeneralSettings({
            PRODUCTION_CAPACITY_PER_DAY: String(settingsMap.get('PRODUCTION_CAPACITY_PER_DAY') || '300'),
            DAILY_GROSS_PROFIT_TARGET: String(settingsMap.get('DAILY_GROSS_PROFIT_TARGET') || '50000'),
        });
    }, [database]);

    const handleGeneralSettingChange = (key: keyof typeof generalSettings, value: string) => {
        setGeneralSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        // まずローカル状態を更新
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            
            // Update general settings
            const settingsToUpdate = Object.entries(generalSettings);
            settingsToUpdate.forEach(([key, value]) => {
                const settingIndex = newDb.settings.data.findIndex((s: Row) => s.key === key);
                if (settingIndex > -1) {
                    newDb.settings.data[settingIndex].value = value;
                } else {
                    newDb.settings.data.push({ key, value });
                }
            });

            return newDb;
        });

        // サーバーに保存
        try {
            const settingsToUpdate = Object.entries(generalSettings);
            const operations = settingsToUpdate.map(([key, value]) => {
                const existing = (database.settings?.data || []).find((s: Row) => s.key === key);
                if (existing) {
                    return {
                        type: 'UPDATE' as const,
                        data: { value },
                        where: { key }
                    };
                } else {
                    return {
                        type: 'INSERT' as const,
                        data: { key, value }
                    };
                }
            });

            if (operations.length > 0) {
                const result = await updateDatabase(currentPage, 'settings', operations, database);
                if (!result.success) {
                    throw new Error(result.error || 'Failed to save production settings to server');
                }
            }
            alert(t('production_settings.save_success', '設定を保存しました。'));
        } catch (error) {
            console.error('[ProductionSettings] Failed to save to server:', error);
            alert(t('production_settings.save_failed', 'サーバーへの保存に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    return (
        <div className="flex flex-col h-full">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">{t('production_settings.title', '生産設定ツール')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('production_settings.description', '生産スケジュールの計算に使用する各種パラメータを設定します。')}</p>
                </div>
                <button onClick={handleSave} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg">
                    {t('production_settings.save', '保存')}
                </button>
            </header>
            
            <div className="flex-grow space-y-6">
                <section className="bg-base-100 dark:bg-base-dark-200 p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4">{t('production_settings.general_settings', '全般設定')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="capacity" className="block text-sm font-medium mb-1">{t('production_settings.capacity_label', '1日の最大生産能力 (枚数)')}</label>
                            <input
                                id="capacity"
                                type="number"
                                value={generalSettings.PRODUCTION_CAPACITY_PER_DAY}
                                onChange={e => handleGeneralSettingChange('PRODUCTION_CAPACITY_PER_DAY', e.target.value)}
                                className="w-full bg-base-200 dark:bg-base-dark-300 p-2 border rounded"
                            />
                        </div>
                        <div>
                            <label htmlFor="profit-target" className="block text-sm font-medium mb-1">{t('production_settings.profit_target_label', '1日の粗利目標 (円)')}</label>
                            <input
                                id="profit-target"
                                type="number"
                                value={generalSettings.DAILY_GROSS_PROFIT_TARGET}
                                onChange={e => handleGeneralSettingChange('DAILY_GROSS_PROFIT_TARGET', e.target.value)}
                                className="w-full bg-base-200 dark:bg-base-dark-300 p-2 border rounded"
                            />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default ProductionSettingsTool;
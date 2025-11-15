import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Database, Row } from '@shared/types';
import { useNavigation } from '@core/contexts/NavigationContext';
import { updateDatabase } from '@core/utils';

interface EstimatorSettingsToolProps {
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
}

const EstimatorSettingsTool: React.FC<EstimatorSettingsToolProps> = ({ database, setDatabase }) => {
    const { t } = useTranslation('estimator-settings');
    const { currentPage } = useNavigation();
    const [settings, setSettings] = useState<Record<string, any>>({});
    const [initialSettings, setInitialSettings] = useState<Record<string, any>>({});

    // FIX: Add explicit type to new Map to avoid type inference issues.
    const settingsMap = useMemo(() => new Map<string, any>(database.settings.data.map(s => [s.key, s.value])), [database.settings]);

    useEffect(() => {
        const currentSettings = {
            defaultBringInMarkup: parseFloat(String(settingsMap.get('DEFAULT_BRING_IN_MARKUP')) || '1.0')
        };
        setSettings(currentSettings);
        setInitialSettings(currentSettings);
    }, [settingsMap]);

    const handleSettingChange = (key: keyof typeof settings, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        const operations: { key: string, value: string }[] = [];
        
        if (settings.defaultBringInMarkup !== initialSettings.defaultBringInMarkup) {
            operations.push({ key: 'DEFAULT_BRING_IN_MARKUP', value: String(settings.defaultBringInMarkup) });
        }

        if (operations.length > 0) {
            // まずローカル状態を更新
            setDatabase(db => {
                if (!db) return null;
                const newDb = JSON.parse(JSON.stringify(db));
                const settingsTable = newDb.settings.data;
                
                operations.forEach(op => {
                    const settingIndex = settingsTable.findIndex((s: Row) => s.key === op.key);
                    if (settingIndex > -1) {
                        settingsTable[settingIndex].value = op.value;
                    } else {
                        settingsTable.push({ key: op.key, value: op.value });
                    }
                });
                return newDb;
            });

            // サーバーに保存
            try {
                const dbOperations = operations.map(op => {
                    const existing = (database.settings?.data || []).find((s: Row) => s.key === op.key);
                    if (existing) {
                        return {
                            type: 'UPDATE' as const,
                            data: { value: op.value },
                            where: { key: op.key }
                        };
                    } else {
                        return {
                            type: 'INSERT' as const,
                            data: { key: op.key, value: op.value }
                        };
                    }
                });

                if (dbOperations.length > 0) {
                    const result = await updateDatabase(currentPage, 'settings', dbOperations, database);
                    if (!result.success) {
                        throw new Error(result.error || 'Failed to save estimator settings to server');
                    }
                }
                alert(t('estimator_settings.save_success', '設定を保存しました。'));
                setInitialSettings(settings);
            } catch (error) {
                console.error('[EstimatorSettings] Failed to save to server:', error);
                alert(t('estimator_settings.save_failed', 'サーバーへの保存に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
            }
        }
    };
    
    const hasChanges = useMemo(() => JSON.stringify(settings) !== JSON.stringify(initialSettings), [settings, initialSettings]);

    return (
        <div className="flex flex-col h-full">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">{t('estimator_settings.title', '見積作成設定')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('estimator_settings.description', '見積作成ツールの共通的な動作を制御します。')}</p>
                </div>
                <button 
                    onClick={handleSave}
                    disabled={!hasChanges}
                    className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-800 transition-colors disabled:bg-gray-400"
                >
                    {t('estimator_settings.save', '保存')}
                </button>
            </header>

            <div className="flex-grow space-y-6">
                 <div className="bg-base-100 dark:bg-base-dark-200 p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4">{t('estimator_settings.common_pricing', '共通価格設定')}</h2>
                     <div className="space-y-4">
                        <div className="p-4 border rounded-lg">
                             <label htmlFor="bring-in-markup" className="block font-semibold mb-1">{t('estimator_settings.bring_in_markup_label', '持ち込み商品のデフォルト掛率')}</label>
                             <p className="text-sm text-gray-500 mb-2">
                                {t('estimator_settings.bring_in_markup_description', '「持ち込み」モードで見積もりを作成する際の、商品代金に対するデフォルトの掛率です。（例: 1.0 = 仕入値と同額）')}
                            </p>
                             <input
                                type="number"
                                id="bring-in-markup"
                                step="0.01"
                                value={settings.defaultBringInMarkup || 1.0}
                                onChange={e => handleSettingChange('defaultBringInMarkup', parseFloat(e.target.value) || 1.0)}
                                className="w-full max-w-xs bg-base-200 dark:bg-base-dark-300 border-base-300 dark:border-base-dark-300 rounded-md p-2 text-sm"
                            />
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default EstimatorSettingsTool;
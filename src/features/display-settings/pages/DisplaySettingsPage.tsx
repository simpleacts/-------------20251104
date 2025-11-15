import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { useNavigation } from '@core/contexts/NavigationContext';
import { updateDatabase } from '@core/utils';
import { Row } from '@shared/types';
import { Button, SpinnerIcon } from '@components/atoms';
import { useTranslation } from '@shared/hooks/useTranslation';

// Lazy load the setting components
const ColorSettingsTool = lazy(() => import('./ColorSettingsPage'));
const LayoutSettingsTool = lazy(() => import('./LayoutSettingsPage'));
const BehaviorSettingsTool = lazy(() => import('./BehaviorSettingsPage'));
const ToolVisibilitySettingsTool = lazy(() => import('./ToolVisibilitySettingsPage'));


interface DisplaySettingsToolProps {
    onLiveUpdate: (newSettings: Record<string, any>) => void;
    onClearLiveUpdate: () => void;
}

type Tab = 'color' | 'layout' | 'behavior' | 'visibility';

const DisplaySettingsTool: React.FC<DisplaySettingsToolProps> = ({ onLiveUpdate, onClearLiveUpdate }) => {
    const { t } = useTranslation('display-settings');
    
    const TABS: { id: Tab; label: string }[] = [
        { id: 'color', label: t('display_settings.tab_color', '配色設定') },
        { id: 'layout', label: t('display_settings.tab_layout', 'レイアウト設定') },
        { id: 'behavior', label: t('display_settings.tab_behavior', '動作設定') },
        { id: 'visibility', label: t('display_settings.tab_visibility', 'ツール表示設定') },
    ];

const SETTING_TABLES = ['color_settings', 'layout_settings', 'behavior_settings', 'google_fonts'];

// This map helps determine which DB table a setting belongs to.
const SETTING_TO_TABLE_MAP: Record<string, string> = {
    // color_settings
    'UI_THEME': 'color_settings', 'UI_BRAND_COLOR': 'color_settings',
    'UI_APP_BG_COLOR': 'color_settings', 'UI_APP_BG_COLOR_DARK': 'color_settings', 'UI_CONTAINER_BG_COLOR': 'color_settings', 'UI_CONTAINER_BG_COLOR_DARK': 'color_settings',
    'UI_CONTAINER_MUTED_BG_COLOR': 'color_settings', 'UI_CONTAINER_MUTED_BG_COLOR_DARK': 'color_settings', 'UI_INPUT_BG_COLOR': 'color_settings', 'UI_INPUT_BG_COLOR_DARK': 'color_settings',
    'UI_INPUT_FILTER_BG_COLOR': 'color_settings', 'UI_INPUT_FILTER_BG_COLOR_DARK': 'color_settings', 'UI_CARD_BG_COLOR': 'color_settings', 'UI_CARD_BG_COLOR_DARK': 'color_settings',
    'UI_CARD_IMAGE_BG_COLOR': 'color_settings', 'UI_CARD_IMAGE_BG_COLOR_DARK': 'color_settings', 'UI_HOVER_BG_COLOR': 'color_settings', 'UI_HOVER_BG_COLOR_DARK': 'color_settings',
    'UI_SELECTED_BG_COLOR': 'color_settings', 'UI_SELECTED_BG_COLOR_DARK': 'color_settings', 'UI_ACTION_DANGER_COLOR': 'color_settings', 'UI_ACTION_DANGER_COLOR_DARK': 'color_settings',
    'UI_FONT_COLOR': 'color_settings', 'UI_FONT_COLOR_DARK': 'color_settings', 'UI_TEXT_MUTED_COLOR': 'color_settings', 'UI_TEXT_MUTED_COLOR_DARK': 'color_settings',
    'UI_TEXT_LINK_COLOR': 'color_settings', 'UI_TEXT_LINK_COLOR_DARK': 'color_settings', 'UI_STATUS_SUCCESS_BG_COLOR': 'color_settings', 'UI_STATUS_SUCCESS_BG_COLOR_DARK': 'color_settings',
    'UI_STATUS_SUCCESS_TEXT_COLOR': 'color_settings', 'UI_STATUS_SUCCESS_TEXT_COLOR_DARK': 'color_settings', 'UI_STATUS_INFO_BG_COLOR': 'color_settings', 'UI_STATUS_INFO_BG_COLOR_DARK': 'color_settings',
    'UI_STATUS_INFO_TEXT_COLOR': 'color_settings', 'UI_STATUS_INFO_TEXT_COLOR_DARK': 'color_settings', 'UI_STATUS_WARNING_BG_COLOR': 'color_settings', 'UI_STATUS_WARNING_BG_COLOR_DARK': 'color_settings',
    'UI_STATUS_WARNING_TEXT_COLOR': 'color_settings', 'UI_STATUS_WARNING_TEXT_COLOR_DARK': 'color_settings', 'UI_STATUS_DANGER_BG_COLOR': 'color_settings', 'UI_STATUS_DANGER_BG_COLOR_DARK': 'color_settings',
    'UI_STATUS_DANGER_TEXT_COLOR': 'color_settings', 'UI_STATUS_DANGER_TEXT_COLOR_DARK': 'color_settings', 'UI_BUTTON_PRIMARY_BG_COLOR': 'color_settings', 'UI_BUTTON_PRIMARY_BG_COLOR_DARK': 'color_settings',
    'UI_BUTTON_PRIMARY_TEXT_COLOR': 'color_settings', 'UI_BUTTON_PRIMARY_TEXT_COLOR_DARK': 'color_settings', 'UI_BUTTON_MUTED_BG_COLOR': 'color_settings', 'UI_BUTTON_MUTED_BG_COLOR_DARK': 'color_settings',
    'UI_BUTTON_MUTED_TEXT_COLOR': 'color_settings', 'UI_BUTTON_MUTED_TEXT_COLOR_DARK': 'color_settings', 'UI_BORDER_COLOR': 'color_settings', 'UI_BORDER_COLOR_DARK': 'color_settings',
    'UI_PDF_PREVIEW_BG_COLOR': 'color_settings', 'UI_PDF_PREVIEW_BG_COLOR_DARK': 'color_settings', 'UI_INNER_BLOCK_BG_COLOR': 'color_settings', 'UI_INNER_BLOCK_BG_COLOR_DARK': 'color_settings',
    'UI_WORKSHEET_BG_COLOR': 'color_settings', 'UI_WORKSHEET_BG_COLOR_DARK': 'color_settings', 'UI_WORKSHEET_TEXT_COLOR': 'color_settings', 'UI_WORKSHEET_TEXT_COLOR_DARK': 'color_settings',
    'UI_WORKSHEET_BORDER_COLOR': 'color_settings', 'UI_WORKSHEET_BORDER_COLOR_DARK': 'color_settings', 'UI_WORKSHEET_HEADER_BG_COLOR': 'color_settings', 'UI_WORKSHEET_HEADER_BG_COLOR_DARK': 'color_settings',
    'UI_WORKSHEET_TOTAL_BG_COLOR': 'color_settings', 'UI_WORKSHEET_TOTAL_BG_COLOR_DARK': 'color_settings',
    // layout_settings
    'UI_FONT_SIZE_PC': 'layout_settings', 'UI_FONT_SIZE_TABLET': 'layout_settings', 'UI_FONT_SIZE_MOBILE': 'layout_settings', 
    'UI_FONT_FAMILY': 'layout_settings', 'UI_BORDER_RADIUS': 'layout_settings', 'UI_ANIMATION_SPEED': 'layout_settings',
    // behavior_settings
    'UI_REDUCE_MOTION': 'behavior_settings', 'BEHAVIOR_SKIP_DELETE_CONFIRM': 'behavior_settings', 'UI_COMMAND_PALETTE_ENABLED': 'behavior_settings',
    'UI_TOOLTIP_ENABLED': 'behavior_settings', 'UI_TOOLTIP_DELAY': 'behavior_settings'
};

    const { database, setDatabase } = useDatabase();
    const { currentPage } = useNavigation();
    const [activeTab, setActiveTab] = useState<Tab>('color');

    const [settings, setSettings] = useState<Record<string, any>>({});
    const [initialSettings, setInitialSettings] = useState<Record<string, any>>({});
    
    const allSettingsData = useMemo(() => {
        return SETTING_TABLES.flatMap(tableName => database?.[tableName]?.data || []);
    }, [database]);

    useEffect(() => {
        const loadedSettings = allSettingsData.reduce((acc, s) => {
            if (s.key && typeof s.key === 'string' && !s.key.startsWith('DEFAULT_')) {
                acc[s.key] = s.value;
            }
            return acc;
        }, {} as Record<string, any>);

        setSettings(loadedSettings);
        setInitialSettings(loadedSettings);
        
        return () => {
            onClearLiveUpdate();
        };
    }, [allSettingsData, onClearLiveUpdate]);

    const handleSettingChange = useCallback((key: string, value: any) => {
        setSettings(prev => {
            const newSettings = { ...prev, [key]: value };
            onLiveUpdate(newSettings);
            return newSettings;
        });
    }, [onLiveUpdate]);
    
    const handleSave = async () => {
        const changesByTable: Record<string, { key: string, value: any }[]> = {};

        Object.keys(settings).forEach(key => {
            if (settings[key] !== initialSettings[key]) {
                const tableName = SETTING_TO_TABLE_MAP[key];
                if (tableName) {
                    if (!changesByTable[tableName]) {
                        changesByTable[tableName] = [];
                    }
                    changesByTable[tableName].push({ key, value: settings[key] });
                }
            }
        });

        if (Object.keys(changesByTable).length > 0) {
            // まずローカル状態を更新
            setDatabase(db => {
                if (!db) return null;
                const newDb = JSON.parse(JSON.stringify(db));
                Object.entries(changesByTable).forEach(([tableName, changes]) => {
                    const tableData = newDb[tableName].data;
                    changes.forEach(change => {
                        const settingIndex = tableData.findIndex((s: Row) => s.key === change.key);
                        if (settingIndex > -1) {
                            tableData[settingIndex].value = change.value;
                        } else {
                            tableData.push({ key: change.key, value: change.value });
                        }
                    });
                });
                return newDb;
            });

            // サーバーに保存
            try {
                for (const [tableName, changes] of Object.entries(changesByTable)) {
                    const operations = changes.map(change => {
                        const existing = (database[tableName]?.data || []).find((s: Row) => s.key === change.key);
                        if (existing) {
                            return { type: 'UPDATE' as const, data: { value: change.value }, where: { key: change.key } };
                        } else {
                            return { type: 'INSERT' as const, data: { key: change.key, value: change.value } };
                        }
                    });

                    if (operations.length > 0) {
                        const result = await updateDatabase(currentPage, tableName, operations, database);
                        if (!result.success) {
                            throw new Error(result.error || `Failed to save ${tableName} to server`);
                        }
                    }
                }
                alert(t('display_settings.saved', '表示設定を保存しました。'));
                setInitialSettings(settings);
            } catch (error) {
                console.error('[DisplaySettings] Failed to save to server:', error);
                alert(t('display_settings.save_failed', 'サーバーへの保存に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
            }
        }
    };

    const handleSaveAsDefault = () => {
        if (!window.confirm(t('display_settings.save_as_default_confirm', '現在の設定を全ユーザーのデフォルトとして保存しますか？既存のデフォルト設定は上書きされます。'))) return;

        const changesByTable: Record<string, { key: string, value: any }[]> = {};

        Object.keys(settings).forEach(key => {
            const tableName = SETTING_TO_TABLE_MAP[key];
            if (tableName) {
                if (!changesByTable[tableName]) changesByTable[tableName] = [];
                changesByTable[tableName].push({ key: `DEFAULT_${key}`, value: settings[key] });
            }
        });
        
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            Object.entries(changesByTable).forEach(([tableName, changes]) => {
                const tableData = newDb[tableName].data;
                changes.forEach(change => {
                    const settingIndex = tableData.findIndex((s: Row) => s.key === change.key);
                    if (settingIndex > -1) {
                        tableData[settingIndex].value = change.value;
                    } else {
                        tableData.push({ key: change.key, value: change.value });
                    }
                });
            });
            return newDb;
        });
        alert(t('display_settings.save_as_default_success', '現在の設定をデフォルトとして保存しました。'));
    };

    const handleResetToDefault = () => {
        if (!window.confirm(t('display_settings.reset_confirm', '現在の設定をデフォルトに戻しますか？保存されていない変更は失われます。'))) return;

        const defaultSettings: Record<string, any> = {};
        allSettingsData.forEach(s => {
            if (s.key && typeof s.key === 'string' && s.key.startsWith('DEFAULT_')) {
                const originalKey = s.key.replace('DEFAULT_', '');
                defaultSettings[originalKey] = s.value;
            }
        });
        
        const newSettings = { ...settings, ...defaultSettings };
        setSettings(newSettings);
        onLiveUpdate(newSettings);
    };

    const hasChanges = useMemo(() => JSON.stringify(settings) !== JSON.stringify(initialSettings), [settings, initialSettings]);

    const renderActiveTab = () => {
        const props = { settings, handleSettingChange };
        switch (activeTab) {
            case 'color': return <ColorSettingsTool {...props} />;
            case 'layout': return <LayoutSettingsTool {...props} database={database} />;
            case 'behavior': return <BehaviorSettingsTool {...props} />;
            case 'visibility': return <ToolVisibilitySettingsTool />;
            default: return null;
        }
    };

    const getTabClass = (tabId: Tab) =>
        `py-3 px-4 border-b-2 font-medium text-sm transition-colors focus:outline-none ${
            activeTab === tabId
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
        }`;

    return (
        <div className="flex flex-col h-full">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">{t('display_settings.title', '表示設定')}</h1>
                    <p className="text-gray-500 mt-1">{t('display_settings.description', 'アプリケーションの配色、表示密度、フォントサイズなどの外観をカスタマイズします。')}</p>
                </div>
                <div className="flex items-center gap-3">
                    {hasChanges && <span className="text-sm text-yellow-600 animate-pulse">{t('display_settings.unsaved_changes', '未保存の変更があります')}</span>}
                    <Button variant="secondary" onClick={handleResetToDefault}>{t('display_settings.reset_to_default', 'デフォルトに戻す')}</Button>
                    <Button variant="secondary" onClick={handleSaveAsDefault}>{t('display_settings.save_as_default', 'デフォルトとして保存')}</Button>
                    <Button onClick={handleSave} disabled={!hasChanges}>{t('display_settings.save', '保存')}</Button>
                </div>
            </header>
            
            <div className="border-b border-default dark:border-default-dark mb-6">
                <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={getTabClass(tab.id)}>
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>
            
            <Suspense fallback={<div className="flex-grow flex items-center justify-center"><SpinnerIcon className="w-10 h-10" /></div>}>
                <div className="flex-grow overflow-y-auto">
                    {renderActiveTab()}
                </div>
            </Suspense>
        </div>
    );
};

export default DisplaySettingsTool;
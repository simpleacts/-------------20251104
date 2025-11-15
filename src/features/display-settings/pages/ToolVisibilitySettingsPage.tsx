import React, { useEffect, useMemo, useState, useRef } from 'react';
import { ALL_TOOLS, Page } from '@core/config/Routes';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { useNavigation } from '@core/contexts/NavigationContext';
import { updateDatabase } from '@core/utils';
import { ToolVisibility, Row } from '@shared/types';
import { Button } from '@components/atoms';
import { SettingsCard } from '@components/molecules';
import { useTranslation } from '@shared/hooks/useTranslation';
import { getToolTranslationKey } from '@core/config/getToolDisplayName';
import { COMMON_LANGUAGE_TABLE } from '@shared/utils/languageUtils';
import ToolVisibilityTable from '../organisms/ToolVisibilityTable';

const ToolVisibilitySettingsTool: React.FC = () => {
    const { database, setDatabase } = useDatabase();
    const { currentPage } = useNavigation();
    const { t } = useTranslation('display-settings');
    const [toolVisibility, setToolVisibility] = useState<ToolVisibility[]>([]);
    const [initialToolVisibility, setInitialToolVisibility] = useState<ToolVisibility[]>([]);
    const isSavingRef = useRef(false);
    
    // ツール名の翻訳を取得
    const toolDisplayNames = useMemo(() => {
        const map = new Map<Page, string>();
        const languageTable = database[COMMON_LANGUAGE_TABLE] as { data: Row[] } | undefined;
        const translations = new Map<string, string>();
        if (languageTable?.data) {
            languageTable.data.forEach((row: Row) => {
                const key = row.key as string;
                if (key && key.startsWith('tools.')) {
                    const value = row.ja as string;
                    if (value) {
                        translations.set(key, value);
                    }
                }
            });
        }
        ALL_TOOLS.forEach(tool => {
            const key = getToolTranslationKey(tool.name);
            map.set(tool.name, translations.get(key) || tool.displayName);
        });
        return map;
    }, [database]);

    useEffect(() => {
        // 保存中は更新しない
        if (isSavingRef.current) {
            return;
        }
        
        if (database?.tool_visibility_settings) {
            const settings = (database.tool_visibility_settings.data as ToolVisibility[]) || [];
            // 初期状態のみ更新（保存後の再読み込みを防ぐ）
            if (initialToolVisibility.length === 0) {
                setToolVisibility(settings);
                setInitialToolVisibility(settings);
            } else {
                // 保存後の再読み込みを防ぐ：現在の状態と異なる場合のみ更新
                const currentSettingsStr = JSON.stringify(settings);
                const currentVisibilityStr = JSON.stringify(toolVisibility);
                if (currentSettingsStr !== currentVisibilityStr && currentSettingsStr !== JSON.stringify(initialToolVisibility)) {
                    setToolVisibility(settings);
                    setInitialToolVisibility(settings);
                }
            }
        }
    }, [database?.tool_visibility_settings, initialToolVisibility.length]);

    const handleVisibilityChange = (toolName: string, device: 'desktop' | 'tablet' | 'mobile', isVisible: boolean) => {
        setToolVisibility(prev => {
            const newVisibility = [...prev];
            const index = newVisibility.findIndex(v => v.tool_name === toolName && v.device_type === device);
            if (index > -1) {
                newVisibility[index] = { ...newVisibility[index], is_visible: isVisible };
            } else {
                newVisibility.push({ tool_name: toolName, device_type: device, is_visible: isVisible } as ToolVisibility);
            }
            return newVisibility;
        });
    };

    const handleToggleAllVisibility = (device: 'desktop' | 'tablet' | 'mobile', isVisible: boolean) => {
        let newVisibility = [...toolVisibility];
        ALL_TOOLS.forEach(tool => {
            const index = newVisibility.findIndex(v => v.tool_name === tool.name && v.device_type === device);
            if (index > -1) {
                newVisibility[index] = { ...newVisibility[index], is_visible: isVisible };
            } else {
                newVisibility.push({ tool_name: tool.name, device_type: device, is_visible: isVisible } as ToolVisibility);
            }
        });
        setToolVisibility(newVisibility);
    };

    const handleSave = async () => {
        isSavingRef.current = true;
        try {
            // tool_visibility_settingsの主キーは(tool_name, device_type)なので、それを使用して削除
            const existingSettings = (database.tool_visibility_settings?.data || []) as ToolVisibility[];
            const operations = [
                // 既存の設定を削除（主キーを使用）
                ...existingSettings.map(vis => ({ 
                    type: 'DELETE' as const, 
                    where: { tool_name: vis.tool_name, device_type: vis.device_type } 
                })),
                // 新しい設定を挿入
                ...toolVisibility.map(vis => ({ 
                    type: 'INSERT' as const, 
                    data: {
                        tool_name: vis.tool_name,
                        device_type: vis.device_type,
                        is_visible: vis.is_visible
                    }
                }))
            ];

            if (operations.length > 0) {
                console.log('[ToolVisibilitySettings] Saving operations:', {
                    deleteCount: operations.filter(op => op.type === 'DELETE').length,
                    insertCount: operations.filter(op => op.type === 'INSERT').length,
                    totalOperations: operations.length
                });
                const result = await updateDatabase(currentPage, 'tool_visibility_settings', operations, database);
                if (!result.success) {
                    console.error('[ToolVisibilitySettings] Save failed:', result.error);
                    throw new Error(result.error || 'Failed to save tool visibility settings to server');
                }
                console.log('[ToolVisibilitySettings] Save successful');
            }

            // 保存成功後、データベースから再読み込みして最新の状態を取得
            try {
                console.log('[ToolVisibilitySettings] Refreshing from database...');
                const { fetchTables } = await import('../../../core/data/db.live');
                const refreshedData = await fetchTables(['tool_visibility_settings']);
                if (refreshedData.tool_visibility_settings) {
                    const refreshedSettings = (refreshedData.tool_visibility_settings.data as ToolVisibility[]) || [];
                    console.log('[ToolVisibilitySettings] Refreshed data from database:', {
                        count: refreshedSettings.length,
                        settings: refreshedSettings.slice(0, 5) // 最初の5件のみログ出力
                    });
                    // データベースから取得した最新データで状態を更新
                    setDatabase(db => {
                        if (!db) return null;
                        const newDb = JSON.parse(JSON.stringify(db));
                        newDb.tool_visibility_settings = refreshedData.tool_visibility_settings;
                        return newDb;
                    });
                    setToolVisibility(refreshedSettings);
                    setInitialToolVisibility(refreshedSettings);
                } else {
                    console.warn('[ToolVisibilitySettings] No data returned from database refresh');
                    // 再読み込みに失敗した場合は、ローカル状態を更新
                    setDatabase(db => {
                        if (!db) return null;
                        const newDb = JSON.parse(JSON.stringify(db));
                        if (!newDb.tool_visibility_settings) {
                            newDb.tool_visibility_settings = { schema: [], data: [] };
                        }
                        newDb.tool_visibility_settings.data = toolVisibility;
                        return newDb;
                    });
                    setInitialToolVisibility(toolVisibility);
                }
            } catch (refreshError) {
                console.error('[ToolVisibilitySettings] Failed to refresh from database:', refreshError);
                // 再読み込みに失敗した場合は、ローカル状態を更新
                setDatabase(db => {
                    if (!db) return null;
                    const newDb = JSON.parse(JSON.stringify(db));
                    if (!newDb.tool_visibility_settings) {
                        newDb.tool_visibility_settings = { schema: [], data: [] };
                    }
                    newDb.tool_visibility_settings.data = toolVisibility;
                    return newDb;
                });
                setInitialToolVisibility(toolVisibility);
            }

            alert(t('tool_visibility.saved', 'ツール表示設定を保存しました。'));
        } catch (error) {
            console.error('[ToolVisibilitySettings] Failed to save to server:', error);
            alert(t('tool_visibility.save_failed', 'サーバーへの保存に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
        } finally {
            isSavingRef.current = false;
        }
    };
    
    const hasChanges = useMemo(() => JSON.stringify(toolVisibility) !== JSON.stringify(initialToolVisibility), [toolVisibility, initialToolVisibility]);

    // 翻訳されたツール名を使用
    const toolsWithTranslations = useMemo(() => {
        return ALL_TOOLS.map(tool => ({
            ...tool,
            displayName: toolDisplayNames.get(tool.name) || tool.displayName
        }));
    }, [toolDisplayNames]);

    const handleShowAll = () => {
        // すべてのツールをすべてのデバイスで表示にする
        const devices: ('desktop' | 'tablet' | 'mobile')[] = ['desktop', 'tablet', 'mobile'];
        let newVisibility = [...toolVisibility];
        
        ALL_TOOLS.forEach(tool => {
            devices.forEach(device => {
                const index = newVisibility.findIndex(v => v.tool_name === tool.name && v.device_type === device);
                if (index > -1) {
                    newVisibility[index] = { ...newVisibility[index], is_visible: true };
                } else {
                    newVisibility.push({ tool_name: tool.name, device_type: device, is_visible: true } as ToolVisibility);
                }
            });
        });
        
        setToolVisibility(newVisibility);
    };

    return (
        <SettingsCard title={t('tool_visibility.title', 'ツール表示管理')}>
            <div className="flex justify-between items-center mb-4">
                <Button onClick={handleShowAll} variant="secondary" size="sm">
                    {t('tool_visibility.show_all', 'すべて表示にする')}
                </Button>
                <div className="flex items-center gap-3">
                    {hasChanges && <span className="text-sm text-yellow-600 animate-pulse">{t('tool_visibility.unsaved_changes', '未保存の変更があります')}</span>}
                    <Button onClick={handleSave} disabled={!hasChanges}>{t('tool_visibility.save', '保存')}</Button>
                </div>
            </div>
            <p className="text-sm text-muted dark:text-muted-dark -mt-2 mb-4">{t('tool_visibility.description', 'デバイス（画面幅）ごとに、サイドバーに表示するツールを制御します。')}</p>
            <ToolVisibilityTable
                tools={toolsWithTranslations}
                visibilitySettings={toolVisibility}
                onVisibilityChange={handleVisibilityChange}
                onToggleAllVisibility={handleToggleAllVisibility}
            />
        </SettingsCard>
    );
};

export default ToolVisibilitySettingsTool;
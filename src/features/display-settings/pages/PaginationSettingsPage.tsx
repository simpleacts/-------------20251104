
import React, { useEffect, useMemo, useState } from 'react';
import { Row } from '@shared/types';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { useNavigation } from '@core/contexts/NavigationContext';
import { fetchTables } from '@core/data/db.live';
import { updateDatabase } from '@core/utils';
import { useCategorizedTables } from '@shared/hooks/useCategorizedTables';
import { Button } from '@components/atoms';
import { SettingsCard } from '@components/molecules';
import PaginationSettingsTable from '../organisms/PaginationSettingsTable';

const PaginationSettingsTool: React.FC = () => {
    const { database, setDatabase } = useDatabase();
    const { currentPage } = useNavigation();
    const [settings, setSettings] = useState<Row[]>([]);
    const [initialSettings, setInitialSettings] = useState<Row[]>([]);

    // FIX: Retrieve TABLE_DISPLAY_NAMES from the hook.
    const { TABLE_DISPLAY_NAMES } = useCategorizedTables();

    // pagination_settingsのデータをsettingsに反映（初回のみ）
    // 注意: pagination_settingsはuseAppSettingsで必要に応じて読み込まれるため、
    // 通常は既に読み込まれている。存在しない場合のみフォールバックとして読み込む
    const hasInitializedRef = React.useRef(false);
    
    useEffect(() => {
        // 既に初期化済みの場合はスキップ
        if (hasInitializedRef.current) return;
        
        // databaseがまだ初期化されていない場合は待機
        if (!database) return;
        
        // 初期化フラグを設定（無限ループを防ぐ）
        hasInitializedRef.current = true;
        
        // pagination_settingsが既に存在する場合は読み込み済み
        if (database.pagination_settings?.data) {
            const dbSettings = database.pagination_settings.data || [];
            setSettings(dbSettings);
            setInitialSettings(dbSettings);
            return;
        }
        
        // pagination_settingsが存在しない場合のみ読み込む（フォールバック）
        // 通常はuseAppSettingsで読み込まれているため、この処理は実行されないことが多い
        const loadPaginationSettings = async () => {
            try {
                const data = await fetchTables(['pagination_settings'], { toolName: 'display-settings' });
                if (data.pagination_settings?.data) {
                    const loadedData = data.pagination_settings.data || [];
                    setDatabase(prev => ({ ...(prev || {}), ...data }));
                    setSettings(loadedData);
                    setInitialSettings(loadedData);
                } else {
                    // 空のテーブルを作成
                    const emptyTable = { schema: [], data: [] };
                    setDatabase(prev => ({
                        ...(prev || {}),
                        pagination_settings: emptyTable
                    }));
                    setSettings([]);
                    setInitialSettings([]);
                }
            } catch (error) {
                console.error('[PaginationSettings] Failed to load pagination_settings:', error);
                // エラー時も空のテーブルを作成して続行
                const emptyTable = { schema: [], data: [] };
                setDatabase(prev => ({
                    ...(prev || {}),
                    pagination_settings: emptyTable
                }));
                setSettings([]);
                setInitialSettings([]);
            }
        };
        
        loadPaginationSettings();
    }, [database, setDatabase]);

    const allTables = useMemo(() => database ? Object.keys(database).filter(key => TABLE_DISPLAY_NAMES[key]).sort() : [], [database, TABLE_DISPLAY_NAMES]);
    const settingsMap = useMemo(() => {
        const map = new Map(settings.map(s => [s.target, s]));
        return map;
    }, [settings]);

    const handleUpdate = (tableName: string, updates: Partial<Row>) => {
        setSettings(prev => {
            const newSettings = [...prev];
            const index = newSettings.findIndex(s => s.target === tableName);
            if (index > -1) {
                newSettings[index] = { ...newSettings[index], ...updates };
            } else {
                newSettings.push({ 
                    id: `pconf_${Date.now()}`, target: tableName, enabled: true,
                    items_per_page_pc: 30, items_per_page_tablet: 30, items_per_page_mobile: 30,
                    ...updates 
                });
            }
            return newSettings;
        });
    };

    // すべて選択/解除
    const handleToggleAll = (checked: boolean) => {
        setSettings(prev => {
            const newSettings = [...prev];
            allTables.forEach(tableName => {
                const index = newSettings.findIndex(s => s.target === tableName);
                if (index > -1) {
                    newSettings[index] = { ...newSettings[index], enabled: checked };
                } else {
                    newSettings.push({ 
                        id: `pconf_${Date.now()}`, target: tableName, enabled: checked,
                        items_per_page_pc: 30, items_per_page_tablet: 30, items_per_page_mobile: 30
                    });
                }
            });
            return newSettings;
        });
    };

    // 一括変更
    const handleBulkUpdate = (field: 'items_per_page_pc' | 'items_per_page_tablet' | 'items_per_page_mobile', value: number) => {
        setSettings(prev => {
            const newSettings = [...prev];
            allTables.forEach(tableName => {
                const index = newSettings.findIndex(s => s.target === tableName);
                if (index > -1) {
                    newSettings[index] = { ...newSettings[index], [field]: value };
                } else {
                    newSettings.push({ 
                        id: `pconf_${Date.now()}`, target: tableName, enabled: true,
                        items_per_page_pc: 30, items_per_page_tablet: 30, items_per_page_mobile: 30,
                        [field]: value
                    });
                }
            });
            return newSettings;
        });
    };
    
    const handleSave = async () => {
        if (!database) {
            alert('データベースが初期化されていません。');
            return;
        }

        // まずローカル状態を更新
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            // pagination_settingsテーブルが存在しない場合は作成
            if (!newDb.pagination_settings) {
                newDb.pagination_settings = { schema: [], data: [] };
            }
            newDb.pagination_settings.data = settings;
            return newDb;
        });

        // サーバーに保存（全データを置き換え）
        try {
            const existingIds = (database.pagination_settings?.data || []).map((s: Row) => s.id);
            const operations = [
                ...existingIds.map(id => ({ type: 'DELETE' as const, where: { id } })),
                ...settings.map(setting => ({ type: 'INSERT' as const, data: setting }))
            ];

            if (operations.length > 0) {
                const result = await updateDatabase(currentPage, 'pagination_settings', operations, database);
                if (!result.success) {
                    throw new Error(result.error || 'Failed to save pagination settings to server');
                }
                // 保存成功後、データベースを再読み込みして最新の状態を反映
                let reloadSuccess = false;
                try {
                    const updatedData = await fetchTables(['pagination_settings'], { toolName: 'display-settings' });
                    if (updatedData.pagination_settings) {
                        const reloadedData = updatedData.pagination_settings.data || [];
                        console.log('[PaginationSettings] Reloaded', reloadedData.length, 'settings after save');
                        setDatabase(prev => ({ ...(prev || {}), ...updatedData }));
                        // settingsも直接更新
                        setSettings(reloadedData);
                        setInitialSettings(reloadedData);
                        reloadSuccess = true;
                    }
                } catch (reloadError) {
                    console.warn('[PaginationSettings] Failed to reload after save:', reloadError);
                    // 再読み込みに失敗しても保存は成功しているので続行
                }
                
                // 再読み込みが失敗した場合は、現在のsettingsを初期値として設定
                if (!reloadSuccess) {
                    setInitialSettings(settings);
                }
            } else {
                // operationsが空の場合は、現在のsettingsを初期値として設定
                setInitialSettings(settings);
            }
            alert('ページネーション設定を保存しました。');
        } catch (error) {
            console.error('[PaginationSettings] Failed to save to server:', error);
            alert('サーバーへの保存に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    const hasChanges = useMemo(() => JSON.stringify(settings) !== JSON.stringify(initialSettings), [settings, initialSettings]);

    // すべて有効かチェック
    const allEnabled = useMemo(() => {
        return allTables.every(tableName => {
            const config = settingsMap.get(tableName);
            return config && config.enabled === true;
        });
    }, [allTables, settingsMap]);

    return (
        <SettingsCard title="ページネーション設定">
            <div className="flex justify-end mb-4 items-center gap-3">
                {hasChanges && <span className="text-sm text-yellow-600 animate-pulse">未保存の変更があります</span>}
                <Button onClick={handleSave} disabled={!hasChanges}>保存</Button>
            </div>
            <p className="text-sm text-muted dark:text-muted-dark -mt-2 mb-4">
                テーブル一覧の表示にページネーションを適用し、表示件数を設定します。
            </p>
            <PaginationSettingsTable 
                allTables={allTables}
                settingsMap={settingsMap}
                handleUpdate={handleUpdate}
                handleToggleAll={handleToggleAll}
                handleBulkUpdate={handleBulkUpdate}
                allEnabled={allEnabled}
            />
        </SettingsCard>
    );
};

export default PaginationSettingsTool;

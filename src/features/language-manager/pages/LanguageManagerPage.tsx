import React, { useEffect, useMemo, useState } from 'react';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { useNavigation } from '@core/contexts/NavigationContext';
import { fetchTables } from '@core/data/db.live';
import { updateDatabase } from '@core/utils';
import { getStoredAppMode, isCsvWritableMode } from '@core/utils/appMode';
import { saveTableToCsv } from '@core/utils/csvSaveHelper';
import { useTranslation } from '@shared/hooks/useTranslation';
import { generateTranslations } from '@shared/services/geminiService';
import { Column, Database, Row } from '@shared/types';
import { Button, SparklesIcon, Select, Spinner } from '@components/atoms';
import DataTable from '@components/organisms/DataTable';
import { COMMON_LANGUAGE_TABLE } from '@shared/utils/languageUtils';

// 既知の言語設定テーブル名の一覧（データベースから動的に取得できない場合のフォールバック）
const KNOWN_LANGUAGE_TABLES = [
    COMMON_LANGUAGE_TABLE,
    'language_settings_customer_management',
    'language_settings_order_management',
    'language_settings_product_management',
    'language_settings_user_manager',
    'language_settings_language_manager',
    'language_settings_accounting',
    'language_settings_ai_task_management',
    'language_settings_app_management',
    'language_settings_architecture',
    'language_settings_backup_manager',
    'language_settings_data_io',
    'language_settings_dev_lock_manager',
    'language_settings_dev_tools',
    'language_settings_display_settings',
    'language_settings_document',
    'language_settings_estimator_settings',
    'language_settings_google_api_settings',
    'language_settings_hub',
    'language_settings_id_manager',
    'language_settings_image_batch_linker',
    'language_settings_image_file_name_converter',
    'language_settings_inventory_management',
    'language_settings_module_catalog',
    'language_settings_pdf_item_group_manager',
    'language_settings_pdf_preview_settings',
    'language_settings_pdf_template_manager',
    'language_settings_php_info_viewer',
    'language_settings_pricing_management',
    'language_settings_product_definition',
    'language_settings_production_settings',
    'language_settings_shipping_logic_tool',
    'language_settings_silkscreen',
    'language_settings_system_diagnostics',
    'language_settings_system_logs',
    'language_settings_tool_dependency_manager',
    'language_settings_tool_dependency_scanner',
    'language_settings_tool_guide',
    'language_settings_worksheet',
    'language_settings_database_schema_manager',
    'language_settings_module_list',
    'language_settings', // 後方互換性
];

// 利用可能な言語設定テーブル名の一覧を取得
const getAvailableLanguageTables = (database: Partial<Database> | null): string[] => {
    // データベースに既に読み込まれているテーブルから抽出
    const loadedTables: string[] = [];
    if (database) {
        const allTableNames = Object.keys(database);
        const languageTables = allTableNames.filter(name => 
            name.startsWith('language_settings_') || name === 'language_settings'
        );
        loadedTables.push(...languageTables);
    }
    
    // 既知のテーブル名と結合し、重複を除去
    const allTables = [...new Set([...KNOWN_LANGUAGE_TABLES, ...loadedTables])];
    
    // 共通テーブルを最初に、その他をソート
    const sorted = allTables.sort((a, b) => {
        if (a === COMMON_LANGUAGE_TABLE) return -1;
        if (b === COMMON_LANGUAGE_TABLE) return 1;
        return a.localeCompare(b);
    });
    
    return sorted;
};

// テーブル名から表示名を取得
const getTableDisplayName = (tableName: string): string => {
    if (tableName === COMMON_LANGUAGE_TABLE) return '共通言語設定';
    if (tableName === 'language_settings') return '言語設定（旧）';
    
    // language_settings_xxx から xxx を抽出して表示名に変換
    const suffix = tableName.replace('language_settings_', '');
    // アンダースコアをスペースに、各単語の最初の文字を大文字に
    return suffix
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const LanguageManager: React.FC = () => {
    const { database, setDatabase } = useDatabase();
    const { currentPage } = useNavigation();
    const { t } = useTranslation('language-manager');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingTable, setIsLoadingTable] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [localData, setLocalData] = useState<Row[]>([]);
    const [schema, setSchema] = useState<Column[]>([]);
    const [targetLang, setTargetLang] = useState('en');
    const [selectedTableName, setSelectedTableName] = useState<string>(COMMON_LANGUAGE_TABLE);

    // 利用可能な言語設定テーブルの一覧
    const availableTables = useMemo(() => getAvailableLanguageTables(database), [database]);

    // languagesテーブルを読み込む
    useEffect(() => {
        const loadLanguagesTable = async () => {
            if (!database?.languages) {
                try {
                    console.log('[LanguageManager] Loading languages table...');
                    const data = await fetchTables(['languages'], { toolName: 'language-manager' });
                    console.log('[LanguageManager] Languages table loaded:', data);
                    setDatabase(prev => ({ ...(prev || {}), ...data }));
                } catch (error) {
                    console.error('[LanguageManager] Failed to load languages table:', error);
                }
            } else {
                console.log('[LanguageManager] Languages table already loaded:', database.languages);
            }
        };
        loadLanguagesTable();
    }, [database, setDatabase]);

    // 選択されたテーブルを読み込む
    useEffect(() => {
        const loadSelectedTable = async () => {
            if (!selectedTableName || !database) return;
            
            setIsLoadingTable(true);
            setHasChanges(false);
            
            try {
                // データベースに既に読み込まれているか確認
                if (database[selectedTableName]) {
                    const table = database[selectedTableName];
                    setLocalData(table.data || []);
                    setSchema(table.schema || []);
                } else {
                    // テーブルが読み込まれていない場合は読み込む
                    const data = await fetchTables([selectedTableName], { toolName: 'language-manager' });
                    setDatabase(prev => ({ ...(prev || {}), ...data }));
                    
                    if (data[selectedTableName]) {
                        setLocalData(data[selectedTableName].data || []);
                        setSchema(data[selectedTableName].schema || []);
                    } else {
                        // テーブルが存在しない場合は空のデータを設定
                        setLocalData([]);
                        setSchema([
                            { id: 'key', name: 'key', type: 'TEXT' },
                            { id: 'ja', name: 'ja', type: 'TEXT' },
                            { id: 'en', name: 'en', type: 'TEXT' }
                        ]);
                    }
                }
            } catch (error) {
                console.error('[LanguageManager] Failed to load table:', error);
                setLocalData([]);
                setSchema([
                    { id: 'key', name: 'key', type: 'TEXT' },
                    { id: 'ja', name: 'ja', type: 'TEXT' },
                    { id: 'en', name: 'en', type: 'TEXT' }
                ]);
            } finally {
                setIsLoadingTable(false);
            }
        };
        
        loadSelectedTable();
    }, [selectedTableName, database, setDatabase]);

    // テーブル選択が変更されたときに、データベースから最新のデータを再読み込み
    useEffect(() => {
        if (selectedTableName && database?.[selectedTableName]) {
            const table = database[selectedTableName];
            setLocalData(table.data || []);
            setSchema(table.schema || [
                { id: 'key', name: 'key', type: 'TEXT' },
                { id: 'ja', name: 'ja', type: 'TEXT' },
                { id: 'en', name: 'en', type: 'TEXT' }
            ]);
            setHasChanges(false);
        }
    }, [selectedTableName, database]);

    const translatableLangs = useMemo(() => {
        const langs = (database?.languages?.data as { code: string; name: string }[] || [])
            .filter(lang => lang.code !== 'ja')
            .map(lang => lang.code);
        console.log('[LanguageManager] Translatable languages:', langs, 'from database.languages:', database?.languages);
        return langs;
    }, [database?.languages]);


    useEffect(() => {
        if (translatableLangs.length > 0 && !translatableLangs.includes(targetLang)) {
            setTargetLang(translatableLangs[0]);
        } else if (translatableLangs.length === 0 && targetLang !== '') {
            setTargetLang('');
        }
    }, [translatableLangs, targetLang]);


    const handleUpdateRow = (rowIndex: number, newRowData: Row) => {
        setLocalData(prev => {
            const newData = [...prev];
            newData[rowIndex] = newRowData;
            return newData;
        });
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!selectedTableName) {
            alert('テーブルが選択されていません。');
            return;
        }

        // まずローカル状態を更新
        setDatabase(db => {
            if (!db) return null;
            return {
                ...db,
                [selectedTableName]: {
                    schema: schema,
                    data: localData,
                }
            };
        });

        // サーバーに保存（選択されたテーブルのみ、全データを置き換え）
        try {
            // AppMode分岐: csv-writableモードの場合はCSVに直接保存
            const appMode = getStoredAppMode();
            if (isCsvWritableMode(appMode)) {
                // CSVモード: saveTableToCsvで直接保存
                const saved = await saveTableToCsv(selectedTableName, {
                    data: localData,
                    schema: schema
                });
                
                if (!saved) {
                    throw new Error('Failed to save language settings to CSV');
                }
            } else {
                // Liveモード: 既存のAPIを使用
                const currentTable = database?.[selectedTableName];
                const existingIds = (currentTable?.data || []).map((r: Row) => r.id);
                const operations = [
                    ...existingIds.map(id => ({ type: 'DELETE' as const, where: { id } })),
                    ...localData.map(item => ({ type: 'INSERT' as const, data: item }))
                ];

                if (operations.length > 0) {
                    const result = await updateDatabase(currentPage, selectedTableName, operations, database);
                    if (!result.success) {
                        throw new Error(result.error || 'Failed to save language settings to server');
                    }
                }
            }
            setHasChanges(false);
            alert(t('language_manager.save_success', '言語設定を保存しました。'));
        } catch (error) {
            console.error('[LanguageManager] Failed to save:', error);
            alert(t('language_manager.save_failed', '保存に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
        }
    };
    
    const handleAiTranslate = async () => {
        if (!targetLang) {
            alert(t('language_manager.select_language', '翻訳対象の言語を選択してください。'));
            return;
        }
        setIsLoading(true);
        try {
            const columnExists = schema.some(col => col.name === targetLang);

            if (!columnExists) {
                const newColumn: Column = { id: targetLang, name: targetLang, type: 'TEXT' };
                setSchema(prev => [...prev, newColumn]);
            }

            const japaneseTerms = localData.reduce((acc, row) => {
                acc[row.key as string] = row.ja as string;
                return acc;
            }, {} as Record<string, string>);

            const targetLanguageName = (database?.languages?.data.find(l => l.code === targetLang) as Row)?.name || new Intl.DisplayNames(['en'], { type: 'language' }).of(targetLang) || targetLang;
            const results = await generateTranslations(japaneseTerms, targetLanguageName as string);

            setLocalData(prev => {
                let dataToUpdate = prev;
                if (!columnExists) {
                    dataToUpdate = prev.map(row => ({ ...row, [targetLang]: '' }));
                }
                return dataToUpdate.map(row => ({
                    ...row,
                    [targetLang]: results[row.key as string] || row[targetLang],
                }));
            });
            setHasChanges(true);
            alert(t('language_manager.translate_complete', 'AIによる翻訳が完了しました。'));
        } catch (error) {
            alert(t('language_manager.translate_failed', '翻訳に失敗しました:') + ' ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="flex flex-col h-full">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">{t('language_manager.title', '言語管理')}</h1>
                    <p className="text-gray-500 mt-1">{t('language_manager.description', 'アプリケーション内のテキストを多言語で管理します。')}</p>
                </div>
                <div className="flex items-center gap-2">
                    {hasChanges && <span className="text-sm text-yellow-600 animate-pulse">{t('language_manager.unsaved_changes', '未保存の変更があります')}</span>}
                    <div className="flex items-center gap-1">
                        <Select value={targetLang} onChange={e => setTargetLang(e.target.value)} disabled={isLoading || translatableLangs.length === 0} className="p-2 border rounded bg-input-bg dark:bg-input-bg-dark text-sm h-9">
                            {translatableLangs.length > 0 ? (
                                translatableLangs.map(lang => <option key={lang} value={lang}>{(database?.languages?.data.find(l => l.code === lang) as Row)?.name || lang.toUpperCase()}</option>)
                            ) : (
                                <option value="">{t('language_manager.no_language', '言語なし')}</option>
                            )}
                        </Select>
                        <Button variant="secondary" onClick={handleAiTranslate} disabled={isLoading || translatableLangs.length === 0}>
                            {isLoading ? <Spinner size="sm" className="mr-2"/> : <SparklesIcon className="w-4 h-4 mr-2"/>}
                            {t('language_manager.ai_translate', 'AIで翻訳')}
                        </Button>
                    </div>
                    <Button onClick={handleSave} disabled={!hasChanges || !selectedTableName}>{t('language_manager.save', '保存')}</Button>
                </div>
            </header>

            {/* ツール選択ドロップダウン */}
            <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                    {t('language_manager.select_table', '言語設定テーブルを選択')}
                </label>
                <Select 
                    value={selectedTableName} 
                    onChange={e => {
                        if (hasChanges) {
                            const confirmed = window.confirm('未保存の変更があります。テーブルを切り替えますか？');
                            if (!confirmed) return;
                        }
                        setSelectedTableName(e.target.value);
                    }}
                    disabled={isLoadingTable}
                    className="w-full max-w-md p-2 border rounded bg-input-bg dark:bg-input-bg-dark"
                >
                    {availableTables.length > 0 ? (
                        availableTables.map(tableName => (
                            <option key={tableName} value={tableName}>
                                {getTableDisplayName(tableName)} ({tableName})
                            </option>
                        ))
                    ) : (
                        <option value="">読み込み中...</option>
                    )}
                </Select>
            </div>

            {isLoadingTable ? (
                <div className="flex-grow flex items-center justify-center">
                    <Spinner centered />
                </div>
            ) : (
                <div className="flex-grow bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-md overflow-auto">
                    <DataTable
                        schema={schema}
                        data={localData}
                        tableName={selectedTableName || 'language_settings'}
                        onUpdateRow={handleUpdateRow}
                        onDeleteRow={() => {}} // Deletion not typical for this table
                        permissions={{}} // Assuming admin access
                    />
                </div>
            )}
        </div>
    );
};

export default LanguageManager;
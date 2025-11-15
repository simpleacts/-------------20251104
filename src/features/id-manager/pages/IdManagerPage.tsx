import React, { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@core/contexts/NavigationContext';
import { updateDatabase } from '@core/utils';
import { useCategorizedTables } from '@shared/hooks/useCategorizedTables';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Database, IdFormat, Row } from '@shared/types';
import IdFormatList from '../organisms/IdFormatList';
import IdFormatSettingsEditor from '../organisms/IdFormatSettingsEditor';

// このツールでID形式を管理する対象となるテーブルのリスト
const MANAGEABLE_ID_TABLES = [
    'additional_options', 'app_logs', 'category_print_locations', 'customer_groups', 'customers', 
    'data_confirmation_status_master', 'dev_locks', 'dev_roadmap', 'dev_constitution', 
    'dev_guidelines_recommended', 'dev_guidelines_prohibited', 'dic_colors', 'email_accounts', 
    'email_attachments', 'email_labels', 'email_label_ai_rules', 'emails', 'filename_rule_presets', 
    'gallery_images', 'gallery_tags', 'gemini_models', 'google_fonts', 'importer_mappings', 
    'incoming_stock', 'ink_manufacturers', 'ink_products', 'ink_recipe_components', 
    'ink_recipe_usage', 'ink_recipes', 'ink_series', 'invoice_parsing_templates', 
    'languages', 'manufacturers', 'pantone_colors', 'payment_status_master', 
    'pdf_item_display_configs', 'pdf_preview_zoom_configs', 'pdf_templates', 'print_history', 
    'print_history_images', 'print_history_positions', 'production_status_master', 'products_master', 
    'quote_designs', 'quote_history', 'quote_items', 'quote_status_master', 'quotes', 
    'shipping_carriers', 'shipping_status_master', 'sql_export_presets', 'task_master',
    // 注意: skusは非推奨（stockテーブルから取得） 
    'quote_tasks', 'task_generation_rules', 'task_time_settings', 'tool_migrations', 
    'work_session_quotes', 'work_sessions', 'brands', 'categories', 'tags',
    // 注意: colors, sizesは削除済み（stockテーブルから取得） 
    'users', 'roles', 'bills', 'bill_items', 'color_libraries',
    // 注意: product_pricesは非推奨（stockテーブルから取得） 
    'color_library_types', 'calculation_logic_types', 
    'time_units', 'ink_product_types', 'weight_volume_units', 'free_input_item_types'
].sort();


interface IdManagerProps {
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
}

const IdManager: React.FC<IdManagerProps> = ({ database, setDatabase }) => {
    const { currentPage } = useNavigation();
    const { t } = useTranslation('id-manager');
    const [activeTab, setActiveTab] = useState<'formats' | 'settings'>('formats');
    const [localFormats, setLocalFormats] = useState<Partial<IdFormat>[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const { TABLE_DISPLAY_NAMES } = useCategorizedTables();

    const allManageableFormats = useMemo(() => {
        const dbFormats = new Map((database.id_formats?.data || []).map(f => [f.table_name, f]));
        return MANAGEABLE_ID_TABLES.map(tableName => {
            const existing = dbFormats.get(tableName);
            return existing || {
                table_name: tableName,
                prefix: '',
                padding: 0,
                description: TABLE_DISPLAY_NAMES[tableName],
                is_manufacturer_dependent: false
            };
        });
    }, [database.id_formats, TABLE_DISPLAY_NAMES]);

    useEffect(() => {
        setLocalFormats(allManageableFormats);
    }, [allManageableFormats]);

    const handleSaveFormats = async () => {
        const formatsToSave = localFormats.filter(f => f.prefix || f.padding); // Save only if configured
        
        // まずローカル状態を更新
        setDatabase(prevDb => {
            if (!prevDb) return null;
            const newDb = JSON.parse(JSON.stringify(prevDb));
            newDb.id_formats.data = formatsToSave;
            return newDb;
        });

        // サーバーに保存（全データを置き換え）
        try {
            const existingIds = (database.id_formats?.data || []).map((f: Row) => f.id);
            const operations = [
                ...existingIds.map(id => ({ type: 'DELETE' as const, where: { id } })),
                ...formatsToSave.map(format => ({ type: 'INSERT' as const, data: format }))
            ];

            if (operations.length > 0) {
                const result = await updateDatabase(currentPage, 'id_formats', operations, database);
                if (!result.success) {
                    throw new Error(result.error || 'Failed to save id formats to server');
                }
            }
            alert(t('id_manager.save_success', 'ID形式の設定を保存しました。'));
        } catch (error) {
            console.error('[IdManager] Failed to save to server:', error);
            alert(t('id_manager.save_failed', 'サーバーへの保存に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    const handleApplyAllFormats = () => {
        if (!window.confirm(t('id_manager.apply_confirm', '本当にすべての既存IDを新しい形式に変換しますか？この操作は元に戻せません。'))) {
            return;
        }

        setIsLoading(true);

        setTimeout(() => {
            try {
                const newDb = JSON.parse(JSON.stringify(database));
                const originalFormats = new Map((database.id_formats?.data || []).map(f => [f.table_name, f]));

                for (const newFormat of localFormats) {
                    const tableName = newFormat.table_name!;
                    const originalFormat = originalFormats.get(tableName);
                    
                    if (JSON.stringify(newFormat) === JSON.stringify(originalFormat)) {
                        continue; // No change for this table
                    }

                    const table = newDb[tableName];
                    if (!table || !table.data.length) continue;

                    const pk = table.schema[0].name;
                    const idMap = new Map<string, string>();
                    let counter = 1;

                    table.data.forEach((row: Row) => {
                        const oldId = row[pk];
                        const newId = `${newFormat.prefix || ''}${String(counter++).padStart(newFormat.padding || 0, '0')}`;
                        idMap.set(oldId, newId);
                        row[pk] = newId; // Update primary key
                    });
                    
                    for (const otherTableName in newDb) {
                        if (otherTableName === tableName || !newDb[otherTableName].schema) continue;
                        
                        const fkColumnName = `${tableName.replace(/s$/, '')}_id`;
                        const fkColumn = newDb[otherTableName].schema.find((col: any) => col.name === fkColumnName);
                        
                        if (fkColumn) {
                            newDb[otherTableName].data.forEach((row: Row) => {
                                if (row[fkColumn.name] && idMap.has(row[fkColumn.name])) {
                                    row[fkColumn.name] = idMap.get(row[fkColumn.name]);
                                }
                            });
                        }
                    }
                }
                
                newDb.id_formats.data = localFormats.filter(f => f.prefix || f.padding);
                
                setDatabase(newDb);
                alert(t('id_manager.apply_complete', 'すべてのID形式の適用が完了しました。'));

            } catch (error) {
                console.error("ID migration failed:", error);
                alert(t('id_manager.apply_error', 'エラーが発生しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
            } finally {
                setIsLoading(false);
            }
        }, 50);
    };

    const getTabButtonClass = (tabName: 'formats' | 'settings') => 
        `py-3 px-4 border-b-2 font-medium text-sm ${
            activeTab === tabName 
            ? 'border-brand-primary text-brand-primary' 
            : 'border-transparent text-gray-500 hover:text-gray-700'
        }`;
    
    return (
        <div className="flex flex-col h-full">
            <header className="mb-6">
                <h1 className="text-3xl font-bold">{t('id_manager.title', 'ID形式管理ツール')}</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{t('id_manager.description', '各テーブルのID形式（プレフィックス、桁数）を一括で管理・適用します。')}</p>
            </header>
            
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <nav className="-mb-px flex space-x-6">
                    <button onClick={() => setActiveTab('formats')} className={getTabButtonClass('formats')}>
                        {t('id_manager.tab_formats', 'フォーマット一覧')}
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={getTabButtonClass('settings')}>
                        {t('id_manager.tab_settings', '設定')}
                    </button>
                </nav>
            </div>

            <div className="flex-grow bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md flex flex-col min-h-0">
                {activeTab === 'formats' ? (
                    <IdFormatList idFormats={localFormats} TABLE_DISPLAY_NAMES={TABLE_DISPLAY_NAMES} />
                ) : (
                    <IdFormatSettingsEditor
                        idFormats={localFormats}
                        setIdFormats={setLocalFormats}
                        onSave={handleSaveFormats}
                        onApplyAll={handleApplyAllFormats}
                        isLoading={isLoading}
                        TABLE_DISPLAY_NAMES={TABLE_DISPLAY_NAMES}
                    />
                )}
            </div>
        </div>
    );
};

export default IdManager;
import React, { useEffect, useMemo, useState } from 'react';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { useNavigation } from '@core/contexts/NavigationContext';
import { fetchTables } from '@core/data/db.live';
import { updateDatabase } from '@core/utils';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Column, Database, Row } from '@shared/types';
import { PencilIcon, PlusIcon, SpinnerIcon, TrashIcon } from '@components/atoms';
import { generateNewId } from '@features/id-manager/services/idService';
import DefinitionEditModal from '../modals/DefinitionEditModal';

interface ProductDefinitionToolProps {
    setDatabase: React.Dispatch<React.SetStateAction<Partial<Database> | null>>;
}

const getTabs = (t: (key: string, fallback: string) => string) => [
    { id: 'manufacturers', name: t('product_def.tab_manufacturers', 'メーカー') },
    { id: 'brands', name: t('product_def.tab_brands', 'ブランド') },
    { id: 'categories', name: t('product_def.tab_categories', 'カテゴリー') },
    { id: 'tags', name: t('product_def.tab_tags', 'タグ') },
    { id: 'print_locations', name: t('product_def.tab_print_locations', '印刷箇所') },
    { id: 'print_size_constraints', name: t('product_def.tab_print_size_constraints', '印刷サイズ制約') },
    { id: 'category_print_locations', name: t('product_def.tab_category_print_locations', 'カテゴリ別印刷箇所') },
    { id: 'print_cost_combination', name: t('product_def.tab_print_cost_combination', '印刷グループ設定') },
    { id: 'plate_cost_combination', name: t('product_def.tab_plate_cost_combination', '製版グループ設定') },
    { id: 'payment_methods', name: t('product_def.tab_payment_methods', '支払方法') },
    { id: 'time_units', name: t('product_def.tab_time_units', '時間単位') },
    { id: 'calculation_logic_types', name: t('product_def.tab_calculation_logic_types', '計算ロジックタイプ') },
    { id: 'ink_product_types', name: t('product_def.tab_ink_product_types', 'インク製品タイプ') },
    { id: 'weight_volume_units', name: t('product_def.tab_weight_volume_units', '重さ・容量単位') },
    { id: 'free_input_item_types', name: t('product_def.tab_free_input_item_types', '調整項目タイプ') },
    { id: 'color_libraries', name: t('product_def.tab_color_libraries', 'カラーライブラリ') },
    { id: 'color_library_types', name: t('product_def.tab_color_library_types', 'カラーライブラリタイプ') },
];

const ProductDefinitionTool: React.FC<ProductDefinitionToolProps> = ({ setDatabase }) => {
    const { t } = useTranslation('product-definition');
    const { currentPage } = useNavigation();
    const { database } = useDatabase();
    const [localDatabase, setLocalDatabase] = useState<Partial<Database> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('manufacturers');
    const TABS = useMemo(() => getTabs(t), [t]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Row | null>(null);
    // 削除されたアイテムのIDを追跡（テーブル名とIDのペア）
    const deletedItemsRef = React.useRef<Map<string, Set<string>>>(new Map());
    const loadedTablesRef = React.useRef<Set<string>>(new Set());
    
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // まず、グローバルdatabaseから既存データを初期化
                if (database && !localDatabase) {
                    setLocalDatabase(database);
                }
                
                // メーカー依存テーブル（colors, sizes）は除外
                const requiredTables = [
                    'manufacturers', 'brands', 'categories', 'tags',
                    'print_locations', 'print_size_constraints', 'category_print_locations',
                    'print_cost_combination', 'plate_cost_combination', 'payment_methods',
                    'time_units', 'calculation_logic_types', 'ink_product_types', 'weight_volume_units',
                    'free_input_item_types', 'color_libraries', 'color_library_types'
                ];
                // 既に読み込み済みのテーブルはスキップ（データが空でも一度読み込んだら再試行しない）
                // グローバルdatabaseとlocalDatabaseの両方をチェック
                const currentDb = localDatabase || database;
                const missingTables = currentDb 
                    ? requiredTables.filter(t => {
                        const table = currentDb[t];
                        if (!table || !table.data || !Array.isArray(table.data)) {
                            return !loadedTablesRef.current.has(t);
                        }
                        if (table.data.length === 0) {
                            return !loadedTablesRef.current.has(t);
                        }
                        // データがある場合は読み込み不要（削除されたデータが復活しないように）
                        return false;
                    })
                    : requiredTables.filter(t => !loadedTablesRef.current.has(t));
                
                if (missingTables.length === 0) {
                    setIsLoading(false);
                    return;
                }
                
                missingTables.forEach(t => loadedTablesRef.current.add(t));
                
                const data = await fetchTables(missingTables, { toolName: 'product-definition-tool' });
                
                // データをマージ（削除されたデータが復活しないようにする）
                setLocalDatabase(prev => {
                    if (!prev) {
                        // 削除されたIDを除外
                        const filtered: Partial<Database> = {};
                        Object.keys(data).forEach(tableName => {
                            const deletedIds = deletedItemsRef.current.get(tableName);
                            if (deletedIds && deletedIds.size > 0) {
                                filtered[tableName] = {
                                    ...data[tableName],
                                    data: (data[tableName]?.data || []).filter((r: Row) => {
                                        const pk = data[tableName]?.schema?.[0]?.name;
                                        return pk ? !deletedIds.has(String(r[pk])) : true;
                                    })
                                };
                            } else {
                                filtered[tableName] = data[tableName];
                            }
                        });
                        return filtered;
                    }
                    const merged = { ...prev };
                    Object.keys(data).forEach(tableName => {
                        if (merged[tableName] && Array.isArray(merged[tableName].data)) {
                            // 既存のデータがある場合は、削除されたIDを除外してマージ
                            const deletedIds = deletedItemsRef.current.get(tableName);
                            const pk = merged[tableName]?.schema?.[0]?.name;
                            if (deletedIds && deletedIds.size > 0 && pk) {
                                const filteredNewData = (data[tableName]?.data || []).filter((r: Row) => !deletedIds.has(String(r[pk])));
                                const existingDataMap = new Map((merged[tableName].data || []).map((r: Row) => [String(r[pk]), r]));
                                filteredNewData.forEach((r: Row) => existingDataMap.set(String(r[pk]), r));
                                merged[tableName] = {
                                    ...merged[tableName],
                                    data: Array.from(existingDataMap.values())
                                };
                            } else {
                                // 削除されたIDがない場合は、通常通りマージ
                                const existingDataMap = new Map((merged[tableName].data || []).map((r: Row) => [String(r[pk]), r]));
                                (data[tableName]?.data || []).forEach((r: Row) => existingDataMap.set(String(r[pk]), r));
                                merged[tableName] = {
                                    ...merged[tableName],
                                    data: Array.from(existingDataMap.values())
                                };
                            }
                        } else {
                            // テーブルが存在しない場合は、新しいデータを使用（削除されたIDを除外）
                            const deletedIds = deletedItemsRef.current.get(tableName);
                            if (deletedIds && deletedIds.size > 0) {
                                const pk = data[tableName]?.schema?.[0]?.name;
                                if (pk) {
                                    merged[tableName] = {
                                        ...data[tableName],
                                        data: (data[tableName]?.data || []).filter((r: Row) => !deletedIds.has(String(r[pk])))
                                    };
                                } else {
                                    merged[tableName] = data[tableName];
                                }
                            } else {
                                merged[tableName] = data[tableName];
                            }
                        }
                    });
                    return merged;
                });
            } catch (err) {
                setError(err instanceof Error ? err.message : t('product_def.load_failed', 'データの読み込みに失敗しました。'));
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [database, localDatabase]);

    const activeTable = useMemo(() => localDatabase?.[activeTab], [localDatabase, activeTab]);

    const handleOpenModal = (item: Row | null) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingItem(null);
        setIsModalOpen(false);
    };
    
    const updateDatabases = (updater: (db: Partial<Database> | null) => Partial<Database> | null) => {
        setDatabase(updater);
        setLocalDatabase(updater);
    };

    const handleSave = async (newItem: Row) => {
        if (!activeTable || !database) return;
        const primaryKey = activeTable.schema[0].name;
        const isEdit = editingItem && editingItem[primaryKey];
        
        // ID生成: メーカー依存テーブルの場合はmanufacturer_idを含める
        const manufacturerId = newItem.manufacturer_id as string | undefined;
        const itemId = isEdit 
            ? editingItem[primaryKey] 
            : generateNewId(activeTab, database, manufacturerId);

        // まずローカル状態を更新
        const updater = (db: Partial<Database> | null) => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            const table = newDb[activeTab];
            if (!table) return newDb;

            if (isEdit) {
                const index = table.data.findIndex((r: Row) => r[primaryKey] === editingItem[primaryKey]);
                if (index !== -1) {
                    table.data[index] = { ...table.data[index], ...newItem };
                }
            } else {
                table.data.push({ ...newItem, [primaryKey]: itemId });
            }
            return newDb;
        };
        
        updateDatabases(updater);

        // サーバーに保存
        try {
            const operation = isEdit
                ? [{ type: 'UPDATE' as const, data: newItem, where: { [primaryKey]: itemId } }]
                : [{ type: 'INSERT' as const, data: { ...newItem, [primaryKey]: itemId } }];
            
            const result = await updateDatabase(currentPage, activeTab, operation, database);
            if (!result.success) {
                throw new Error(result.error || `Failed to save ${activeTab} to server`);
            }
        } catch (error) {
            console.error(`[ProductDefinition] Failed to save ${activeTab} to server:`, error);
            alert(t('product_def.save_failed', 'サーバーへの保存に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
        }

        handleCloseModal();
    };
    
    const handleDelete = async (itemToDelete: Row) => {
        if (!activeTable || !database) return;
        const pk = activeTable.schema[0].name;
        const itemId = String(itemToDelete[pk]);
        const displayName = itemToDelete.name || itemToDelete.tagName || itemToDelete.categoryName || itemId;
        
        // 削除確認（既に確認があるが、念のため）
        if (!window.confirm(t('product_def.delete_confirm', '「{name}」を削除しますか？\nこの項目が他のデータで使用されている場合、関連情報が失われる可能性があります。').replace('{name}', displayName))) {
            return;
        }
        
        // 削除されたアイテムIDを記録（再読み込み時に復活しないようにするため）
        if (!deletedItemsRef.current.has(activeTab)) {
            deletedItemsRef.current.set(activeTab, new Set());
        }
        deletedItemsRef.current.get(activeTab)!.add(itemId);
        
        // まずローカル状態から削除
        const updater = (db: Partial<Database> | null) => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            const table = newDb[activeTab];
            if (!table) return newDb;
            table.data = table.data.filter((r: Row) => String(r[pk]) !== itemId);
            return newDb;
        };
        updateDatabases(updater);

        // サーバーから削除
        try {
            const result = await updateDatabase(
                currentPage,
                activeTab,
                [{ type: 'DELETE' as const, where: { [pk]: itemToDelete[pk] } }],
                database
            );
            if (!result.success) {
                throw new Error(result.error || `Failed to delete ${activeTab} from server`);
            }
        } catch (error) {
            console.error(`[ProductDefinition] Failed to delete ${activeTab} from server:`, error);
            alert(t('product_def.delete_failed', 'サーバーからの削除に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    const getDisplayValue = (item: Row, column: Column) => {
        const value = item[column.name];
        if (value === null || value === undefined) return <span className="text-gray-400">N/A</span>;
        if (column.type === 'BOOLEAN') return value ? '✔️' : '✖️';
        if (column.name === 'hex' || column.name === 'hex_value') {
            return (
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-gray-400" style={{ backgroundColor: String(value) }}></div>
                    <span>{String(value)}</span>
                </div>
            );
        }
        if (column.name === 'manufacturer_id' && activeTab === 'brands') {
            const manufacturersTable = localDatabase?.manufacturers as Table | undefined;
            if (!manufacturersTable || !Array.isArray(manufacturersTable.data)) return String(value);
            const manufacturer = manufacturersTable.data.find(m => m.id === value);
            return manufacturer?.name || String(value);
        }
        if (column.name === 'constraint_id' && activeTab === 'print_size_constraints') {
            const type = item.constraint_type;
            const table = type === 'tag' ? localDatabase?.tags : localDatabase?.print_locations;
            if (!table || !Array.isArray(table.data)) return value;
            const key = type === 'tag' ? 'tagId' : 'locationId';
            const displayKey = type === 'tag' ? 'tagName' : 'label';
            const found = table.data.find(t => t[key] === value);
            return found ? found[displayKey] : value;
        }
         if (column.name === 'category_id' && (activeTab === 'category_print_locations' || activeTab === 'print_cost_combination' || activeTab === 'plate_cost_combination')) {
            const categoriesTable = localDatabase?.categories as Table | undefined;
            if (!categoriesTable || !Array.isArray(categoriesTable.data)) return value;
            const category = categoriesTable.data.find(c => c.categoryId === value);
            return category?.categoryName || value;
        }
        if (column.name === 'allowed_location_ids' && activeTab === 'category_print_locations') {
            const ids = String(value).split(',');
            const printLocationsTable = localDatabase?.print_locations as Table | undefined;
            if (!printLocationsTable || !Array.isArray(printLocationsTable.data)) {
                return ids.join(', ');
            }
            return ids.map(id => printLocationsTable.data.find(l => l.locationId === id)?.label || id).join(', ');
        }

        return String(value);
    }

    if (isLoading) {
        return <div className="p-4"><SpinnerIcon className="w-8 h-8"/></div>;
    }
    if (error) {
        return <div className="p-4 text-red-500">{error}</div>;
    }
    if (!localDatabase || !activeTable) {
        return <div className="p-4">{t('product_def.load_error', '定義データを読み込めませんでした。')}</div>;
    }

    return (
        <div className="flex flex-col h-full">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">{t('product_def.title', '商品定義管理')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('product_def.description', '商品の基本構成要素（メーカー、ブランド、カラー、印刷箇所等）を一元管理します。')}</p>
                </div>
            </header>

            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${activeTab === tab.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
                        >
                            {tab.name}
                        </button>
                    ))}
                </nav>
            </div>
            
            <div className="flex-grow bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{TABS.find(t => t.id === activeTab)?.name} {t('product_def.list_title', '一覧')}</h2>
                    <button onClick={() => handleOpenModal(null)} className="flex items-center gap-2 bg-brand-primary hover:bg-blue-800 text-white font-semibold py-2 px-4 rounded-lg">
                        <PlusIcon className="w-5 h-5" /> {t('product_def.add_new', '新規追加')}
                    </button>
                </div>
                <div className="overflow-auto flex-grow">
                     <table className="min-w-full text-sm">
                        <thead className="sticky top-0 bg-base-200 dark:bg-base-dark-300">
                            <tr>
                                {activeTable?.schema.map(col => <th key={col.id} className="p-2 text-left font-semibold">{col.name}</th>)}
                                <th className="p-2 text-right">{t('product_def.actions', '操作')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-base-300 dark:divide-base-dark-300">
                            {(activeTable && Array.isArray(activeTable.data) ? activeTable.data : []).map((item, index) => (
                                <tr key={index} className="hover:bg-base-200 dark:hover:bg-base-dark-300/50">
                                    {activeTable.schema.map(col => <td key={col.id} className="p-2 whitespace-nowrap">{getDisplayValue(item, col)}</td>)}
                                    <td className="p-2 text-right whitespace-nowrap">
                                        <button onClick={() => handleOpenModal(item)} className="p-1 text-blue-600 hover:text-blue-800 mr-2"><PencilIcon className="w-5 h-5"/></button>
                                        <button onClick={() => handleDelete(item)} className="p-1 text-red-600 hover:text-red-800"><TrashIcon className="w-5 h-5"/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <DefinitionEditModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                    schema={activeTable.schema}
                    initialData={editingItem}
                    tableName={activeTab}
                    database={localDatabase as Database}
                />
            )}
        </div>
    );
};

export default ProductDefinitionTool;
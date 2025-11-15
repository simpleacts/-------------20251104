import React, { useEffect, useMemo, useState } from 'react';
import { getManufacturerTableName } from '@core/config/tableNames';
import { getManufacturerTable, updateDatabase } from '@core/utils';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { useNavigation } from '@core/contexts/NavigationContext';
import { fetchTables } from '@core/data/db.live';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Column, Database, Row } from '@shared/types';
import { PencilIcon, PlusIcon, SpinnerIcon, TrashIcon } from '@components/atoms';
import { generateNewId } from '@features/id-manager/services/idService';
import DefinitionEditModal from '../modals/DefinitionEditModal';

interface ProductDefinitionManufacturerToolProps {
    setDatabase: React.Dispatch<React.SetStateAction<Partial<Database> | null>>;
}

const getTabs = (t: (key: string, fallback: string) => string) => [
    { id: 'colors', name: t('product_def.tab_colors', 'カラー') },
    { id: 'sizes', name: t('product_def.tab_sizes', 'サイズ') },
];

const ProductDefinitionManufacturerTool: React.FC<ProductDefinitionManufacturerToolProps> = ({ setDatabase }) => {
    const { t } = useTranslation('product-definition');
    const { currentPage } = useNavigation();
    const { database } = useDatabase();
    const [localDatabase, setLocalDatabase] = useState<Partial<Database> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('colors');
    const [selectedManufacturerId, setSelectedManufacturerId] = useState<string>('');
    const TABS = useMemo(() => getTabs(t), [t]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Row | null>(null);
    // 削除されたアイテムのIDを追跡（テーブル名とIDのペア）
    const deletedItemsRef = React.useRef<Map<string, Set<string>>>(new Map());
    const loadedTablesRef = React.useRef<Set<string>>(new Set());
    
    // メーカー一覧を取得
    const manufacturers = useMemo(() => {
        if (!database?.manufacturers?.data) return [];
        return database.manufacturers.data as Row[];
    }, [database?.manufacturers]);

    // メーカーが読み込まれたら、最初のメーカーを自動選択
    useEffect(() => {
        if (manufacturers.length > 0 && !selectedManufacturerId) {
            setSelectedManufacturerId(manufacturers[0].id as string);
        }
    }, [manufacturers, selectedManufacturerId]);

    useEffect(() => {
        const loadData = async () => {
            if (!selectedManufacturerId) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);
            try {
                // 注意: colors, sizesは削除済み（stockテーブルから取得）
                // product-definition-manufacturer-toolはstockテーブルからカラー・サイズ情報を表示する
                const requiredTables = [
                    'stock'
                ];
                
                // メーカー依存テーブルなので、メーカーID付きテーブル名でチェック
                const manufacturerTableNames = requiredTables.map(tableName => 
                    getManufacturerTableName(tableName, selectedManufacturerId)
                );
                
                // 既に読み込み済みのテーブルはスキップ
                const missingTables = localDatabase 
                    ? manufacturerTableNames.filter(tableName => {
                        const table = localDatabase[tableName];
                        if (!table || !table.data || !Array.isArray(table.data)) {
                            return !loadedTablesRef.current.has(tableName);
                        }
                        if (table.data.length === 0) {
                            return !loadedTablesRef.current.has(tableName);
                        }
                        return false;
                    })
                    : manufacturerTableNames.filter(tableName => !loadedTablesRef.current.has(tableName));
                
                if (missingTables.length === 0) {
                    setIsLoading(false);
                    return;
                }
                
                // ベーステーブル名に変換（重複を除去）
                const baseTableNames = Array.from(new Set(missingTables.map(tableName => {
                    // colors_manu_0001 -> colors
                    for (const baseTableName of requiredTables) {
                        if (tableName.startsWith(`${baseTableName}_`)) {
                            return baseTableName;
                        }
                    }
                    return tableName;
                })));
                
                if (baseTableNames.length === 0) {
                    setIsLoading(false);
                    return;
                }
                
                // fetchTablesはメーカー依存テーブルを自動的にすべてのメーカーで読み込む
                const data = await fetchTables(baseTableNames, { toolName: 'product-definition-manufacturer-tool' });
                
                // 読み込み済みマークを更新
                manufacturerTableNames.forEach(t => loadedTablesRef.current.add(t));
                
                // データをマージ（削除されたデータが復活しないようにする）
                setLocalDatabase(prev => {
                    if (!prev) {
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
                                const existingDataMap = new Map((merged[tableName].data || []).map((r: Row) => [String(r[pk]), r]));
                                (data[tableName]?.data || []).forEach((r: Row) => existingDataMap.set(String(r[pk]), r));
                                merged[tableName] = {
                                    ...merged[tableName],
                                    data: Array.from(existingDataMap.values())
                                };
                            }
                        } else {
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
    }, [selectedManufacturerId]);

    // 選択されたメーカーのアクティブタブのテーブルを取得
    const activeTable = useMemo(() => {
        if (!selectedManufacturerId || !localDatabase) return undefined;
        return getManufacturerTable(localDatabase, activeTab, selectedManufacturerId);
    }, [localDatabase, activeTab, selectedManufacturerId]);

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
        if (!activeTable || !database || !selectedManufacturerId) return;
        const primaryKey = activeTable.schema[0].name;
        const isEdit = editingItem && editingItem[primaryKey];
        
        // manufacturer_idを自動設定
        const itemWithManufacturer = { ...newItem, manufacturer_id: selectedManufacturerId };
        
        // ID生成: メーカー依存テーブルの場合はmanufacturer_idを含める
        const itemId = isEdit 
            ? editingItem[primaryKey] 
            : generateNewId(activeTab, database, selectedManufacturerId);

        // まずローカル状態を更新
        const manufacturerTableName = getManufacturerTableName(activeTab, selectedManufacturerId);
        const updater = (db: Partial<Database> | null) => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            const table = newDb[manufacturerTableName];
            if (!table) return newDb;

            if (isEdit) {
                const index = table.data.findIndex((r: Row) => r[primaryKey] === editingItem[primaryKey]);
                if (index !== -1) {
                    table.data[index] = { ...table.data[index], ...itemWithManufacturer };
                }
            } else {
                table.data.push({ ...itemWithManufacturer, [primaryKey]: itemId });
            }
            return newDb;
        };
        
        updateDatabases(updater);

        // サーバーに保存
        try {
            const operation = isEdit
                ? [{ type: 'UPDATE' as const, data: itemWithManufacturer, where: { [primaryKey]: itemId } }]
                : [{ type: 'INSERT' as const, data: { ...itemWithManufacturer, [primaryKey]: itemId } }];
            
            const result = await updateDatabase(currentPage, manufacturerTableName, operation, database);
            if (!result.success) {
                throw new Error(result.error || `Failed to save ${manufacturerTableName} to server`);
            }
        } catch (error) {
            console.error(`[ProductDefinitionManufacturer] Failed to save ${manufacturerTableName} to server:`, error);
            alert(t('product_def.save_failed', 'サーバーへの保存に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
        }

        handleCloseModal();
    };
    
    const handleDelete = async (itemToDelete: Row) => {
        if (!activeTable || !database || !selectedManufacturerId) return;
        const pk = activeTable.schema[0].name;
        const itemId = String(itemToDelete[pk]);
        const displayName = itemToDelete.name || itemToDelete.colorName || itemToDelete.sizeName || itemId;
        const manufacturerTableName = getManufacturerTableName(activeTab, selectedManufacturerId);
        
        // 削除確認
        if (!window.confirm(t('product_def.delete_confirm', '「{name}」を削除しますか？\nこの項目が他のデータで使用されている場合、関連情報が失われる可能性があります。').replace('{name}', displayName))) {
            return;
        }
        
        // 削除されたアイテムIDを記録
        if (!deletedItemsRef.current.has(manufacturerTableName)) {
            deletedItemsRef.current.set(manufacturerTableName, new Set());
        }
        deletedItemsRef.current.get(manufacturerTableName)!.add(itemId);
        
        // まずローカル状態から削除
        const updater = (db: Partial<Database> | null) => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            const table = newDb[manufacturerTableName];
            if (!table) return newDb;
            table.data = table.data.filter((r: Row) => String(r[pk]) !== itemId);
            return newDb;
        };
        updateDatabases(updater);

        // サーバーから削除
        try {
            const result = await updateDatabase(
                currentPage,
                manufacturerTableName,
                [{ type: 'DELETE' as const, where: { [pk]: itemToDelete[pk] } }],
                database
            );
            if (!result.success) {
                throw new Error(result.error || `Failed to delete ${manufacturerTableName} from server`);
            }
        } catch (error) {
            console.error(`[ProductDefinitionManufacturer] Failed to delete ${manufacturerTableName} from server:`, error);
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
        if (column.name === 'manufacturer_id') {
            const manufacturer = manufacturers.find(m => m.id === value);
            return manufacturer?.name || String(value);
        }
        return String(value);
    }

    if (isLoading) {
        return <div className="p-4"><SpinnerIcon className="w-8 h-8"/></div>;
    }
    if (error) {
        return <div className="p-4 text-red-500">{error}</div>;
    }
    if (!localDatabase || !activeTable || !selectedManufacturerId) {
        return <div className="p-4">{t('product_def.load_error', '定義データを読み込めませんでした。')}</div>;
    }

    const selectedManufacturer = manufacturers.find(m => m.id === selectedManufacturerId);

    return (
        <div className="flex flex-col h-full">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">{t('product_def.title_manufacturer', '商品定義管理（メーカー依存）')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('product_def.description_manufacturer', 'メーカーごとに商品の基本構成要素（カラー、サイズ等）を管理します。')}</p>
                </div>
            </header>

            <div className="mb-6">
                <label htmlFor="manufacturer-select" className="block text-sm font-medium mb-2">{t('product_def.select_manufacturer', 'メーカーを選択')}</label>
                <select
                    id="manufacturer-select"
                    name="manufacturer-select"
                    value={selectedManufacturerId}
                    onChange={(e) => setSelectedManufacturerId(e.target.value)}
                    className="w-full max-w-xs bg-input-bg dark:bg-input-bg-dark p-2 border border-default rounded"
                >
                    <option value="">{t('product_def.select_manufacturer_placeholder', 'メーカーを選択してください...')}</option>
                    {manufacturers.map(manufacturer => (
                        <option key={manufacturer.id as string} value={manufacturer.id as string}>
                            {manufacturer.name}
                        </option>
                    ))}
                </select>
                {selectedManufacturer && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {t('product_def.selected_manufacturer', '選択中: {name}').replace('{name}', selectedManufacturer.name as string)}
                    </p>
                )}
            </div>

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
                            {activeTable?.data.map((item, index) => (
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

            {isModalOpen && activeTable && (
                <DefinitionEditModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                    schema={activeTable.schema}
                    initialData={editingItem ? { ...editingItem, manufacturer_id: selectedManufacturerId } : { manufacturer_id: selectedManufacturerId }}
                    tableName={activeTab}
                    database={localDatabase as Database}
                />
            )}
        </div>
    );
};

export default ProductDefinitionManufacturerTool;


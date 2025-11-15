import React, { useState, useMemo, useEffect } from 'react';
import { Column, Row } from '../../types';
import { CheckIcon, XMarkIcon, SparklesIcon, SpinnerIcon, PaperAirplaneIcon, ClipboardDocumentCheckIcon } from '../atoms/icons';
import { Select } from '../atoms/Select';
import { filterDataInWorker } from '@features/data-io/services/workerService';
import { Pagination } from '../molecules/Pagination';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { GeneralTableActions } from '../molecules/TableActionButtons';
import { isManufacturerDependentTable, parseManufacturerTableName } from '@core/config/tableNames';
import { getManufacturerTableData, getAllManufacturerTableData } from '@core/utils';
import useAppSettings from '@features/display-settings/hooks/useAppSettings';


interface DataTableProps {
  schema: Column[];
  data: Row[];
  tableName: string;
  onUpdateRow: (rowIndex: number, newRowData: Row) => void;
  onDeleteRow: (rowIndex: number) => void;
  onDuplicateRow?: (rowIndex: number) => void;
  isBulkEditable?: boolean;
  onBulkUpdate?: (rowIndexes: number[], column: string, value: any) => void;
  onGenerateDescription?: (rowIndex: number) => Promise<void>;
  onSendNotification?: (rowIndex: number) => void;
  onOpenEditModal?: (rowIndex: number) => void;
  customerGroups?: Row[];
  shippingCarriers?: Row[];
  permissions: { [key: string]: any };
  paginationConfig?: { enabled: boolean; itemsPerPage: number };
  skipDeleteConfirm?: boolean;
}

const EditableCell: React.FC<{
    value: string | number | boolean | null;
    type: Column['type'];
    onChange: (newValue: string | number | boolean) => void;
    tableName?: string;
    columnName?: string;
    customerGroups?: Row[];
    rowIndex?: number;
    rowId?: string;
}> = ({ value, type, onChange, tableName, columnName, customerGroups, rowIndex, rowId }) => {
    // 行ごとに一意のIDを生成（行IDまたは行インデックスを使用）
    const uniqueKey = rowId || (rowIndex !== undefined ? `row-${rowIndex}` : '');
    const inputId = `datatable-${tableName}-${columnName}${uniqueKey ? `-${uniqueKey}` : ''}`;
    
    if (tableName === 'customers' && columnName === 'customer_group_id' && customerGroups) {
        return (
            <select
                id={inputId}
                name={`${tableName}_${columnName}${uniqueKey ? `_${uniqueKey}` : ''}`}
                value={String(value || 'cgrp_00001')}
                onChange={(e) => onChange(e.target.value)}
                aria-label={columnName ? `${columnName}を編集` : 'セルを編集'}
                className="w-full bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-brand-secondary focus:outline-none"
            >
                {customerGroups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                ))}
            </select>
        );
    }

    if (type === 'BOOLEAN') {
        return (
            <input
                id={inputId}
                name={`${tableName}_${columnName}${uniqueKey ? `_${uniqueKey}` : ''}`}
                type="checkbox"
                checked={!!value}
                onChange={(e) => onChange(e.target.checked)}
                aria-label={columnName ? `${columnName}を編集` : 'チェックボックスを編集'}
                className="form-checkbox h-5 w-5 text-brand-secondary bg-base-200 dark:bg-base-dark-300 border-default dark:border-default-dark rounded focus:ring-brand-secondary"
            />
        );
    }

    const inputType = type === 'NUMBER' ? 'number' : 'text';
    const displayValue = (type === 'NUMBER' && (value === 0 || value === null)) ? '' : String(value ?? '');

    return (
        <input
            id={inputId}
            name={`${tableName}_${columnName}${uniqueKey ? `_${uniqueKey}` : ''}`}
            type={inputType}
            value={displayValue}
            onChange={(e) => onChange(type === 'NUMBER' ? parseFloat(e.target.value) || 0 : e.target.value)}
            placeholder={type === 'NUMBER' ? '0' : undefined}
            aria-label={columnName ? `${columnName}を編集` : 'セルを編集'}
            className="w-full bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-brand-secondary focus:outline-none"
        />
    );
};

const DisplayCell: React.FC<{value: any, type: Column['type'], tableName?: string, columnName?: string, customerGroups?: Row[], shippingCarriers?: Row[]}> = ({ value, type, tableName, columnName, customerGroups, shippingCarriers }) => {
    if (value === null || value === undefined) {
        return <span className="text-muted italic">NULL</span>;
    }
    if (type === 'BOOLEAN') {
        return value ? 
            <CheckIcon className="w-5 h-5 text-green-500" title="はい" /> : 
            <XMarkIcon className="w-5 h-5 text-red-500" title="いいえ" />;
    }

    if (tableName === 'customers' && columnName === 'customer_group_id' && customerGroups) {
        const group = customerGroups.find(g => g.id === value);
        if (group) {
            if (group.name === 'パートナー') {
                return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200">{group.name}</span>;
            }
            return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">{group.name}</span>;
        }
        return <span className="text-muted italic">不明({value})</span>;
    }
    
    if (tableName === 'customers' && columnName === 'status') {
        const status = String(value);
        let colorClasses = '';
        let label = status;
        switch (status) {
            case 'active':
                colorClasses = 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
                label = 'アクティブ';
                break;
            case 'inactive':
                colorClasses = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200';
                label = '休眠';
                break;
            case 'suspended':
                colorClasses = 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200';
                label = '取引停止';
                break;
            default:
                colorClasses = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        }
        return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colorClasses}`}>{label}</span>;
    }

    if (tableName === 'quotes' && columnName === 'shipping_carrier_id' && shippingCarriers) {
        if (!value) return <span className="text-muted italic">未設定</span>;
        const carrier = shippingCarriers.find(c => c.id === value);
        return carrier ? carrier.name : <span className="text-red-500 italic">不明({value})</span>;
    }
    
    if (tableName === 'quotes' && columnName === 'quote_type') {
        if (!value) return <span className="text-muted italic">未分類</span>;
        const type = String(value);
        let colorClasses = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        if (type === 'プリント事業') {
            colorClasses = 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
        } else if (type === 'DTF製品販売事業') {
            colorClasses = 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
        }
        return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colorClasses}`}>{type}</span>;
    }

    const strValue = String(value);
    if (strValue.length > 100) {
        return <span title={strValue}>{strValue.substring(0, 100)}...</span>;
    }

    return strValue;
};

const BulkEditModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    schema: Column[];
    onConfirm: (column: string, value: any) => void;
}> = ({ isOpen, onClose, schema, onConfirm }) => {
    const [column, setColumn] = useState('');
    const [value, setValue] = useState<any>('');
    const [selectedColumnType, setSelectedColumnType] = useState<Column['type'] | null>(null);

    if (!isOpen) return null;

    const editableSchema = schema.slice(1); // 主キーは除外

    const handleColumnChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newColumnName = e.target.value;
        const newColumn = editableSchema.find(c => c.name === newColumnName);
        setColumn(newColumnName);
        setSelectedColumnType(newColumn?.type || null);
        setValue(newColumn?.type === 'BOOLEAN' ? false : '');
    };
    
    const handleConfirm = () => {
        let finalValue = value;
        if (selectedColumnType === 'NUMBER') finalValue = parseFloat(value);
        if (selectedColumnType === 'BOOLEAN') finalValue = value === 'true';
        onConfirm(column, finalValue);
    }
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-base-100 dark:bg-base-dark-200 p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">一括編集</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="bulk-edit-column-select" className="block text-sm font-medium mb-1">編集する列</label>
                        <select id="bulk-edit-column-select" name="bulk_edit_column" value={column} onChange={handleColumnChange} className="w-full bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-secondary focus:outline-none">
                            <option value="">列を選択...</option>
                            {editableSchema.map(col => <option key={col.id} value={col.name}>{col.name}</option>)}
                        </select>
                    </div>
                    {column && (
                        <div>
                             <label htmlFor={selectedColumnType === 'BOOLEAN' ? 'bulk-edit-value-select' : 'bulk-edit-value-input'} className="block text-sm font-medium mb-1">新しい値</label>
                            {selectedColumnType === 'BOOLEAN' ? (
                                <select id="bulk-edit-value-select" name="bulk_edit_value" value={String(value)} onChange={(e) => setValue(e.target.value)} className="w-full bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-secondary focus:outline-none">
                                    <option value="true">はい</option>
                                    <option value="false">いいえ</option>
                                </select>
                            ) : (
                                <input id="bulk-edit-value-input" name="bulk_edit_value" type={selectedColumnType === 'NUMBER' ? 'number' : 'text'} value={value} onChange={(e) => setValue(e.target.value)} className="w-full bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-secondary focus:outline-none" />
                            )}
                        </div>
                    )}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-base-200 hover:bg-base-300 dark:bg-base-dark-300 dark:hover:bg-gray-600">キャンセル</button>
                    <button onClick={handleConfirm} disabled={!column} className="px-4 py-2 text-sm font-medium rounded-md bg-brand-primary text-white hover:bg-blue-800 disabled:bg-gray-400">更新</button>
                </div>
            </div>
        </div>
    );
}

const DataTable: React.FC<DataTableProps> = ({ schema, data, tableName, onUpdateRow, onDeleteRow, onDuplicateRow, isBulkEditable = false, onBulkUpdate, onGenerateDescription, onSendNotification, onOpenEditModal, customerGroups, shippingCarriers, permissions, paginationConfig, skipDeleteConfirm = false }) => {
    const { database } = useDatabase();
    const { getPaginationConfigFor } = useAppSettings();
    
    // メーカー依存テーブルかどうかを判定
    const parsedTableName = parseManufacturerTableName(tableName);
    const baseTableName = parsedTableName.baseTableName;
    const isManufacturerDependent = isManufacturerDependentTable(baseTableName);
    
    // メーカー一覧を取得
    const manufacturers = useMemo(() => {
        if (!database?.manufacturers?.data) return [];
        return database.manufacturers.data as Row[];
    }, [database?.manufacturers]);
    
    // 選択されたメーカーID（メーカー依存テーブルの場合）
    const [selectedManufacturerId, setSelectedManufacturerId] = useState<string>('');
    
    // メーカー依存テーブルの場合、選択されたメーカーのデータを取得
    const displayData = useMemo(() => {
        if (!isManufacturerDependent) {
            return data;
        }
        
        // 既にメーカー付きテーブル名の場合は、そのまま使用
        if (parsedTableName.manufacturerId) {
            return data;
        }
        
        // メーカーが選択されていない場合は空配列
        if (!selectedManufacturerId) {
            return [];
        }
        
        // 「すべてのメーカー」を選択した場合
        if (selectedManufacturerId === 'all') {
            return getAllManufacturerTableData(database, baseTableName);
        }
        
        // 選択されたメーカーのデータを取得
        return getManufacturerTableData(database, baseTableName, selectedManufacturerId);
    }, [data, isManufacturerDependent, selectedManufacturerId, baseTableName, database, parsedTableName.manufacturerId]);
    
    // メーカー依存テーブルで、メーカーが選択されていない場合、「すべてのメーカー」を自動選択
    useEffect(() => {
        if (isManufacturerDependent && !selectedManufacturerId && manufacturers.length > 0) {
            setSelectedManufacturerId('all');
        }
    }, [isManufacturerDependent, selectedManufacturerId, manufacturers]);
    
    const displayNames = useMemo(() => {
        if (!database?.language_settings?.data) return {};
        const names: Record<string, string> = {};
        database.language_settings.data.forEach(row => {
            if (row.key && typeof row.key === 'string' && row.key.startsWith(`${baseTableName}.`)) {
                const colName = row.key.substring(baseTableName.length + 1);
                names[colName] = row.ja as string;
            }
        });
        return names;
    }, [database?.language_settings, baseTableName]);

    const getColumnDisplayName = (columnName: string) => {
        return displayNames[columnName] || columnName;
    };

    // ページネーション設定を取得（明示的に渡された場合はそれを使用、なければテーブル名から自動取得）
    const { enabled: isPaginationEnabled, itemsPerPage } = useMemo(() => {
        if (paginationConfig !== undefined) {
            // 明示的にpaginationConfigが渡された場合はそれを使用
            return {
                enabled: paginationConfig?.enabled || false,
                itemsPerPage: paginationConfig?.itemsPerPage || 50,
            };
        }
        // paginationConfigが渡されていない場合は、テーブル名から自動取得
        const config = getPaginationConfigFor(baseTableName);
        return {
            enabled: config.enabled,
            itemsPerPage: config.itemsPerPage,
        };
    }, [paginationConfig, getPaginationConfigFor, baseTableName]);

    const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
    const [editedRow, setEditedRow] = useState<Row | null>(null);
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [isBulkEditMode, setIsBulkEditMode] = useState(false);
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
    const [generatingDescIndex, setGeneratingDescIndex] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    
    const [filteredData, setFilteredData] = useState<{ row: Row; originalIndex: number }[]>([]);
    const [isFiltering, setIsFiltering] = useState(false);
    
    useEffect(() => {
        setIsFiltering(true);
        const timeoutId = setTimeout(() => {
            filterDataInWorker(displayData, filters)
                .then(result => {
                    const indexedResult = result.map(row => {
                        const originalIndex = displayData.findIndex(d => d.id === row.id);
                        return { row, originalIndex };
                    });
                    setFilteredData(indexedResult as any);
                })
                .catch(error => {
                    console.error("Worker filtering error:", error);
                    // Fallback to main thread filtering
                    const result = displayData.map((row, index) => ({ row, originalIndex: index }));
                    setFilteredData(result);
                })
                .finally(() => setIsFiltering(false));
        }, 300); // Debounce filtering
        return () => clearTimeout(timeoutId);
    }, [displayData, filters]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    const totalPages = useMemo(() => {
        if (!isPaginationEnabled) return 1;
        return Math.ceil(filteredData.length / itemsPerPage);
    }, [filteredData, isPaginationEnabled, itemsPerPage]);

    const paginatedData = useMemo(() => {
        if (!isPaginationEnabled) return filteredData;
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredData.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredData, currentPage, isPaginationEnabled, itemsPerPage]);
    
    const handleEdit = (originalIndex: number) => {
        setEditingRowIndex(originalIndex);
        setEditedRow({ ...displayData[originalIndex] });
    };

    const handleCancel = () => {
        setEditingRowIndex(null);
        setEditedRow(null);
    };

    const handleSave = () => {
        if (editingRowIndex !== null && editedRow) {
            onUpdateRow(editingRowIndex, editedRow);
            handleCancel();
        }
    };
    
    const handleDelete = (originalIndex: number) => {
        if(skipDeleteConfirm || window.confirm('この行を削除しますか？')){
            onDeleteRow(originalIndex);
        }
    };
    
    const handleDuplicate = (originalIndex: number) => {
        onDuplicateRow?.(originalIndex);
    };

    const handleBulkEditConfirm = (column: string, value: any) => {
        onBulkUpdate?.(Array.from(selectedRows), column, value);
        setIsBulkEditModalOpen(false);
    };

    const handleFilterChange = (column: string, value: string) => {
        setFilters(prev => ({...prev, [column]: value}));
    };
    
    const handleToggleRowSelection = (originalIndex: number) => {
        setSelectedRows(prev => {
            const newSet = new Set(prev);
            if(newSet.has(originalIndex)) newSet.delete(originalIndex);
            else newSet.add(originalIndex);
            return newSet;
        });
    };
    
    const handleGenerateDescriptionClick = async (rowIndex: number) => {
        if (onGenerateDescription) {
            setGeneratingDescIndex(rowIndex);
            try {
                await onGenerateDescription(rowIndex);
            } finally {
                setGeneratingDescIndex(null);
            }
        }
    };
    
    return (
      <div>
        {/* メーカー選択UI（メーカー依存テーブルの場合） */}
        {isManufacturerDependent && !parsedTableName.manufacturerId && (
            <div className="mb-4 p-4 bg-base-200 dark:bg-base-dark-300 rounded-lg">
                <label htmlFor="manufacturer-select" className="block text-sm font-medium mb-2">
                    メーカーを選択
                </label>
                <Select
                    id="manufacturer-select"
                    value={selectedManufacturerId}
                    onChange={(e) => setSelectedManufacturerId(e.target.value)}
                    className="w-full max-w-xs"
                >
                    <option value="">メーカーを選択...</option>
                    <option value="all">すべてのメーカー</option>
                    {manufacturers.map(manufacturer => (
                        <option key={manufacturer.id} value={manufacturer.id as string}>
                            {manufacturer.name as string}
                        </option>
                    ))}
                </Select>
            </div>
        )}
        
        <div className="flex-shrink-0 sticky top-0 z-10">
            <div className="bg-base-200 dark:bg-base-dark-300 font-semibold flex items-stretch">
                <div className="flex-shrink-0 flex items-center justify-center px-4" style={{ width: onDuplicateRow ? 140 : 100 }}>
                    {isBulkEditable && <button onClick={() => setIsBulkEditMode(!isBulkEditMode)} className={`p-1 text-sm rounded-md ${isBulkEditMode ? 'bg-blue-600 text-white' : ''}`}><ClipboardDocumentCheckIcon className="w-4 h-4"/></button>}
                </div>
                {isBulkEditMode && (
                    <div className="flex-shrink-0 flex items-center justify-center px-4" style={{width: 48}}>
                        <label htmlFor="datatable-select-all" className="sr-only">すべて選択</label>
                        <input id="datatable-select-all" name="datatable_select_all" type="checkbox" onChange={e => setSelectedRows(e.target.checked ? new Set(displayData.map((_, i) => i)) : new Set())}/>
                    </div>
                )}
                {schema.map(col => (
                    <div key={col.id} className="px-4 py-2" style={{ flex: '1 1 150px', minWidth: 150 }}>
                        <label htmlFor={`datatable-filter-${col.name}`} className="block">{getColumnDisplayName(col.name)}</label>
                        <input id={`datatable-filter-${col.name}`} name={`filter_${col.name}`} type="text" placeholder="Filter..." value={filters[col.name] || ''} onChange={e => handleFilterChange(col.name, e.target.value)} className="w-full text-xs mt-1 p-1 bg-input-filter-bg dark:bg-input-filter-bg-dark border border-default dark:border-default-dark rounded-md"/>
                    </div>
                ))}
            </div>
        </div>

        <div className="relative">
             {isFiltering && (
                <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center z-20">
                    <SpinnerIcon className="w-8 h-8 text-brand-primary" />
                </div>
            )}
            <div>
                {paginatedData.map(({ row, originalIndex }) => {
                    const isEditing = editingRowIndex === originalIndex;
                    const pk = schema[0]?.name || 'id';
                    const key = row[pk] || originalIndex;

                    return (
                        <div key={key} className={`flex items-stretch border-b border-base-300 dark:border-base-dark-300 hover:bg-hover-bg dark:hover:bg-hover-bg-dark transition-colors text-sm ${selectedRows.has(originalIndex) ? 'bg-selected-bg dark:bg-selected-bg-dark' : ''}`}>
                            <div className="flex-shrink-0 flex items-center justify-center gap-1 px-4" style={{ width: onDuplicateRow ? 140 : 100 }}>
                                 {isEditing ? (
                                    <>
                                        <button onClick={handleSave} className="p-1 text-green-600 hover:text-green-800"><CheckIcon className="w-5 h-5"/></button>
                                        <button onClick={handleCancel} className="p-1 text-red-500 hover:text-red-700"><XMarkIcon className="w-5 h-5"/></button>
                                    </>
                                ) : (
                                    <>
                                        {onGenerateDescription && <button onClick={() => handleGenerateDescriptionClick(originalIndex)} className="p-1" disabled={generatingDescIndex === originalIndex}>{generatingDescIndex === originalIndex ? <SpinnerIcon className="w-4 h-4"/> : <SparklesIcon className="w-4 h-4"/>}</button>}
                                        {onSendNotification && <button onClick={() => onSendNotification(originalIndex)} className="p-1"><PaperAirplaneIcon className="w-4 h-4"/></button>}
                                        <GeneralTableActions
                                            onEdit={onOpenEditModal ? () => onOpenEditModal(originalIndex) : () => handleEdit(originalIndex)}
                                            onDuplicate={onDuplicateRow ? () => handleDuplicate(originalIndex) : undefined}
                                            onDelete={() => handleDelete(originalIndex)}
                                            editIconType={onOpenEditModal ? 'pencil-square' : 'pencil'}
                                        />
                                    </>
                                )}
                            </div>
                            {isBulkEditMode && (
                                <div className="flex-shrink-0 flex items-center justify-center px-4" style={{width: 48}}>
                                    <label htmlFor={`datatable-row-checkbox-${originalIndex}`} className="sr-only">行を選択</label>
                                    <input id={`datatable-row-checkbox-${originalIndex}`} name={`row_checkbox_${originalIndex}`} type="checkbox" checked={selectedRows.has(originalIndex)} onChange={() => handleToggleRowSelection(originalIndex)}/>
                                </div>
                            )}
                            {schema.map((col: Column) => (
                                <div key={col.id} className="px-4 py-2 flex items-center" style={{ flex: '1 1 150px', minWidth: 150, overflow: 'hidden' }}>
                                    <div className="truncate">
                                        {isEditing ? (
                                            <EditableCell value={editedRow?.[col.name] || null} type={col.type} onChange={newVal => setEditedRow((prev: Row) => ({...prev!, [col.name]: newVal}))} tableName={tableName} columnName={col.name} customerGroups={customerGroups} rowIndex={originalIndex} rowId={row.id as string}/>
                                        ) : (
                                            <DisplayCell value={row[col.name]} type={col.type} tableName={tableName} columnName={col.name} customerGroups={customerGroups} shippingCarriers={shippingCarriers} />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
        
        {isPaginationEnabled && (
            <div className="flex-shrink-0 p-4">
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={filteredData.length}
                />
            </div>
        )}

        {isBulkEditMode && selectedRows.size > 0 && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-blue-900 dark:bg-blue-800 text-white dark:text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-4">
                <p>{selectedRows.size}行選択中</p>
                <button onClick={() => setIsBulkEditModalOpen(true)} className="px-3 py-1 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 rounded text-sm">編集</button>
            </div>
        )}
        {isBulkEditModalOpen && <BulkEditModal isOpen={isBulkEditModalOpen} onClose={() => setIsBulkEditModalOpen(false)} schema={schema} onConfirm={handleBulkEditConfirm} />}
      </div>
    );
};

export default React.memo(DataTable);


import React, { useState, useMemo } from 'react';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { convertToCSV, downloadCSV } from '@shared/utils/csv';
import { Row } from '@shared/types';
import { useCategorizedTables } from '@shared/hooks/useCategorizedTables';
import { Button, Select, DownloadIcon } from '@components/atoms';
import { isManufacturerDependentTable, parseManufacturerTableName, getManufacturerFileName } from '@core/config/tableNames';

const CsvExporter: React.FC = () => {
    const { database } = useDatabase();
    
    if (!database) {
        return null;
    }
    
    // FIX: Retrieve `TABLE_DISPLAY_NAMES` from the `useCategorizedTables` hook.
    const { TABLE_DISPLAY_NAMES } = useCategorizedTables();
    
    // メーカー一覧を取得
    const manufacturers = useMemo(() => {
        if (!database?.manufacturers?.data) return [];
        return database.manufacturers.data as Row[];
    }, [database?.manufacturers]);
    
    // 利用可能なテーブル一覧を取得（メーカー依存テーブルはメーカーごとに分離）
    const availableTables = useMemo(() => {
        const tables: Array<{ name: string; displayName: string }> = [];
        
        Object.keys(database).forEach(tableName => {
            const parsed = parseManufacturerTableName(tableName);
            const baseTableName = parsed.baseTableName;
            
            // メーカー依存テーブルで、既にメーカー付きテーブル名の場合はそのまま追加
            if (parsed.manufacturerId) {
                const manufacturer = manufacturers.find(m => m.id === parsed.manufacturerId);
                const manufacturerName = manufacturer?.name || parsed.manufacturerId;
                tables.push({
                    name: tableName,
                    displayName: `${baseTableName} (${manufacturerName})`
                });
            } else if (!isManufacturerDependentTable(baseTableName)) {
                // メーカー非依存テーブルはそのまま追加
                tables.push({
                    name: tableName,
                    displayName: String(TABLE_DISPLAY_NAMES[tableName] || tableName)
                });
            }
            // メーカー依存テーブルで、メーカー付きでない場合はスキップ（既に分離されているため）
        });
        
        return tables.sort((a, b) => a.name.localeCompare(b.name));
    }, [database, manufacturers, TABLE_DISPLAY_NAMES]);
    
    const [selectedTable, setSelectedTable] = useState(availableTables[0]?.name || '');
    const exportEncoding = useMemo(() => {
        const settingsMap = new Map(database.settings?.data.map(s => [s.key, s.value]));
        return settingsMap.get('CSV_EXPORT_ENCODING') || 'UTF-8';
    }, [database.settings]);

    // 選択されたテーブルがメーカー依存テーブルかどうかを判定
    const parsedSelectedTable = useMemo(() => {
        if (!selectedTable) return { baseTableName: '', manufacturerId: null };
        return parseManufacturerTableName(selectedTable);
    }, [selectedTable]);
    const isManufacturerDependent = parsedSelectedTable.manufacturerId !== null;

    const handleExport = () => {
        if (!selectedTable || !database[selectedTable]) return;
        
        const tableData = database[selectedTable].data;
        const csv = convertToCSV(tableData);
        
        // メーカー付きテーブル名の場合は、メーカーIDを含むファイル名でエクスポート
        if (isManufacturerDependent && parsedSelectedTable.manufacturerId) {
            const baseTableName = parsedSelectedTable.baseTableName;
            // 統一されたファイル名変換関数を使用
            const fileName = getManufacturerFileName(baseTableName);
            downloadCSV(csv, `manufacturers/manu_${parsedSelectedTable.manufacturerId}/manu_${parsedSelectedTable.manufacturerId}_${fileName}.csv`);
        } else {
            // 通常のテーブルはそのままエクスポート
            downloadCSV(csv, `${selectedTable}.csv`);
        }
    };

    return (
        <div className="bg-container-bg dark:bg-container-bg-dark p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-bold mb-4">テーブルを選択してエクスポート</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                選択したテーブルの現在のデータをCSVファイルとしてダウンロードします。データのバックアップや、表計算ソフトでの分析に利用できます。
                現在の設定では、文字コード「{exportEncoding}」でエクスポートされます。
            </p>
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <Select
                        value={selectedTable} 
                        onChange={e => setSelectedTable(e.target.value)} 
                        aria-label="エクスポートするテーブルを選択"
                    >
                        {availableTables.map(table => (
                            <option key={table.name} value={table.name}>{table.displayName}</option>
                        ))}
                    </Select>
                <Button 
                    onClick={handleExport} 
                    disabled={!selectedTable}
                    className="flex items-center gap-2"
                >
                    <DownloadIcon className="w-4 h-4 mr-2" /> CSVエクスポート
                </Button>
                </div>
                {isManufacturerDependent && parsedSelectedTable.manufacturerId && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            メーカーごとに分離されたテーブルです
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                            ※ メーカーごとのフォルダ構造に合わせたファイルがダウンロードされます（例: manufacturers/manu_{parsedSelectedTable.manufacturerId}/manu_{parsedSelectedTable.manufacturerId}_{parsedSelectedTable.baseTableName}.csv）
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CsvExporter;
// テーブル一覧コンポーネント

import React from 'react';
import { Table, Column } from '@shared/types/common';

interface TableListProps {
  tables: string[];
  selectedTable: string | null;
  database: Record<string, Table> | null;
  schemaCache?: Record<string, Column[]>;
  onSelectTable: (tableName: string) => void;
}

export const TableList: React.FC<TableListProps> = ({
  tables,
  selectedTable,
  database,
  schemaCache,
  onSelectTable
}) => {
  const getTableInfo = (tableName: string) => {
    // まずスキーマキャッシュから取得を試す
    if (schemaCache && schemaCache[tableName] && schemaCache[tableName].length > 0) {
      return {
        columnCount: schemaCache[tableName].length,
        rowCount: 0 // スキーマのみなので行数は0
      };
    }
    
    // フォールバック: databaseコンテキストから取得
    if (database && database[tableName]) {
      const table = database[tableName];
      return {
        columnCount: table.schema?.length || 0,
        rowCount: table.data?.length || 0
      };
    }
    
    return null;
  };

  return (
    <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-md p-4">
      <h3 className="text-lg font-bold mb-4">テーブル一覧</h3>
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {tables.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">テーブルが見つかりません</p>
        ) : (
          tables.map(tableName => {
            const info = getTableInfo(tableName);
            const isSelected = selectedTable === tableName;
            
            return (
              <button
                key={tableName}
                onClick={() => onSelectTable(tableName)}
                className={`w-full text-left p-3 rounded-md transition-colors ${
                  isSelected
                    ? 'bg-brand-secondary/20 text-brand-primary font-semibold border-2 border-brand-secondary'
                    : 'bg-base-200 dark:bg-base-dark-300 hover:bg-base-300 dark:hover:bg-base-dark-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{tableName}</span>
                  {info && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {info.columnCount}列 / {info.rowCount}行
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};


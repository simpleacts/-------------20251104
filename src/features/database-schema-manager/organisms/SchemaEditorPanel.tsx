// スキーマ編集パネル（拡張版）

import React, { useState } from 'react';
import { ExtendedColumn, DatabaseColumnType } from '@shared/types/schema';
import { PlusIcon, TrashIcon } from '@components/atoms';

interface SchemaEditorPanelProps {
  tableName: string;
  schema: ExtendedColumn[];
  onUpdateColumn: (index: number, updates: Partial<ExtendedColumn>) => void;
  onAddColumn: () => void;
  onRemoveColumn: (index: number) => void;
}

const DATABASE_TYPES: { value: DatabaseColumnType; label: string }[] = [
  { value: 'VARCHAR(255)', label: 'VARCHAR(255)' },
  { value: 'TEXT_DB', label: 'TEXT' },
  { value: 'INT', label: 'INT' },
  { value: 'DECIMAL(10,2)', label: 'DECIMAL(10,2)' },
  { value: 'DATE', label: 'DATE' },
  { value: 'DATETIME', label: 'DATETIME' },
  { value: 'BOOLEAN_DB', label: 'BOOLEAN (TINYINT(1))' },
  { value: 'JSON', label: 'JSON' }
];

export const SchemaEditorPanel: React.FC<SchemaEditorPanelProps> = ({
  tableName,
  schema,
  onUpdateColumn,
  onAddColumn,
  onRemoveColumn
}) => {
  const [expandedColumns, setExpandedColumns] = useState<Set<number>>(new Set());

  const toggleExpand = (index: number) => {
    setExpandedColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">スキーマ編集: {tableName}</h3>
        <button
          onClick={onAddColumn}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark rounded-md hover:opacity-90"
        >
          <PlusIcon className="w-4 h-4" />
          列を追加
        </button>
      </div>

      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {schema.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">カラムがありません</p>
        ) : (
          schema.map((col, index) => {
            const isExpanded = expandedColumns.has(index);
            const isPrimaryKey = index === 0;

            return (
              <div
                key={col.id}
                className={`border rounded-md p-3 ${
                  isPrimaryKey
                    ? 'bg-gray-100 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700'
                    : 'bg-base-200 dark:bg-base-dark-300 border-base-300 dark:border-base-dark-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleExpand(index)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{col.name}</span>
                        {isPrimaryKey && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                            主キー
                          </span>
                        )}
                        {col.recommendation && (
                          <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded">
                            推奨: {col.recommendation.recommendedType}
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {col.type}
                      </span>
                    </div>
                  </button>
                  {!isPrimaryKey && (
                    <button
                      onClick={() => onRemoveColumn(index)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-3 pt-3 border-t border-base-300 dark:border-base-dark-400">
                    {/* カラム名 */}
                    <div>
                      <label className="block text-xs font-medium mb-1">カラム名</label>
                      <input
                        type="text"
                        value={col.name}
                        onChange={e => onUpdateColumn(index, { name: e.target.value, id: e.target.value })}
                        disabled={isPrimaryKey}
                        className="w-full bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-secondary focus:outline-none disabled:cursor-not-allowed disabled:text-gray-500"
                      />
                    </div>

                    {/* データ型 */}
                    <div>
                      <label className="block text-xs font-medium mb-1">データ型</label>
                      <select
                        value={col.type}
                        onChange={e => onUpdateColumn(index, { type: e.target.value as DatabaseColumnType, dbType: e.target.value as DatabaseColumnType })}
                        className="w-full bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-secondary focus:outline-none"
                      >
                        {DATABASE_TYPES.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      {col.recommendation && col.type !== col.recommendation.recommendedType && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                          💡 推奨: {col.recommendation.recommendedType} ({col.recommendation.reason})
                        </p>
                      )}
                    </div>

                    {/* NULL許可 */}
                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={col.nullable !== false}
                          onChange={e => onUpdateColumn(index, { nullable: e.target.checked })}
                          className="form-checkbox h-4 w-4 text-brand-secondary"
                        />
                        <span className="text-xs">NULL許可</span>
                      </label>
                    </div>

                    {/* デフォルト値 */}
                    <div>
                      <label className="block text-xs font-medium mb-1">デフォルト値（オプション）</label>
                      <input
                        type="text"
                        value={col.defaultValue !== undefined ? String(col.defaultValue) : ''}
                        onChange={e => {
                          const value = e.target.value;
                          onUpdateColumn(index, { 
                            defaultValue: value === '' ? undefined : value 
                          });
                        }}
                        placeholder="例: 0, 'default', NULL"
                        className="w-full bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-secondary focus:outline-none"
                      />
                    </div>

                    {/* UNIQUE制約 */}
                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={col.isUnique === true}
                          onChange={e => onUpdateColumn(index, { isUnique: e.target.checked })}
                          className="form-checkbox h-4 w-4 text-brand-secondary"
                        />
                        <span className="text-xs">UNIQUE制約</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};


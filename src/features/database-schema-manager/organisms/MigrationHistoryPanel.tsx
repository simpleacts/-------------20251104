// マイグレーション履歴パネル

import React, { useState } from 'react';
import { MigrationHistory } from '@shared/types/migration';
import { TrashIcon, ArrowUturnLeftIcon } from '@components/atoms';

interface MigrationHistoryPanelProps {
  tableName: string;
  history: MigrationHistory[];
  onRollback: (migrationId: string) => void;
  onDeleteHistory: (migrationId: string) => void;
}

export const MigrationHistoryPanel: React.FC<MigrationHistoryPanelProps> = ({
  tableName,
  history,
  onRollback,
  onDeleteHistory
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-md p-4">
      <h3 className="text-lg font-bold mb-4">変更履歴: {tableName}</h3>
      
      {history.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">変更履歴がありません</p>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {history.map((migration) => {
            const isExpanded = expandedItems.has(migration.id);
            const isRolledBack = migration.status === 'rolled_back';

            return (
              <div
                key={migration.id}
                className={`border rounded-md p-3 ${
                  isRolledBack
                    ? 'bg-gray-100 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700 opacity-60'
                    : 'bg-base-200 dark:bg-base-dark-300 border-base-300 dark:border-base-dark-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleExpand(migration.id)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(migration.appliedAt)}
                      </span>
                      {isRolledBack && (
                        <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                          ロールバック済み
                        </span>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {migration.changes.length}件の変更
                      </span>
                    </div>
                    {migration.description && (
                      <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">
                        {migration.description}
                      </p>
                    )}
                  </button>
                  <div className="flex items-center gap-2">
                    {!isRolledBack && (
                      <button
                        onClick={() => onRollback(migration.id)}
                        className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                        title="ロールバック"
                      >
                        <ArrowUturnLeftIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (window.confirm('この履歴を削除しますか？')) {
                          onDeleteHistory(migration.id);
                        }
                      }}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                      title="履歴を削除"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-3 pt-3 border-t border-base-300 dark:border-base-dark-400">
                    {/* 変更内容 */}
                    <div>
                      <h4 className="text-xs font-medium mb-2">変更内容</h4>
                      <div className="space-y-1">
                        {migration.changes.map((change, index) => (
                          <div key={index} className="text-xs bg-base-300 dark:bg-base-dark-400 p-2 rounded">
                            <span className="font-medium">
                              {change.type === 'ADD_COLUMN' ? '追加' :
                               change.type === 'MODIFY_COLUMN' ? '変更' :
                               change.type === 'DROP_COLUMN' ? '削除' :
                               'リネーム'}: {change.columnName}
                            </span>
                            {change.newColumnName && (
                              <span> → {change.newColumnName}</span>
                            )}
                            {change.newType && (
                              <span className="text-gray-500 dark:text-gray-400"> ({change.newType})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 実行されたSQL文 */}
                    <div>
                      <h4 className="text-xs font-medium mb-2">実行されたSQL文</h4>
                      <pre className="text-xs bg-base-300 dark:bg-base-dark-400 p-2 rounded overflow-x-auto">
                        <code>{migration.sqlStatements.join('\n\n')}</code>
                      </pre>
                    </div>

                    {/* ロールバック用SQL文 */}
                    {migration.rollbackSqlStatements.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium mb-2">ロールバック用SQL文</h4>
                        <pre className="text-xs bg-orange-100 dark:bg-orange-900/30 p-2 rounded overflow-x-auto">
                          <code>{migration.rollbackSqlStatements.join('\n\n')}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


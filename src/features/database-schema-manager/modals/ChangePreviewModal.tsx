// 変更プレビューモーダル

import React from 'react';
import { SchemaChangePreview } from '@shared/types/schema';
import { XMarkIcon } from '@components/atoms';

interface ChangePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  preview: SchemaChangePreview | null;
  onApply?: () => void;
}

export const ChangePreviewModal: React.FC<ChangePreviewModalProps> = ({
  isOpen,
  onClose,
  preview,
  onApply
}) => {
  if (!isOpen || !preview) return null;

  const addCount = preview.changes.filter(c => c.type === 'ADD_COLUMN').length;
  const modifyCount = preview.changes.filter(c => c.type === 'MODIFY_COLUMN').length;
  const dropCount = preview.changes.filter(c => c.type === 'DROP_COLUMN').length;
  const renameCount = preview.changes.filter(c => c.type === 'RENAME_COLUMN').length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="flex justify-between items-center p-4 border-b border-default dark:border-default-dark">
          <h2 className="text-xl font-bold">変更プレビュー: {preview.tableName}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </header>

        <main className="overflow-y-auto p-6 space-y-4">
          {/* 変更サマリー */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-md">
              <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">{addCount}</div>
              <div className="text-sm text-blue-600 dark:text-blue-400">追加</div>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-md">
              <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">{modifyCount}</div>
              <div className="text-sm text-yellow-600 dark:text-yellow-400">変更</div>
            </div>
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-md">
              <div className="text-2xl font-bold text-red-800 dark:text-red-200">{dropCount}</div>
              <div className="text-sm text-red-600 dark:text-red-400">削除</div>
            </div>
            <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-md">
              <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">{renameCount}</div>
              <div className="text-sm text-purple-600 dark:text-purple-400">リネーム</div>
            </div>
          </div>

          {/* 影響を受ける行数 */}
          {preview.estimatedAffectedRows !== undefined && (
            <div className="bg-gray-100 dark:bg-gray-800/50 p-3 rounded-md">
              <p className="text-sm">
                <span className="font-medium">影響を受ける行数:</span> 約 {preview.estimatedAffectedRows.toLocaleString()} 行
              </p>
            </div>
          )}

          {/* 警告 */}
          {preview.warnings.length > 0 && (
            <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-md p-4">
              <h3 className="font-bold text-yellow-800 dark:text-yellow-200 mb-2">⚠️ 警告</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                {preview.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* データ変換が必要な場合 */}
          {preview.dataConversionNeeded && (
            <div className="bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-md p-4">
              <h3 className="font-bold text-orange-800 dark:text-orange-200 mb-2">🔄 データ変換が必要</h3>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                型の変更により、データの変換が必要です。変換できない値はNULLになる可能性があります。
              </p>
            </div>
          )}

          {/* 変更詳細 */}
          <div>
            <h3 className="font-bold mb-3">変更詳細</h3>
            <div className="space-y-2">
              {preview.changes.map((change, index) => (
                <div key={index} className="border rounded-md p-3 bg-base-200 dark:bg-base-dark-300">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          change.type === 'ADD_COLUMN' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' :
                          change.type === 'MODIFY_COLUMN' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
                          change.type === 'DROP_COLUMN' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' :
                          'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
                        }`}>
                          {change.type === 'ADD_COLUMN' ? '追加' :
                           change.type === 'MODIFY_COLUMN' ? '変更' :
                           change.type === 'DROP_COLUMN' ? '削除' :
                           'リネーム'}
                        </span>
                        <span className="font-medium">{change.columnName}</span>
                        {change.newColumnName && (
                          <>
                            <span>→</span>
                            <span className="font-medium">{change.newColumnName}</span>
                          </>
                        )}
                        {change.newType && (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            ({change.newType})
                          </span>
                        )}
                      </div>
                      {change.sql && (
                        <pre className="text-xs bg-base-300 dark:bg-base-dark-400 p-2 rounded mt-2 overflow-x-auto">
                          <code>{change.sql}</code>
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 生成されるSQL文 */}
          <div>
            <h3 className="font-bold mb-3">生成されるSQL文</h3>
            <pre className="bg-base-300 dark:bg-base-dark-400 p-4 rounded-md overflow-x-auto text-sm">
              <code>
                {preview.changes
                  .map(change => change.sql)
                  .filter(Boolean)
                  .join('\n\n') || '変更なし'}
              </code>
            </pre>
          </div>
        </main>

        <footer className="flex justify-end gap-3 p-4 bg-base-200 dark:bg-base-dark-300/50 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-md bg-button-muted-bg text-button-muted dark:bg-button-muted-bg-dark dark:text-button-muted-dark hover:opacity-90"
          >
            閉じる
          </button>
          {onApply && (
            <button
              type="button"
              onClick={onApply}
              className="px-4 py-2 text-sm font-medium rounded-md bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark hover:opacity-90"
            >
              変更を適用
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};


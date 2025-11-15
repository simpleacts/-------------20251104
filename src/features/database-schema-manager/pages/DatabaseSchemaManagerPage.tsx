// データベーススキーマ管理ツールのメインページ

import React, { useState } from 'react';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { PageHeader } from '@components/molecules';
import { useSchemaManager } from '../hooks/useSchemaManager';
import { TableList } from '../organisms/TableList';
import { SchemaEditorPanel } from '../organisms/SchemaEditorPanel';
import { MigrationHistoryPanel } from '../organisms/MigrationHistoryPanel';
import { Button } from '@components/atoms';
import { ChangePreviewModal } from '../modals/ChangePreviewModal';

export const DatabaseSchemaManagerPage: React.FC = () => {
  const { database } = useDatabase();
  const {
    allTables,
    selectedTable,
    selectedTableInfo,
    localSchema,
    isLoading,
    error,
    migrationHistory,
    schemaCache,
    selectTable,
    updateColumn,
    addColumn,
    removeColumn,
    generateChangePreview,
    saveSchema,
    rollbackMigration,
    deleteHistory,
    setError
  } = useSchemaManager();

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const handleSave = async () => {
    const preview = generateChangePreview();
    if (preview && preview.warnings.length > 0) {
      const confirmed = window.confirm(
        `以下の警告があります:\n\n${preview.warnings.join('\n')}\n\n続行しますか？`
      );
      if (!confirmed) return;
    }

    await saveSchema();
    alert('スキーマを保存しました。');
    setIsPreviewModalOpen(false);
  };

  const handlePreview = () => {
    const preview = generateChangePreview();
    if (!preview || preview.changes.length === 0) {
      alert('変更がありません。');
      return;
    }
    setIsPreviewModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="データベーススキーマ管理"
        description="テーブルの構造を管理・変更できます"
      >
        <div className="flex gap-2">
          {selectedTable && (
            <>
              <Button
                onClick={handlePreview}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                変更プレビュー
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {isLoading ? '保存中...' : 'スキーマを保存'}
              </Button>
            </>
          )}
        </div>
      </PageHeader>

      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-md">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline"
          >
            閉じる
          </button>
        </div>
      )}

      <div className="flex-1 overflow-hidden p-4">
        <div className="grid grid-cols-3 gap-4 h-full">
          {/* 左側: テーブル一覧 */}
          <div className="h-full overflow-hidden">
            <TableList
              tables={allTables}
              selectedTable={selectedTable}
              database={database}
              schemaCache={schemaCache}
              onSelectTable={selectTable}
            />
          </div>

          {/* 中央: スキーマ編集 */}
          <div className="h-full overflow-hidden">
            {selectedTable && selectedTableInfo ? (
              <SchemaEditorPanel
                tableName={selectedTable}
                schema={localSchema}
                onUpdateColumn={updateColumn}
                onAddColumn={addColumn}
                onRemoveColumn={removeColumn}
              />
            ) : (
              <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-md p-8 flex items-center justify-center h-full">
                <p className="text-gray-500 dark:text-gray-400">
                  左側からテーブルを選択してください
                </p>
              </div>
            )}
          </div>

          {/* 右側: 変更履歴 */}
          <div className="h-full overflow-hidden">
            {selectedTable ? (
              <MigrationHistoryPanel
                tableName={selectedTable}
                history={migrationHistory}
                onRollback={rollbackMigration}
                onDeleteHistory={deleteHistory}
              />
            ) : (
              <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-md p-8 flex items-center justify-center h-full">
                <p className="text-gray-500 dark:text-gray-400">
                  テーブルを選択すると変更履歴が表示されます
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 変更プレビューモーダル */}
      <ChangePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        preview={generateChangePreview()}
        onApply={handleSave}
      />
    </div>
  );
};

export default DatabaseSchemaManagerPage;

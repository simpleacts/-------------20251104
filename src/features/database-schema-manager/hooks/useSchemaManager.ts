// スキーマ管理フック

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { useAuth } from '@core/contexts/AuthContext';
import { Database, Table, Column, Row } from '@shared/types/common';
import { ExtendedColumn, DatabaseColumnType, SchemaChange, SchemaChangePreview } from '@shared/types/schema';
import { MigrationHistory, MigrationChange } from '@shared/types/migration';
import { getRecommendation } from '../utils/recommendations';
import { convertDataArray } from '../utils/typeConversion';
import { mapFrontendTypeToDbType, mapDbTypeToFrontendType } from '../utils/recommendations';
import { saveMigrationHistory, loadMigrationHistoryForTable, generateRollbackSQL } from '../utils/migrationStorage';
import { getStoredAppMode, isLiveMode, isCsvWritableMode } from '@core/utils/appMode';
import { saveTableToCsv } from '@core/utils/csvSaveHelper';

export const useSchemaManager = () => {
  const { database, setDatabase } = useDatabase();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [localSchema, setLocalSchema] = useState<ExtendedColumn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migrationHistory, setMigrationHistory] = useState<MigrationHistory[]>([]);
  const [schemaCache, setSchemaCache] = useState<Record<string, Column[]>>({});
  const [allTablesList, setAllTablesList] = useState<string[]>([]);

  // 専用APIからすべてのテーブル一覧を取得
  useEffect(() => {
    const fetchAllTables = async () => {
      try {
        const appMode = getStoredAppMode();
        if (isLiveMode(appMode)) {
          const response = await fetch('/api/database-schema-data.php?action=tables');
          if (response.ok) {
            const data = await response.json();
            if (data.tables && Array.isArray(data.tables)) {
              setAllTablesList(data.tables.sort());
            }
          }
        } else {
          // CSVデバッグモードの場合は、databaseコンテキストから取得
          if (database) {
            const tables = Object.keys(database).filter(key => {
              const table = database[key];
              return table && table.schema && Array.isArray(table.schema) && table.schema.length > 0;
            }).sort();
            setAllTablesList(tables);
          }
        }
      } catch (err) {
        console.error('Failed to fetch table list:', err);
        // フォールバック: databaseコンテキストから取得
        if (database) {
          const tables = Object.keys(database).filter(key => {
            const table = database[key];
            return table && table.schema && Array.isArray(table.schema) && table.schema.length > 0;
          }).sort();
          setAllTablesList(tables);
        }
      }
    };

    fetchAllTables();
  }, [database]);

  // すべてのテーブルを取得（専用APIから取得したリストを使用）
  const allTables = useMemo(() => {
    return allTablesList;
  }, [allTablesList]);

  // 選択されたテーブルの情報を取得
  const selectedTableInfo = useMemo(() => {
    if (!selectedTable) return null;
    
    // まずキャッシュから取得を試す
    const cachedSchema = schemaCache[selectedTable];
    if (cachedSchema && cachedSchema.length > 0) {
      return {
        name: selectedTable,
        schema: cachedSchema,
        data: [],
        rowCount: 0
      };
    }
    
    // フォールバック: databaseコンテキストから取得
    if (database && database[selectedTable]) {
      const table = database[selectedTable];
      return {
        name: selectedTable,
        schema: table.schema || [],
        data: table.data || [],
        rowCount: table.data?.length || 0
      };
    }
    
    return null;
  }, [selectedTable, schemaCache, database]);

  // スキーマを拡張カラム形式に変換
  const convertToExtendedSchema = useCallback((schema: Column[], tableName: string, data: Row[]): ExtendedColumn[] => {
    return schema.map(col => {
      const sampleData = data.slice(0, 100).map(row => row[col.name]).filter(v => v !== null && v !== undefined);
      const recommendation = getRecommendation(col.name, sampleData);
      
      return {
        id: col.id,
        name: col.name,
        type: mapFrontendTypeToDbType(col.type),
        dbType: mapFrontendTypeToDbType(col.type),
        recommendation: recommendation || undefined
      };
    });
  }, []);

  // テーブルを選択
  const selectTable = useCallback(async (tableName: string) => {
    setSelectedTable(tableName);
    setError(null);
    setIsLoading(true);
    
    try {
      let schema: Column[] = [];
      
      // まずキャッシュを確認
      if (schemaCache[tableName] && schemaCache[tableName].length > 0) {
        schema = schemaCache[tableName];
      } else {
        // 専用APIからスキーマを取得
        const appMode = getStoredAppMode();
        if (isLiveMode(appMode)) {
          try {
            const response = await fetch(`/api/database-schema-data.php?action=schema&tables=${encodeURIComponent(tableName)}`);
            if (response.ok) {
              const data = await response.json();
              if (data[tableName] && data[tableName].schema) {
                schema = data[tableName].schema;
                // キャッシュに保存
                setSchemaCache(prev => ({
                  ...prev,
                  [tableName]: schema
                }));
              }
            }
          } catch (err) {
            console.error('Failed to fetch schema from API:', err);
          }
        }
        
        // フォールバック: databaseコンテキストから取得
        if (schema.length === 0 && database && database[tableName]) {
          const table = database[tableName];
          schema = table.schema || [];
        }
      }
      
      // スキーマを拡張カラム形式に変換
      const extendedSchema = convertToExtendedSchema(
        schema,
        tableName,
        [] // データは取得しない
      );
      setLocalSchema(extendedSchema);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'スキーマの読み込みに失敗しました。');
    } finally {
      setIsLoading(false);
    }

    // マイグレーション履歴を読み込み
    const history = loadMigrationHistoryForTable(tableName);
    setMigrationHistory(history);
  }, [database, schemaCache, convertToExtendedSchema]);

  // カラムを更新
  const updateColumn = useCallback((index: number, updates: Partial<ExtendedColumn>) => {
    setLocalSchema(prev => {
      const newSchema = [...prev];
      newSchema[index] = { ...newSchema[index], ...updates };
      return newSchema;
    });
  }, []);

  // カラムを追加
  const addColumn = useCallback(() => {
    let newName = 'new_column';
    let counter = 1;
    while (localSchema.some(c => c.name === `${newName}_${counter}`)) {
      counter++;
    }
    newName = `${newName}_${counter}`;
    
    const newColumn: ExtendedColumn = {
      id: newName,
      name: newName,
      type: 'VARCHAR(255)',
      dbType: 'VARCHAR(255)',
      nullable: true,
      isPrimaryKey: false,
      isUnique: false
    };
    
    setLocalSchema(prev => [...prev, newColumn]);
  }, [localSchema]);

  // カラムを削除
  const removeColumn = useCallback((index: number) => {
    if (index === 0) {
      setError('主キーは削除できません。');
      return;
    }
    if (window.confirm(`列「${localSchema[index].name}」を削除しますか？`)) {
      setLocalSchema(prev => prev.filter((_, i) => i !== index));
    }
  }, [localSchema]);

  // スキーマ変更のプレビューを生成
  const generateChangePreview = useCallback((): SchemaChangePreview | null => {
    if (!selectedTable || !selectedTableInfo) return null;

    const changes: SchemaChange[] = [];
    const warnings: string[] = [];
    let dataConversionNeeded = false;

    const originalSchema = selectedTableInfo.schema;
    const newSchema = localSchema;

    // カラムの追加
    newSchema.forEach(newCol => {
      const originalCol = originalSchema.find(c => c.name === newCol.name);
      if (!originalCol) {
        const uniqueConstraint = newCol.isUnique ? ' UNIQUE' : '';
        changes.push({
          type: 'ADD_COLUMN',
          columnName: newCol.name,
          newColumn: newCol,
          sql: `ALTER TABLE \`${selectedTable}\` ADD COLUMN \`${newCol.name}\` ${newCol.dbType || newCol.type}${newCol.nullable === false ? ' NOT NULL' : ''}${newCol.defaultValue !== undefined ? ` DEFAULT '${newCol.defaultValue}'` : ''}${uniqueConstraint};`
        });
      }
    });

    // カラムの削除
    originalSchema.forEach(originalCol => {
      const newCol = newSchema.find(c => c.name === originalCol.name);
      if (!newCol) {
        changes.push({
          type: 'DROP_COLUMN',
          columnName: originalCol.name,
          sql: `ALTER TABLE \`${selectedTable}\` DROP COLUMN \`${originalCol.name}\`;`
        });
        warnings.push(`カラム「${originalCol.name}」を削除すると、データが失われます。`);
      }
    });

    // カラムの変更
    originalSchema.forEach(originalCol => {
      const newCol = newSchema.find(c => c.name === originalCol.name);
      if (newCol) {
        const originalDbType = mapFrontendTypeToDbType(originalCol.type);
        const newDbType = newCol.dbType || newCol.type;

        // 型の変更
        if (originalDbType !== newDbType) {
          dataConversionNeeded = true;
          const uniqueConstraint = newCol.isUnique ? ' UNIQUE' : '';
          changes.push({
            type: 'MODIFY_COLUMN',
            columnName: originalCol.name,
            newType: newDbType,
            sql: `ALTER TABLE \`${selectedTable}\` MODIFY COLUMN \`${originalCol.name}\` ${newDbType}${newCol.nullable === false ? ' NOT NULL' : ''}${newCol.defaultValue !== undefined ? ` DEFAULT '${newCol.defaultValue}'` : ''}${uniqueConstraint};`
          });
          warnings.push(`カラム「${originalCol.name}」の型を変更します（${originalDbType} → ${newDbType}）。データ変換が必要です。`);
        }

        // 名前の変更
        if (originalCol.name !== newCol.name && originalCol.id === newCol.id) {
          changes.push({
            type: 'RENAME_COLUMN',
            columnName: originalCol.name,
            newColumnName: newCol.name,
            sql: `ALTER TABLE \`${selectedTable}\` RENAME COLUMN \`${originalCol.name}\` TO \`${newCol.name}\`;`
          });
        }
      }
    });

    return {
      tableName: selectedTable,
      changes,
      dataConversionNeeded,
      warnings,
      estimatedAffectedRows: selectedTableInfo.rowCount
    };
  }, [selectedTable, selectedTableInfo, localSchema]);

  // スキーマを保存（フロントエンド側のみ）
  const saveSchema = useCallback(async () => {
    if (!selectedTable || !database) return;

    setIsLoading(true);
    setError(null);

    try {
      // フロントエンド側のスキーマを更新
      const frontendSchema: Column[] = localSchema.map(col => ({
        id: col.id,
        name: col.name,
        type: mapDbTypeToFrontendType(col.type)
      }));

      setDatabase(prev => {
        if (!prev) return null;
        return {
          ...prev,
          [selectedTable]: {
            ...prev[selectedTable],
            schema: frontendSchema
          }
        };
      });

      // データベースに変更を適用
      const preview = generateChangePreview();
      if (preview && preview.changes.length > 0) {
        // ロールバック用のSQL文を生成（変更前の状態を保存）
        const originalSchema = selectedTableInfo?.schema || [];
        const rollbackChanges: MigrationChange[] = preview.changes.map(change => {
          const originalCol = originalSchema.find(c => c.name === change.columnName);
          return {
            ...change,
            tableName: selectedTable || '',
            originalColumn: originalCol ? {
              name: originalCol.name,
              type: mapFrontendTypeToDbType(originalCol.type),
              nullable: true,
              defaultValue: undefined,
              isUnique: false
            } : undefined
          };
        });

        // AppMode分岐: csv-writableモードの場合はCSVにスキーマを保存
        const appMode = getStoredAppMode();
        if (isCsvWritableMode(appMode)) {
          // CSVモード: スキーマをCSVに保存（ALTER SQLは生成のみ）
          const currentTable = database?.[selectedTable || ''];
          if (currentTable) {
            const saved = await saveTableToCsv(selectedTable || '', {
              data: currentTable.data || [],
              schema: frontendSchema
            });
            
            if (!saved) {
              throw new Error('CSVへのスキーマ保存に失敗しました。');
            }
          }
          
          // ALTER SQLは生成のみ（プレビュー表示用）
          console.log('[SchemaManager] Generated ALTER SQL (CSV mode):', preview.changes.map(c => c.sql).join(';\n'));
        } else {
          // Liveモード: 既存のAPIを使用して実DBを変更
          const response = await fetch('/api/alter-table.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              table: selectedTable,
              changes: preview.changes,
              dry_run: false
            })
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || 'データベースの変更に失敗しました。');
          }
        }

        // マイグレーション履歴を保存
        const migration: MigrationHistory = {
          id: `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tableName: selectedTable || '',
          appliedAt: new Date().toISOString(),
          appliedBy: undefined, // ユーザー情報は後で追加可能
          changes: rollbackChanges,
          sqlStatements: preview.changes.map(c => c.sql || '').filter(Boolean),
          rollbackSqlStatements: generateRollbackSQL(rollbackChanges),
          description: `スキーマ変更: ${preview.changes.length}件の変更`,
          status: 'applied'
        };

        saveMigrationHistory(migration);
        
        // 履歴を再読み込み
        const history = loadMigrationHistoryForTable(selectedTable || '');
        setMigrationHistory(history);
        
        // キャッシュをクリアして、データベースから最新のスキーマを再取得
        setSchemaCache(prev => {
          const newCache = { ...prev };
          delete newCache[selectedTable || ''];
          return newCache;
        });
        
        // データベースから最新のスキーマを再取得
        const appMode = getStoredAppMode();
        if (isLiveMode(appMode)) {
          try {
            const refreshResponse = await fetch(`/api/database-schema-data.php?action=schema&tables=${encodeURIComponent(selectedTable || '')}`);
            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              if (refreshData[selectedTable || ''] && refreshData[selectedTable || ''].schema) {
                const refreshedSchema = refreshData[selectedTable || ''].schema;
                // キャッシュに保存
                setSchemaCache(prev => ({
                  ...prev,
                  [selectedTable || '']: refreshedSchema
                }));
                // ローカルスキーマも更新
                const refreshedExtendedSchema = convertToExtendedSchema(
                  refreshedSchema,
                  selectedTable || '',
                  []
                );
                setLocalSchema(refreshedExtendedSchema);
              }
            }
          } catch (err) {
            console.warn('Failed to refresh schema after save:', err);
            // エラーが発生した場合は、保存したスキーマを使用
            setSchemaCache(prev => ({
              ...prev,
              [selectedTable || '']: frontendSchema
            }));
          }
        } else {
          // CSVデバッグモードの場合は、保存したスキーマを使用
          setSchemaCache(prev => ({
            ...prev,
            [selectedTable || '']: frontendSchema
          }));
        }
      }

      // settingsテーブルにスキーマを保存（フロントエンド側のスキーマ定義）
      const schemaKey = `table_schema_${selectedTable}`;
      const schemaValue = JSON.stringify(frontendSchema);
      
      try {
        const updateResponse = await fetch('/api/update-data.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: 'settings',
            operations: [{
              type: 'UPDATE',
              data: { value: schemaValue },
              where: { key: schemaKey }
            }],
            tool_name: 'database-schema-manager'
          })
        });

        const updateResult = await updateResponse.json();
        if (!updateResult.success) {
          console.warn('Settingsテーブルへの保存に失敗しました:', updateResult.error);
        }
      } catch (err) {
        console.warn('Settingsテーブルへの保存中にエラーが発生しました:', err);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'スキーマの保存に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTable, database, localSchema, setDatabase, generateChangePreview, selectedTableInfo]);

  // ロールバック実行
  const rollbackMigration = useCallback(async (migrationId: string) => {
    if (!selectedTable) return;

    setIsLoading(true);
    setError(null);

    try {
      const migration = migrationHistory.find(m => m.id === migrationId);
      if (!migration) {
        throw new Error('マイグレーション履歴が見つかりません。');
      }

      if (migration.status === 'rolled_back') {
        throw new Error('このマイグレーションは既にロールバックされています。');
      }

      // ロールバックSQLを実行
      if (migration.rollbackSqlStatements.length > 0) {
        const response = await fetch('/api/alter-table.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: selectedTable,
            changes: migration.rollbackSqlStatements.map(sql => ({
              type: 'CUSTOM_SQL',
              sql: sql
            })),
            dry_run: false
          })
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'ロールバックに失敗しました。');
        }
      }

      // マイグレーション履歴を更新
      const { updateMigrationHistory } = await import('../utils/migrationStorage');
      updateMigrationHistory(migrationId, { status: 'rolled_back' });

      // 履歴を再読み込み
      const history = loadMigrationHistoryForTable(selectedTable);
      setMigrationHistory(history);

      // スキーマを再読み込み（キャッシュをクリアして再取得）
      setSchemaCache(prev => {
        const newCache = { ...prev };
        delete newCache[selectedTable];
        return newCache;
      });
      
      // テーブルを再選択してスキーマを再取得
      await selectTable(selectedTable);

      alert('ロールバックが完了しました。');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ロールバックに失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTable, migrationHistory, selectTable]);

  // 履歴を削除
  const deleteHistory = useCallback((migrationId: string) => {
    const { deleteMigrationHistory } = require('../utils/migrationStorage');
    deleteMigrationHistory(migrationId);
    
    const history = loadMigrationHistoryForTable(selectedTable || '');
    setMigrationHistory(history);
  }, [selectedTable]);

  return {
    allTables,
    selectedTable,
    selectedTableInfo,
    localSchema,
    isLoading,
    error,
    migrationHistory,
    schemaCache, // スキーマキャッシュを公開（TableListで使用）
    selectTable,
    updateColumn,
    addColumn,
    removeColumn,
    generateChangePreview,
    saveSchema,
    rollbackMigration,
    deleteHistory,
    setError
  };
};


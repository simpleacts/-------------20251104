// マイグレーション履歴の保存・読み込み

import { MigrationHistory } from '@shared/types/migration';

const MIGRATION_STORAGE_KEY = 'database_schema_migrations';

/**
 * マイグレーション履歴を保存
 */
export function saveMigrationHistory(migration: MigrationHistory): void {
  try {
    const existing = loadAllMigrationHistory();
    existing.push(migration);
    localStorage.setItem(MIGRATION_STORAGE_KEY, JSON.stringify(existing));
  } catch (error) {
    console.error('Failed to save migration history:', error);
  }
}

/**
 * すべてのマイグレーション履歴を読み込み
 */
export function loadAllMigrationHistory(): MigrationHistory[] {
  try {
    const stored = localStorage.getItem(MIGRATION_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load migration history:', error);
    return [];
  }
}

/**
 * 特定のテーブルのマイグレーション履歴を読み込み
 */
export function loadMigrationHistoryForTable(tableName: string): MigrationHistory[] {
  const all = loadAllMigrationHistory();
  return all.filter(m => m.tableName === tableName).sort((a, b) => 
    new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
  );
}

/**
 * マイグレーション履歴を更新（ロールバック状態など）
 */
export function updateMigrationHistory(migrationId: string, updates: Partial<MigrationHistory>): void {
  try {
    const all = loadAllMigrationHistory();
    const index = all.findIndex(m => m.id === migrationId);
    if (index >= 0) {
      all[index] = { ...all[index], ...updates };
      localStorage.setItem(MIGRATION_STORAGE_KEY, JSON.stringify(all));
    }
  } catch (error) {
    console.error('Failed to update migration history:', error);
  }
}

/**
 * マイグレーション履歴を削除
 */
export function deleteMigrationHistory(migrationId: string): void {
  try {
    const all = loadAllMigrationHistory();
    const filtered = all.filter(m => m.id !== migrationId);
    localStorage.setItem(MIGRATION_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete migration history:', error);
  }
}

/**
 * ロールバック用のSQL文を生成
 */
export function generateRollbackSQL(changes: MigrationHistory['changes']): string[] {
  const rollbackStatements: string[] = [];

  // 変更を逆順に処理
  for (let i = changes.length - 1; i >= 0; i--) {
    const change = changes[i];

    switch (change.type) {
      case 'ADD_COLUMN':
        // 追加の逆は削除
        rollbackStatements.push(`ALTER TABLE \`${change.tableName || ''}\` DROP COLUMN \`${change.columnName}\`;`);
        break;

      case 'DROP_COLUMN':
        // 削除の逆は追加（元の情報が必要）
        if (change.originalColumn) {
          const col = change.originalColumn;
          const dbType = col.dbType || col.type || 'VARCHAR(255)';
          const nullable = col.nullable !== false ? '' : ' NOT NULL';
          const defaultVal = col.defaultValue !== undefined ? ` DEFAULT '${col.defaultValue}'` : '';
          const unique = col.isUnique ? ' UNIQUE' : '';
          rollbackStatements.push(
            `ALTER TABLE \`${change.tableName || ''}\` ADD COLUMN \`${change.columnName}\` ${dbType}${nullable}${defaultVal}${unique};`
          );
        }
        break;

      case 'MODIFY_COLUMN':
        // 変更の逆は元の型に戻す
        if (change.originalColumn) {
          const col = change.originalColumn;
          const dbType = col.dbType || col.type || 'VARCHAR(255)';
          const nullable = col.nullable !== false ? '' : ' NOT NULL';
          const defaultVal = col.defaultValue !== undefined ? ` DEFAULT '${col.defaultValue}'` : '';
          const unique = col.isUnique ? ' UNIQUE' : '';
          rollbackStatements.push(
            `ALTER TABLE \`${change.tableName || ''}\` MODIFY COLUMN \`${change.columnName}\` ${dbType}${nullable}${defaultVal}${unique};`
          );
        }
        break;

      case 'RENAME_COLUMN':
        // リネームの逆は元の名前に戻す
        if (change.newColumnName && change.columnName) {
          rollbackStatements.push(
            `ALTER TABLE \`${change.tableName || ''}\` RENAME COLUMN \`${change.newColumnName}\` TO \`${change.columnName}\`;`
          );
        }
        break;
    }
  }

  return rollbackStatements;
}


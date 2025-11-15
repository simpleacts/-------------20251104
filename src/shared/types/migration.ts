// マイグレーション管理用の型定義

// マイグレーション履歴
export interface MigrationHistory {
  id: string;
  tableName: string;
  appliedAt: string; // ISO 8601形式の日時
  appliedBy?: string; // ユーザーID（オプション）
  changes: MigrationChange[];
  sqlStatements: string[];
  rollbackSqlStatements: string[]; // ロールバック用のSQL文
  description?: string;
  status: 'applied' | 'rolled_back';
}

// マイグレーション変更
export interface MigrationChange {
  type: 'ADD_COLUMN' | 'MODIFY_COLUMN' | 'DROP_COLUMN' | 'RENAME_COLUMN';
  columnName: string;
  newColumnName?: string;
  newType?: string;
  newColumn?: any;
  originalColumn?: any; // ロールバック用の元の情報
}

// ロールバック操作
export interface RollbackOperation {
  migrationId: string;
  targetMigrationId?: string; // 特定のマイグレーションまで戻す場合
}


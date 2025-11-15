// データベーススキーマ管理用の型定義

// データベース型の拡張
export type DatabaseColumnType = 
  | 'TEXT'           // フロントエンド用（既存）
  | 'NUMBER'         // フロントエンド用（既存）
  | 'BOOLEAN'        // フロントエンド用（既存）
  | 'VARCHAR(255)'   // データベース用
  | 'TEXT_DB'        // データベース用（TEXT型）
  | 'INT'           // データベース用
  | 'DECIMAL(10,2)'  // データベース用
  | 'DATE'           // データベース用
  | 'DATETIME'       // データベース用
  | 'BOOLEAN_DB'     // データベース用（TINYINT(1)）
  | 'JSON';          // データベース用

// 拡張されたカラム定義
export interface ExtendedColumn {
  id: string;
  name: string;
  type: DatabaseColumnType;
  // データベース固有の属性
  dbType?: string;           // 実際のデータベース型（例: 'VARCHAR(255)'）
  nullable?: boolean;        // NULL許可
  defaultValue?: string | number | boolean | null;  // デフォルト値
  isPrimaryKey?: boolean;    // 主キー
  isUnique?: boolean;         // ユニーク制約
  // 推奨情報
  recommendation?: {
    recommendedType: DatabaseColumnType;
    reason: string;
    confidence: 'high' | 'medium' | 'low';
  };
}

// 型変換ルール
export interface TypeConversionRule {
  from: DatabaseColumnType;
  to: DatabaseColumnType;
  converter: (value: any) => any;
  description: string;
}

// スキーマ変更の操作
export interface SchemaChange {
  type: 'ADD_COLUMN' | 'MODIFY_COLUMN' | 'DROP_COLUMN' | 'RENAME_COLUMN';
  columnName: string;
  newColumnName?: string;
  newType?: DatabaseColumnType;
  newColumn?: ExtendedColumn;
  sql?: string;  // 生成されたSQL文
}

// スキーマ変更のプレビュー
export interface SchemaChangePreview {
  tableName: string;
  changes: SchemaChange[];
  dataConversionNeeded: boolean;
  warnings: string[];
  estimatedAffectedRows?: number;
}


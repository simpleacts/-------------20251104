// 型変換処理

import { DatabaseColumnType, TypeConversionRule } from '@shared/types/schema';

/**
 * 型変換ルールの定義
 */
export const TYPE_CONVERSION_RULES: TypeConversionRule[] = [
  {
    from: 'NUMBER',
    to: 'VARCHAR(255)',
    converter: (value: any) => {
      if (value === null || value === undefined) return null;
      return String(value);
    },
    description: '数値を文字列に変換（先頭0は保持されない）'
  },
  {
    from: 'TEXT',
    to: 'INT',
    converter: (value: any) => {
      if (value === null || value === undefined || value === '') return null;
      const num = Number(value);
      return isNaN(num) ? null : Math.floor(num);
    },
    description: '文字列を整数に変換（数値でない場合はNULL）'
  },
  {
    from: 'TEXT',
    to: 'DECIMAL(10,2)',
    converter: (value: any) => {
      if (value === null || value === undefined || value === '') return null;
      const num = Number(value);
      return isNaN(num) ? null : Math.round(num * 100) / 100;
    },
    description: '文字列を小数に変換（数値でない場合はNULL）'
  },
  {
    from: 'TEXT',
    to: 'DATE',
    converter: (value: any) => {
      if (value === null || value === undefined || value === '') return null;
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    },
    description: '文字列を日付に変換（無効な日付の場合はNULL）'
  },
  {
    from: 'TEXT',
    to: 'DATETIME',
    converter: (value: any) => {
      if (value === null || value === undefined || value === '') return null;
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date.toISOString().slice(0, 19).replace('T', ' ');
    },
    description: '文字列を日時に変換（無効な日時の場合はNULL）'
  },
  {
    from: 'BOOLEAN',
    to: 'VARCHAR(255)',
    converter: (value: any) => {
      if (value === null || value === undefined) return null;
      return value ? '1' : '0';
    },
    description: '真偽値を文字列に変換'
  },
  {
    from: 'TEXT',
    to: 'BOOLEAN_DB',
    converter: (value: any) => {
      if (value === null || value === undefined || value === '') return null;
      if (typeof value === 'boolean') return value ? 1 : 0;
      const str = String(value).toLowerCase();
      return (str === 'true' || str === '1' || str === 'yes') ? 1 : 0;
    },
    description: '文字列を真偽値に変換'
  }
];

/**
 * 型変換ルールを取得
 */
export function getConversionRule(
  from: DatabaseColumnType,
  to: DatabaseColumnType
): TypeConversionRule | null {
  // フロントエンド型をデータベース型にマッピング
  const fromDb = mapToDbType(from);
  const toDb = mapToDbType(to);

  // 同じ型の場合は変換不要
  if (fromDb === toDb) {
    return {
      from,
      to,
      converter: (value: any) => value,
      description: '変換不要'
    };
  }

  // ルールを検索
  return TYPE_CONVERSION_RULES.find(
    rule => rule.from === fromDb && rule.to === toDb
  ) || null;
}

/**
 * フロントエンド型をデータベース型にマッピング
 */
function mapToDbType(type: DatabaseColumnType): DatabaseColumnType {
  switch (type) {
    case 'TEXT':
      return 'VARCHAR(255)';
    case 'NUMBER':
      return 'INT';
    case 'BOOLEAN':
      return 'BOOLEAN_DB';
    default:
      return type;
  }
}

/**
 * データを変換
 */
export function convertValue(
  value: any,
  from: DatabaseColumnType,
  to: DatabaseColumnType
): any {
  const rule = getConversionRule(from, to);
  if (!rule) {
    console.warn(`型変換ルールが見つかりません: ${from} → ${to}`);
    return value;
  }
  return rule.converter(value);
}

/**
 * データ配列を一括変換
 */
export function convertDataArray(
  data: any[],
  columnName: string,
  from: DatabaseColumnType,
  to: DatabaseColumnType
): { converted: any[]; errors: number; warnings: string[] } {
  const converted: any[] = [];
  let errors = 0;
  const warnings: string[] = [];

  const rule = getConversionRule(from, to);
  if (!rule) {
    warnings.push(`型変換ルールが見つかりません: ${from} → ${to}`);
    return { converted: data, errors: 0, warnings };
  }

  for (const row of data) {
    try {
      const originalValue = row[columnName];
      const convertedValue = rule.converter(originalValue);
      
      // NULL変換の警告
      if (originalValue !== null && originalValue !== undefined && originalValue !== '' && convertedValue === null) {
        warnings.push(`値 "${originalValue}" がNULLに変換されました`);
      }

      converted.push({
        ...row,
        [columnName]: convertedValue
      });
    } catch (error) {
      errors++;
      converted.push(row); // エラー時は元の値を保持
    }
  }

  return { converted, errors, warnings };
}


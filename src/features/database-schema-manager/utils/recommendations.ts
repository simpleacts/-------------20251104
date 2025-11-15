// 推奨型判定ロジック

import { DatabaseColumnType, ExtendedColumn } from '@shared/types/schema';
import { Row } from '@shared/types/common';

// 推奨ルールの定義
interface RecommendationRule {
  namePatterns: RegExp[];
  recommendedType: DatabaseColumnType;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

const RECOMMENDATION_RULES: RecommendationRule[] = [
  {
    namePatterns: [/code$/i, /Code$/, /_code$/i, /_id$/i, /Id$/i],
    recommendedType: 'VARCHAR(255)',
    reason: 'コード系カラムは文字列型を推奨（先頭0保持のため）',
    confidence: 'high'
  },
  {
    namePatterns: [/price$/i, /cost$/i, /amount$/i, /quantity$/i, /count$/i, /total$/i],
    recommendedType: 'INT',
    reason: '数値計算が必要なカラムは数値型を推奨',
    confidence: 'high'
  },
  {
    namePatterns: [/date$/i, /Date$/i, /_date$/i, /Date$/],
    recommendedType: 'DATE',
    reason: '日付カラムはDATE型を推奨',
    confidence: 'high'
  },
  {
    namePatterns: [/created_at$/i, /updated_at$/i, /_at$/i, /At$/],
    recommendedType: 'DATETIME',
    reason: 'タイムスタンプカラムはDATETIME型を推奨',
    confidence: 'high'
  },
  {
    namePatterns: [/is_/i, /has_/i, /can_/i, /should_/i],
    recommendedType: 'BOOLEAN_DB',
    reason: '真偽値カラムはBOOLEAN型を推奨',
    confidence: 'medium'
  },
  {
    namePatterns: [/name$/i, /Name$/i, /_name$/i, /title$/i, /Title$/i, /description$/i, /Description$/i],
    recommendedType: 'VARCHAR(255)',
    reason: '名前・タイトル系カラムは文字列型を推奨',
    confidence: 'medium'
  },
  {
    namePatterns: [/json$/i, /Json$/i, /JSON$/i, /data$/i, /Data$/i],
    recommendedType: 'JSON',
    reason: 'JSONデータカラムはJSON型を推奨',
    confidence: 'medium'
  }
];

/**
 * カラム名から推奨型を判定
 */
export function getRecommendationFromColumnName(columnName: string): {
  recommendedType: DatabaseColumnType;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
} | null {
  for (const rule of RECOMMENDATION_RULES) {
    if (rule.namePatterns.some(pattern => pattern.test(columnName))) {
      return {
        recommendedType: rule.recommendedType,
        reason: rule.reason,
        confidence: rule.confidence
      };
    }
  }
  return null;
}

/**
 * データ内容から推奨型を判定
 */
export function getRecommendationFromData(
  columnName: string,
  sampleData: any[],
  maxSamples: number = 100
): {
  recommendedType: DatabaseColumnType;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
} | null {
  if (sampleData.length === 0) return null;

  const samples = sampleData.slice(0, maxSamples);
  const nonNullSamples = samples.filter(v => v !== null && v !== undefined && v !== '');

  if (nonNullSamples.length === 0) return null;

  // 先頭0のチェック
  const hasLeadingZeros = nonNullSamples.some(v => {
    const str = String(v);
    return /^0+[1-9]/.test(str) || (str.length > 1 && str.startsWith('0') && !str.includes('.'));
  });
  if (hasLeadingZeros) {
    return {
      recommendedType: 'VARCHAR(255)',
      reason: '先頭0が含まれているため文字列型を推奨',
      confidence: 'high'
    };
  }

  // すべて数値かチェック
  const allNumbers = nonNullSamples.every(v => {
    if (typeof v === 'number') return true;
    if (typeof v === 'string') {
      const num = Number(v);
      return !isNaN(num) && isFinite(num) && v.trim() !== '';
    }
    return false;
  });

  if (allNumbers && nonNullSamples.length > 0) {
    // 整数か小数かチェック
    const hasDecimals = nonNullSamples.some(v => {
      const num = typeof v === 'number' ? v : Number(v);
      return num % 1 !== 0;
    });

    if (hasDecimals) {
      return {
        recommendedType: 'DECIMAL(10,2)',
        reason: '小数が含まれているためDECIMAL型を推奨',
        confidence: 'medium'
      };
    } else {
      return {
        recommendedType: 'INT',
        reason: 'すべて整数のためINT型を推奨',
        confidence: 'medium'
      };
    }
  }

  // 日付形式のチェック
  const datePattern = /^\d{4}-\d{2}-\d{2}(\s\d{2}:\d{2}:\d{2})?$/;
  const allDates = nonNullSamples.every(v => {
    const str = String(v);
    return datePattern.test(str);
  });

  if (allDates && nonNullSamples.length > 0) {
    const hasTime = nonNullSamples.some(v => String(v).includes(':'));
    return {
      recommendedType: hasTime ? 'DATETIME' : 'DATE',
      reason: '日付形式のデータのため' + (hasTime ? 'DATETIME' : 'DATE') + '型を推奨',
      confidence: 'high'
    };
  }

  // 真偽値のチェック
  const allBooleans = nonNullSamples.every(v => 
    typeof v === 'boolean' || v === 'true' || v === 'false' || v === 1 || v === 0
  );
  if (allBooleans && nonNullSamples.length > 0) {
    return {
      recommendedType: 'BOOLEAN_DB',
      reason: '真偽値データのためBOOLEAN型を推奨',
      confidence: 'high'
    };
  }

  // JSON形式のチェック
  const allJson = nonNullSamples.every(v => {
    if (typeof v === 'string') {
      try {
        JSON.parse(v);
        return true;
      } catch {
        return false;
      }
    }
    return typeof v === 'object' && v !== null;
  });
  if (allJson && nonNullSamples.length > 0) {
    return {
      recommendedType: 'JSON',
      reason: 'JSON形式のデータのためJSON型を推奨',
      confidence: 'medium'
    };
  }

  return null;
}

/**
 * カラム名とデータ内容の両方から推奨型を判定（統合）
 */
export function getRecommendation(
  columnName: string,
  sampleData: any[]
): {
  recommendedType: DatabaseColumnType;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
} | null {
  // まずカラム名から推奨を取得
  const nameRecommendation = getRecommendationFromColumnName(columnName);
  
  // データ内容から推奨を取得
  const dataRecommendation = getRecommendationFromData(columnName, sampleData);

  // 両方の推奨がある場合、信頼度の高い方を優先
  if (nameRecommendation && dataRecommendation) {
    if (nameRecommendation.confidence === 'high' && dataRecommendation.confidence !== 'high') {
      return nameRecommendation;
    }
    if (dataRecommendation.confidence === 'high' && nameRecommendation.confidence !== 'high') {
      return dataRecommendation;
    }
    // 信頼度が同じ場合は、カラム名ベースの推奨を優先
    return nameRecommendation;
  }

  return nameRecommendation || dataRecommendation;
}

/**
 * フロントエンド型からデータベース型へのマッピング
 */
export function mapFrontendTypeToDbType(frontendType: 'TEXT' | 'NUMBER' | 'BOOLEAN'): DatabaseColumnType {
  switch (frontendType) {
    case 'TEXT':
      return 'VARCHAR(255)';
    case 'NUMBER':
      return 'INT';
    case 'BOOLEAN':
      return 'BOOLEAN_DB';
    default:
      return 'VARCHAR(255)';
  }
}

/**
 * データベース型からフロントエンド型へのマッピング
 */
export function mapDbTypeToFrontendType(dbType: DatabaseColumnType): 'TEXT' | 'NUMBER' | 'BOOLEAN' {
  if (dbType === 'INT' || dbType === 'DECIMAL(10,2)' || dbType === 'NUMBER') {
    return 'NUMBER';
  }
  if (dbType === 'BOOLEAN_DB' || dbType === 'BOOLEAN') {
    return 'BOOLEAN';
  }
  return 'TEXT';
}


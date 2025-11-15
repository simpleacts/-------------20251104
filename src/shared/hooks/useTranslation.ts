/**
 * 多言語対応フック
 * ツールごとの言語設定テーブルから翻訳を取得
 */

import { useMemo } from 'react';
import { useDatabase } from '../../core/contexts/DatabaseContext';
import { useNavigation } from '../../core/contexts/NavigationContext';
import { getLanguageTableName, COMMON_LANGUAGE_TABLE } from '../utils/languageUtils';
import { Row } from '../types';

/**
 * 現在の言語コードを取得（設定から）
 * デフォルトは'ja'
 */
function getCurrentLanguage(): string {
    // TODO: ユーザー設定から言語を取得
    // 現在は固定で'ja'
    return 'ja';
}

/**
 * 翻訳を取得するフック
 * @param toolName ツール名（オプション、指定しない場合は現在のページから推測）
 * @returns 翻訳関数
 */
export function useTranslation(toolName?: string) {
    const { database } = useDatabase();
    const { currentPage } = useNavigation();
    
    const targetTool = toolName || currentPage;
    const currentLang = getCurrentLanguage();
    
    // 言語設定テーブル名を取得
    const toolTableName = targetTool ? getLanguageTableName(targetTool) : null;
    
    // 共通とツール固有の言語設定をマージ
    const translations = useMemo(() => {
        const map = new Map<string, string>();
        
        // 共通の言語設定を読み込む
        const commonTable = database[COMMON_LANGUAGE_TABLE] as { data: Row[] } | undefined;
        if (commonTable?.data) {
            commonTable.data.forEach((row: Row) => {
                const key = row.key as string;
                const value = row[currentLang as keyof Row] as string;
                if (key && value) {
                    map.set(key, value);
                }
            });
        }
        
        // ツール固有の言語設定を読み込む（共通を上書き）
        if (toolTableName) {
            const toolTable = database[toolTableName] as { data: Row[] } | undefined;
            if (toolTable?.data) {
                toolTable.data.forEach((row: Row) => {
                    const key = row.key as string;
                    const value = row[currentLang as keyof Row] as string;
                    if (key && value) {
                        map.set(key, value);
                    }
                });
            }
        }
        
        // 後方互換性: 既存のlanguage_settingsテーブルも確認
        const legacyTable = database.language_settings as { data: Row[] } | undefined;
        if (legacyTable?.data) {
            legacyTable.data.forEach((row: Row) => {
                const key = row.key as string;
                const value = row[currentLang as keyof Row] as string;
                if (key && value && !map.has(key)) {
                    map.set(key, value);
                }
            });
        }
        
        return map;
    }, [database, toolTableName, currentLang]);
    
    /**
     * 翻訳関数
     * @param key 翻訳キー
     * @param fallback フォールバック文字列（キーが見つからない場合）
     * @param params パラメータ（{count: 10}など）
     * @returns 翻訳された文字列
     */
    const t = (key: string, fallback?: string, params?: Record<string, any>): string => {
        let text = translations.get(key) || fallback || key;
        // パラメータを置換（例: {count} -> 10）
        if (params) {
            Object.entries(params).forEach(([paramKey, paramValue]) => {
                text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
            });
        }
        return text;
    };
    
    return { t, currentLang };
}


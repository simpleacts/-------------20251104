/**
 * 言語設定関連のユーティリティ関数
 */

/**
 * ツール名（Page型）から言語設定テーブル名を取得
 * @param toolName ツール名（例: 'email-tool'）
 * @returns テーブル名（例: 'language_settings_email_tool'）
 */
export function getLanguageTableName(toolName: string): string {
    // ハイフンをアンダースコアに変換
    const tableName = toolName.replace(/-/g, '_');
    return `language_settings_${tableName}`;
}

/**
 * ツール名（Page型）からCSVファイルパスを取得
 * @param toolName ツール名（例: 'email-tool'）
 * @returns CSVファイルパス（例: 'templates/languages/email-tool/language_settings_email_tool.csv'）
 */
export function getLanguageCsvPath(toolName: string): string {
    const tableName = getLanguageTableName(toolName);
    return `templates/languages/${toolName}/${tableName}.csv`;
}

/**
 * 共通の言語設定テーブル名
 */
export const COMMON_LANGUAGE_TABLE = 'language_settings_common';

/**
 * 共通の言語設定CSVファイルパス
 */
export const COMMON_LANGUAGE_CSV_PATH = 'templates/languages/common/language_settings_common.csv';


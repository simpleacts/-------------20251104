/**
 * アプリケーションの動作モード
 * - live: サーバー上のデータベースと通信（本番環境）
 * - csv-debug: CSVファイルから読み込み（読み取り専用）
 * - csv-writable: CSVファイルから読み込み、変更時に自動保存
 */
export type AppMode = 'live' | 'csv-debug' | 'csv-writable';


/**
 * ツール名の翻訳をlanguage_settings_common.csvに追加
 */

const fs = require('fs');
const path = require('path');

const csvFile = path.join(__dirname, '..', 'templates', 'languages', 'common', 'language_settings_common.csv');

const tools = [
    { name: 'hub', ja: 'ダッシュボード', en: 'Dashboard' },
    { name: 'order-management', ja: '業務管理', en: 'Order Management' },
    { name: 'ai-task-management', ja: 'AIタスク管理', en: 'AI Task Management' },
    { name: 'production-scheduler', ja: '生産スケジューリング', en: 'Production Scheduler' },
    { name: 'customer-management', ja: '取引先管理', en: 'Customer Management' },
    { name: 'email-tool', ja: 'メール管理', en: 'Email Management' },
    { name: 'estimator', ja: '見積作成', en: 'Estimator' },
    { name: 'estimator-v2', ja: '見積作成（新バージョン）', en: 'Estimator (New Version)' },
    { name: 'proofing', ja: '仕上がりイメージ作成', en: 'Proofing' },
    { name: 'worksheet', ja: '指示書メーカー', en: 'Worksheet' },
    { name: 'accounts-receivable', ja: '売掛管理', en: 'Accounts Receivable' },
    { name: 'accounts-payable', ja: '買掛管理', en: 'Accounts Payable' },
    { name: 'document-management', ja: '帳票管理', en: 'Document Management' },
    { name: 'work-record', ja: '作業記録', en: 'Work Record' },
    { name: 'cash-flow-analysis', ja: '資金繰り分析', en: 'Cash Flow Analysis' },
    { name: 'task-analysis', ja: 'タスク分析', en: 'Task Analysis' },
    { name: 'product-management', ja: '商品データ管理', en: 'Product Management' },
    { name: 'product-definition-tool', ja: '商品定義管理', en: 'Product Definition' },
    { name: 'pricing-manager', ja: 'プリント単価表管理', en: 'Pricing Manager' },
    { name: 'pricing-assistant', ja: '価格設定アシスタント', en: 'Pricing Assistant' },
    { name: 'production-settings', ja: '生産設定ツール', en: 'Production Settings' },
    { name: 'task-settings', ja: 'タスク設定', en: 'Task Settings' },
    { name: 'print-history', ja: '印刷履歴登録', en: 'Print History' },
    { name: 'ink-mixing', ja: 'インク配合管理', en: 'Ink Mixing' },
    { name: 'ink-series-management', ja: 'インクシリーズ管理', en: 'Ink Series Management' },
    { name: 'ink-product-management', ja: 'インク製品管理', en: 'Ink Product Management' },
    { name: 'color-library-manager', ja: 'カラーライブラリ管理', en: 'Color Library Manager' },
    { name: 'dtf-cost-calculator', ja: 'DTF計算ロジック管理', en: 'DTF Cost Calculator' },
    { name: 'data-io', ja: 'データ入出力', en: 'Data I/O' },
    { name: 'image-converter', ja: 'ファイル名変換', en: 'Image Converter' },
    { name: 'image-batch-linker', ja: '商品画像一括紐付け', en: 'Image Batch Linker' },
    { name: 'pdf-template-manager', ja: 'PDFテンプレート管理', en: 'PDF Template Manager' },
    { name: 'pdf-item-group-manager', ja: 'PDF明細項目管理', en: 'PDF Item Group Manager' },
    { name: 'user-manager', ja: 'ユーザー管理', en: 'User Manager' },
    { name: 'permission-manager', ja: '権限管理', en: 'Permission Manager' },
    { name: 'id-manager', ja: 'ID形式管理', en: 'ID Format Manager' },
    { name: 'google-api-settings', ja: 'Google連携設定', en: 'Google API Settings' },
    { name: 'display-settings', ja: '表示設定', en: 'Display Settings' },
    { name: 'email-settings', ja: 'メール設定', en: 'Email Settings' },
    { name: 'estimator-settings', ja: '見積作成設定', en: 'Estimator Settings' },
    { name: 'pdf-preview-settings', ja: 'PDFプレビュー設定', en: 'PDF Preview Settings' },
    { name: 'backup-manager', ja: '自動バックアップ設定', en: 'Backup Manager' },
    { name: 'system-logs', ja: 'システムログ', en: 'System Logs' },
    { name: 'dev-management', ja: '開発管理ツール', en: 'Development Management' },
    { name: 'dev-tools', ja: '開発者向けツール', en: 'Developer Tools' },
    { name: 'dev-lock-manager', ja: '開発ロック管理', en: 'Dev Lock Manager' },
    { name: 'app-manager', ja: 'アプリケーション管理', en: 'Application Manager' },
    { name: 'tool-exporter', ja: 'ツールエクスポート', en: 'Tool Exporter' },
    { name: 'tool-porting-manager', ja: 'ツール移植管理', en: 'Tool Porting Manager' },
    { name: 'tool-guide', ja: '使い方ガイド', en: 'Tool Guide' },
    { name: 'tool-dependency-manager', ja: 'ツール依存性管理', en: 'Tool Dependency Manager' },
    { name: 'calculation-logic-manager', ja: '計算ロジック管理', en: 'Calculation Logic Manager' },
    { name: 'tool-dependency-scanner', ja: '依存関係スキャン', en: 'Dependency Scanner' },
    { name: 'unregistered-module-tool', ja: 'モジュールカタログ管理', en: 'Module Catalog' },
    { name: 'architecture-designer', ja: 'アーキテクチャ設計', en: 'Architecture Designer' },
    { name: 'php-info-viewer', ja: 'PHP情報ビューア', en: 'PHP Info Viewer' },
    { name: 'system-diagnostics', ja: 'システム診断', en: 'System Diagnostics' },
    { name: 'language-manager', ja: '言語管理', en: 'Language Manager' },
];

console.log('=== ツール名の翻訳をlanguage_settings_common.csvに追加中 ===\n');

// CSVファイルを読み込む
const csvContent = fs.readFileSync(csvFile, 'utf-8');
const lines = csvContent.trim().split('\n');

// 既存のキーを確認
const existingKeys = new Set(lines.slice(1).map(line => line.split(',')[0]));

// 新しい行を追加
const newLines = tools
    .filter(tool => !existingKeys.has(`tools.${tool.name}`))
    .map(tool => `tools.${tool.name},${tool.ja},${tool.en}`);

if (newLines.length > 0) {
    const updatedContent = csvContent.trim() + '\n' + newLines.join('\n') + '\n';
    fs.writeFileSync(csvFile, updatedContent, 'utf-8');
    console.log(`✓ ${newLines.length}件のツール名翻訳を追加しました`);
} else {
    console.log('✓ すべてのツール名翻訳は既に存在しています');
}

console.log('\n=== 完了 ===');
process.exit(0);

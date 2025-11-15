/**
 * user-manager用の翻訳をlanguage_settings_user_manager.csvに追加
 */

const fs = require('fs');
const path = require('path');

const csvFile = path.join(__dirname, '..', 'templates', 'languages', 'user-manager', 'language_settings_user_manager.csv');

const translations = [
    { key: 'permissions.title', ja: '権限管理ツール', en: 'Permission Manager' },
    { key: 'permissions.description', ja: 'ロールごとの機能アクセスとデータ操作権限を設定します。', en: 'Set feature access and data operation permissions for each role.' },
    { key: 'permissions.select_role', ja: 'ロールを選択:', en: 'Select Role:' },
    { key: 'permissions.tool_access', ja: 'ツールアクセス権限', en: 'Tool Access Permissions' },
    { key: 'permissions.toggle_all', ja: 'すべて切り替え', en: 'Toggle All' },
    { key: 'permissions.table_access', ja: 'データテーブル権限', en: 'Data Table Permissions' },
    { key: 'permissions.table_name', ja: 'テーブル名', en: 'Table Name' },
    { key: 'permissions.view', ja: '表示/閲覧', en: 'View' },
    { key: 'permissions.edit', ja: '編集', en: 'Edit' },
    { key: 'permissions.add', ja: '追加', en: 'Add' },
    { key: 'permissions.delete', ja: '削除', en: 'Delete' },
    { key: 'permissions.unsaved_changes', ja: '未保存の変更があります', en: 'You have unsaved changes' },
    { key: 'permissions.save_changes', ja: '変更を保存', en: 'Save Changes' },
    { key: 'permissions.saved', ja: '権限設定を保存しました。', en: 'Permissions saved successfully.' },
    { key: 'permissions.save_failed', ja: 'サーバーへの保存に失敗しました:', en: 'Failed to save to server:' },
];

console.log('=== user-manager用の翻訳を追加中 ===\n');

// CSVファイルを読み込む
let csvContent = '';
if (fs.existsSync(csvFile)) {
    csvContent = fs.readFileSync(csvFile, 'utf-8');
} else {
    // ファイルが存在しない場合はヘッダーを作成
    csvContent = 'key,ja,en\n';
    // ディレクトリを作成
    const dir = path.dirname(csvFile);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

const lines = csvContent.trim().split('\n');
const existingKeys = new Set(lines.slice(1).map(line => line.split(',')[0]));

// 新しい行を追加
const newLines = translations
    .filter(trans => !existingKeys.has(trans.key))
    .map(trans => `${trans.key},${trans.ja},${trans.en}`);

if (newLines.length > 0) {
    const updatedContent = csvContent.trim() + '\n' + newLines.join('\n') + '\n';
    fs.writeFileSync(csvFile, updatedContent, 'utf-8');
    console.log(`✓ ${newLines.length}件の翻訳を追加しました`);
} else {
    console.log('✓ すべての翻訳は既に存在しています');
}

console.log('\n=== 完了 ===');
process.exit(0);

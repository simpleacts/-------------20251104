/**
 * display-settings用の翻訳をlanguage_settings_common.csvに追加
 */

const fs = require('fs');
const path = require('path');

const csvFile = path.join(__dirname, '..', 'templates', 'languages', 'common', 'language_settings_common.csv');

const translations = [
    { key: 'tool_visibility.title', ja: 'ツール表示管理', en: 'Tool Visibility Management' },
    { key: 'tool_visibility.description', ja: 'デバイス（画面幅）ごとに、サイドバーに表示するツールを制御します。', en: 'Control which tools are displayed in the sidebar for each device (screen width).' },
    { key: 'tool_visibility.save', ja: '保存', en: 'Save' },
    { key: 'tool_visibility.unsaved_changes', ja: '未保存の変更があります', en: 'You have unsaved changes' },
    { key: 'tool_visibility.saved', ja: 'ツール表示設定を保存しました。', en: 'Tool visibility settings saved successfully.' },
    { key: 'tool_visibility.save_failed', ja: 'サーバーへの保存に失敗しました:', en: 'Failed to save to server:' },
];

console.log('=== display-settings用の翻訳を追加中 ===\n');

// CSVファイルを読み込む
const csvContent = fs.readFileSync(csvFile, 'utf-8');
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

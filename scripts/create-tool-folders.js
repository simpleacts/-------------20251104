/**
 * ツールごとのフォルダ構造を作成するスクリプト
 */

const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, '..', 'templates');

// ツールフォルダのリスト
const toolFolders = [
    'languages',
    'product-definition',
    'email-management',
    'task-settings',
    'ink-mixing',
    'order-management',
    'product-management',
    'pricing',
    'dtf',
    'pdf',
    'print-history',
    'system',
    'dev',
    'modules',
    'common'
];

console.log('ツールフォルダを作成中...');

toolFolders.forEach(folder => {
    const folderPath = path.join(templatesDir, folder);
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
        console.log(`✓ 作成: ${folder}/`);
    } else {
        console.log(` 既存: ${folder}/`);
    }
});

console.log('\n完了しました！');
process.exit(0);


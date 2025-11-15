const fs = require('fs');
const path = require('path');

console.log('--- Build Cleanup ---');

try {
    // 開発用のデータソース設定ファイル（ローカルCSV/JSONベース）
    const devDbSource = 'src/core/data/db.csv.api.ts.txt';
    // 現在アクティブなデータソース設定ファイル
    const activeDbFile = 'src/core/data/db.ts';

    if (fs.existsSync(devDbSource)) {
        // 開発用の設定をアクティブなファイルにコピーして復元
        fs.copyFileSync(devDbSource, activeDbFile);
        console.log(`Restored development database connection: ${devDbSource} -> ${activeDbFile}`);
    } else {
        console.warn(`Warning: Development database source file not found at ${devDbSource}. Could not restore.`);
    }

    console.log('--- Cleanup Complete ---');
    process.exit(0);
} catch (error) {
    console.error('An error occurred during build cleanup:', error);
    process.exit(1);
}

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MPDF_VERSION = '8.2.0';
const MPDF_URL = `https://github.com/mpdf/mpdf/archive/refs/tags/v${MPDF_VERSION}.zip`;
const VENDOR_DIR = path.join(__dirname, '..', 'vendor');
const MPDF_DIR = path.join(VENDOR_DIR, 'mpdf', 'mpdf');

console.log('mPDF手動インストールスクリプト');
console.log('================================');

// vendorディレクトリの作成
if (!fs.existsSync(VENDOR_DIR)) {
    fs.mkdirSync(VENDOR_DIR, { recursive: true });
    console.log('✓ vendorディレクトリを作成しました');
}

// mpdfディレクトリの作成
if (!fs.existsSync(MPDF_DIR)) {
    fs.mkdirSync(MPDF_DIR, { recursive: true });
    console.log('✓ mpdfディレクトリを作成しました');
}

console.log('\n⚠️ 注意: このスクリプトはmPDFを手動でダウンロードする必要があります。');
console.log('\n手動インストール手順:');
console.log(`1. 以下のURLからmPDF v${MPDF_VERSION}をダウンロード:`);
console.log(`   ${MPDF_URL}`);
console.log(`2. ZIPファイルを解凍`);
console.log(`3. 解凍したフォルダ内の内容を以下のディレクトリにコピー:`);
console.log(`   ${MPDF_DIR}`);
console.log(`4. autoload.phpを作成（次のステップで実行）`);

// autoload.phpの作成
const autoloadPath = path.join(VENDOR_DIR, 'autoload.php');
const autoloadContent = `<?php
// Simple autoloader for mPDF
spl_autoload_register(function ($class) {
    $prefix = 'Mpdf\\\\';
    $base_dir = __DIR__ . '/mpdf/mpdf/src/';
    
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }
    
    $relative_class = substr($class, $len);
    $file = $base_dir . str_replace('\\\\', '/', $relative_class) . '.php';
    
    if (file_exists($file)) {
        require $file;
    }
});
`;

if (!fs.existsSync(autoloadPath)) {
    fs.writeFileSync(autoloadPath, autoloadContent);
    console.log('\n✓ vendor/autoload.phpを作成しました');
} else {
    console.log('\n⚠️ vendor/autoload.phpは既に存在します');
}

console.log('\n完了！次に、mPDFのZIPファイルを手動でダウンロードして配置してください。');
process.exit(0);

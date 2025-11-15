const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, '..', 'mpdf-temp2');
const VENDOR_DIR = path.join(__dirname, '..', 'vendor');
const MPDF_DIR = path.join(VENDOR_DIR, 'mpdf', 'mpdf');

console.log('mPDFファイル配置スクリプト');
console.log('================================');

// 解凍されたディレクトリを探す
let extractedDir = null;
const possibleDirs = [
    path.join(TEMP_DIR, 'mpdf-8.2.0'),
    path.join(TEMP_DIR, 'mpdf-mpdf-8.2.0'),
    path.join(__dirname, '..', 'mpdf-temp', 'mpdf-8.2.0'),
];

for (const dir of possibleDirs) {
    if (fs.existsSync(dir)) {
        extractedDir = dir;
        console.log(`✓ 解凍されたディレクトリを発見: ${dir}`);
        break;
    }
}

if (!extractedDir) {
    // mpdf-temp2内のディレクトリを検索
    if (fs.existsSync(TEMP_DIR)) {
        const entries = fs.readdirSync(TEMP_DIR, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory() && entry.name.startsWith('mpdf')) {
                extractedDir = path.join(TEMP_DIR, entry.name);
                console.log(`✓ 解凍されたディレクトリを発見: ${extractedDir}`);
                break;
            }
        }
    }
}

if (!extractedDir) {
    console.error('❌ 解凍されたディレクトリが見つかりません');
    console.error('手動で解凍してください:');
    console.error('1. mpdf-temp.zipを解凍');
    console.error(`2. 解凍したフォルダ内の内容を ${MPDF_DIR} にコピー`);
    process.exit(1);
}

// ディレクトリの再帰的コピー
function copyDirRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// ファイルを配置
console.log('ファイルを配置中...');
if (!fs.existsSync(MPDF_DIR)) {
    fs.mkdirSync(MPDF_DIR, { recursive: true });
}
copyDirRecursive(extractedDir, MPDF_DIR);
console.log(`✓ ファイル配置完了: ${MPDF_DIR}`);

// autoload.phpの確認
const autoloadPath = path.join(VENDOR_DIR, 'autoload.php');
if (!fs.existsSync(autoloadPath)) {
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
    fs.writeFileSync(autoloadPath, autoloadContent);
    console.log('✓ vendor/autoload.phpを作成しました');
} else {
    console.log('✓ vendor/autoload.phpは既に存在します');
}

// インストール確認
const mpdfMainFile = path.join(MPDF_DIR, 'src', 'Mpdf.php');
if (fs.existsSync(mpdfMainFile)) {
    console.log('');
    console.log('================================');
    console.log('✓ mPDFのインストールが完了しました！');
    console.log(`   配置先: ${MPDF_DIR}`);
    console.log('================================');
} else {
    console.error('');
    console.error('⚠️ 警告: Mpdf.phpが見つかりません');
    console.error(`   期待されるパス: ${mpdfMainFile}`);
    process.exit(1);
}
process.exit(0);


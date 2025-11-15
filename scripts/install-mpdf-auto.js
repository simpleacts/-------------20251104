const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MPDF_VERSION = '8.2.0';
const MPDF_URL = `https://github.com/mpdf/mpdf/archive/refs/tags/v${MPDF_VERSION}.zip`;
const VENDOR_DIR = path.join(__dirname, '..', 'vendor');
const MPDF_DIR = path.join(VENDOR_DIR, 'mpdf', 'mpdf');
const ZIP_PATH = path.join(__dirname, '..', 'mpdf-temp.zip');
const TEMP_EXTRACT_DIR = path.join(__dirname, '..', 'mpdf-temp');

console.log('mPDF自動インストールスクリプト');
console.log('================================');
console.log(`ダウンロードURL: ${MPDF_URL}`);
console.log('');

// ダウンロード関数
function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                // リダイレクトの場合
                return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlinkSync(dest);
            reject(err);
        });
    });
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

async function installMpdf() {
    try {
        // 1. vendorディレクトリの作成
        if (!fs.existsSync(VENDOR_DIR)) {
            fs.mkdirSync(VENDOR_DIR, { recursive: true });
            console.log('✓ vendorディレクトリを作成しました');
        }

        // 2. ZIPファイルのダウンロード
        console.log('mPDFをダウンロード中...');
        await downloadFile(MPDF_URL, ZIP_PATH);
        console.log('✓ ダウンロード完了');

        // 3. ZIPファイルの解凍（Node.jsの標準機能では解凍できないため、外部ツールを使用）
        console.log('ZIPファイルを解凍中...');
        
        // Windowsの場合、PowerShellを使って解凍を試みる
        try {
            execSync(`powershell -Command "Expand-Archive -Path '${ZIP_PATH}' -DestinationPath '${TEMP_EXTRACT_DIR}' -Force"`, { stdio: 'inherit' });
            console.log('✓ 解凍完了');
        } catch (error) {
            console.error('⚠️ PowerShellでの解凍に失敗しました。手動で解凍してください。');
            console.error(`   ZIPファイル: ${ZIP_PATH}`);
            console.error(`   解凍先: ${TEMP_EXTRACT_DIR}`);
            throw error;
        }

        // 4. 解凍したファイルをvendor/mpdf/mpdfにコピー
        const extractedDir = path.join(TEMP_EXTRACT_DIR, `mpdf-${MPDF_VERSION}`);
        if (fs.existsSync(extractedDir)) {
            console.log('ファイルを配置中...');
            if (!fs.existsSync(MPDF_DIR)) {
                fs.mkdirSync(MPDF_DIR, { recursive: true });
            }
            copyDirRecursive(extractedDir, MPDF_DIR);
            console.log('✓ ファイル配置完了');
        } else {
            throw new Error(`解凍されたディレクトリが見つかりません: ${extractedDir}`);
        }

        // 5. 一時ファイルの削除
        console.log('一時ファイルを削除中...');
        if (fs.existsSync(ZIP_PATH)) {
            fs.unlinkSync(ZIP_PATH);
        }
        if (fs.existsSync(TEMP_EXTRACT_DIR)) {
            fs.rmSync(TEMP_EXTRACT_DIR, { recursive: true, force: true });
        }
        console.log('✓ 一時ファイル削除完了');

        // 6. autoload.phpの作成
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
            console.log('✓ vendor/autoload.phpを作成しました');
        }

        console.log('');
        console.log('================================');
        console.log('✓ mPDFのインストールが完了しました！');
        console.log(`   配置先: ${MPDF_DIR}`);
        console.log('================================');
        process.exit(0);

    } catch (error) {
        console.error('');
        console.error('❌ エラーが発生しました:');
        console.error(error.message);
        console.error('');
        console.error('手動インストール手順:');
        console.error(`1. ${MPDF_URL} からZIPファイルをダウンロード`);
        console.error(`2. ZIPファイルを解凍`);
        console.error(`3. 解凍したフォルダ内の内容を ${MPDF_DIR} にコピー`);
        process.exit(1);
    }
}

installMpdf().catch(() => {
    // エラーは既にinstallMpdf内で処理されている
});


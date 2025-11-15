# mPDF インストールガイド

## 方法1: Composerを使用（推奨）

### 1. Composerのインストール

Windowsの場合：
1. https://getcomposer.org/download/ にアクセス
2. "Composer-Setup.exe"をダウンロードして実行
3. インストールウィザードに従ってインストール

### 2. mPDFのインストール

Composerのインストールが完了したら、プロジェクトのルートディレクトリで以下を実行：
```bash
composer install
```

これで`vendor`ディレクトリが作成され、mPDFがインストールされます。

### 3. ビルド実行

```bash
npm run build
```

これで`dist/vendor`と`dist/cache`が自動的に作成されます。

## 方法2: 手動インストール（Composerなし）

Composerを使用しない場合、以下の手順でmPDFを手動でインストールできます。

### 1. mPDFのダウンロード

1. https://github.com/mpdf/mpdf/releases にアクセス
2. 最新版（v8.2.x）のZIPファイルをダウンロード
3. ZIPファイルを解凍

### 2. ディレクトリ構造の作成

プロジェクトルートに以下のディレクトリ構造を作成：
```
vendor/
└── mpdf/
    └── mpdf/
        └── (ダウンロードしたmPDFのファイル)
```

### 3. autoload.phpの作成

`vendor/autoload.php`ファイルを作成し、以下の内容を記述：

```php
<?php
// Simple autoloader for mPDF
spl_autoload_register(function ($class) {
    $prefix = 'Mpdf\\';
    $base_dir = __DIR__ . '/mpdf/mpdf/src/';
    
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }
    
    $relative_class = substr($class, $len);
    $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';
    
    if (file_exists($file)) {
        require $file;
    }
});
```

### 4. ビルド実行

```bash
npm run build
```

## 確認

インストールが完了したら、以下で確認できます：

1. `vendor/mpdf/mpdf/src/Mpdf.php`が存在することを確認
2. `npm run build`を実行して`dist/vendor`が作成されることを確認
3. サーバーで`dist/api/generate-pdf.php`が動作することを確認

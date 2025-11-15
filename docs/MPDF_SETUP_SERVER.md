# サーバーでのmPDFセットアップ手順

## 前提条件

サーバーに以下がインストールされている必要があります：
- PHP 7.4以上
- Composer

## セットアップ手順

### 1. サーバーにファイルをアップロード

`dist`ディレクトリの内容をサーバーにアップロードします。

### 2. サーバーでComposerをインストール（未インストールの場合）

```bash
# Composerのダウンロード
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
php composer-setup.php
php -r "unlink('composer-setup.php');"

# グローバルにインストール（オプション）
mv composer.phar /usr/local/bin/composer
```

### 3. サーバーでmPDFをインストール

サーバーのプロジェクトルート（`dist`ディレクトリの内容がアップロードされた場所）で：

```bash
# composer.jsonが存在することを確認
ls composer.json

# mPDFをインストール
composer install
```

これで`vendor`ディレクトリが作成され、mPDFがインストールされます。

### 4. キャッシュディレクトリの権限設定

```bash
# cacheディレクトリに書き込み権限を付与
chmod 755 cache
# または
chmod 777 cache
```

### 5. 動作確認

ブラウザで以下にアクセスして、PDF生成が動作することを確認：
- `https://your-domain.com/api/generate-pdf.php`

## トラブルシューティング

### Composerがインストールできない場合

手動でmPDFをダウンロードして配置：

1. https://github.com/mpdf/mpdf/releases から最新版をダウンロード
2. `vendor/mpdf/mpdf/`に配置
3. `vendor/autoload.php`を作成（詳細は`MPDF_INSTALLATION_GUIDE.md`を参照）

### 権限エラーが発生する場合

```bash
chmod -R 755 vendor
chmod -R 755 cache
```

### パスエラーが発生する場合

`dist/api/generate-pdf.php`のパスを確認：
- `require_once(__DIR__ . '/../../vendor/autoload.php');` が正しいことを確認
- `tempDir => __DIR__ . '/../../cache'` が正しいことを確認


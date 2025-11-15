# Composer セットアップガイド

## Composerとは

Composerは、PHPの依存関係管理ツールです。このプロジェクトでは、PDF生成ライブラリ（mPDF）などのPHPライブラリを管理するために使用されています。

## Composerのインストール方法（Windows）

### 方法1: インストーラーを使用（推奨）

1. **Composer公式サイトにアクセス**
   - https://getcomposer.org/download/ を開く

2. **Windows Installerをダウンロード**
   - 「Composer-Setup.exe」をダウンロード

3. **インストーラーを実行**
   - ダウンロードした`Composer-Setup.exe`を実行
   - インストールウィザードに従って進む
   - PHPのパスが自動検出されます（PHPを先にインストールしておく必要があります）

4. **インストール確認**
   - コマンドプロンプトまたはPowerShellを開く
   - 以下のコマンドを実行:
     ```bash
     composer --version
     ```
   - バージョン情報が表示されれば成功です

### 方法2: 手動インストール

1. **Composerをダウンロード**
   - https://getcomposer.org/download/ を開く
   - 「Manual Download」セクションから`composer.phar`をダウンロード

2. **composer.pharを配置**
   - プロジェクトのルートディレクトリに`composer.phar`を配置

3. **composer.batを作成**
   - プロジェクトのルートディレクトリに`composer.bat`というファイルを作成
   - 以下の内容を記述:
     ```batch
     @echo off
     php "%~dp0composer.phar" %*
     ```

## composer installの実行方法

### 前提条件

- PHPがインストールされていること
- Composerがインストールされていること
- プロジェクトのルートディレクトリに`composer.json`が存在すること

### 実行手順

1. **コマンドプロンプトまたはPowerShellを開く**

2. **プロジェクトのルートディレクトリに移動**
   ```bash
   cd C:\Users\yosuke\Downloads\プリント屋バックオフィス-20251104\プリント屋バックオフィス-20251104
   ```

3. **composer installを実行**
   ```bash
   composer install
   ```

4. **実行結果の確認**
   - 成功すると、`vendor`ディレクトリが作成されます
   - このディレクトリに必要なPHPライブラリがインストールされます

### 実行例

```bash
C:\Users\yosuke\Downloads\プリント屋バックオフィス-20251104\プリント屋バックオフィス-20251104> composer install
Loading composer repositories with package information
Installing dependencies (including require-dev) from lock file
Package operations: 1 install, 0 updates, 0 removals
  - Installing mpdf/mpdf (v8.2.0): Extracting archive
Generating autoload files
```

## トラブルシューティング

### エラー: "composer" は、内部コマンドまたは外部コマンド...として認識されていません

**原因**: Composerがインストールされていないか、PATHに追加されていません

**解決方法**:
1. Composerをインストール（方法1を参照）
2. インストール後、新しいコマンドプロンプトを開く
3. それでも動作しない場合は、環境変数PATHを確認

### エラー: PHPが認識されない

**原因**: PHPがインストールされていないか、PATHに追加されていません

**解決方法**:
1. PHPをインストール
2. 環境変数PATHにPHPのパスを追加
3. 新しいコマンドプロンプトを開いて再試行

### エラー: composer.jsonが見つからない

**原因**: 間違ったディレクトリでコマンドを実行している

**解決方法**:
1. プロジェクトのルートディレクトリに移動しているか確認
2. `composer.json`ファイルが存在するか確認

## 補足情報

### composer.jsonとは

`composer.json`は、プロジェクトで使用するPHPライブラリのリストを定義するファイルです。このプロジェクトでは、以下のライブラリを使用しています:

- `mpdf/mpdf`: PDF生成ライブラリ

### vendorディレクトリとは

`composer install`を実行すると、`vendor`ディレクトリが作成され、必要なPHPライブラリがインストールされます。このディレクトリは通常、Gitにコミットしないように`.gitignore`に追加されています。

### composer.lockとは

`composer.lock`は、インストールされたライブラリの正確なバージョンを記録するファイルです。これにより、同じバージョンのライブラリを確実にインストールできます。


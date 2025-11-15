# ビルド後のアクセス方法

## 現在の状況

`dist`ディレクトリには既にビルド済みのファイルが存在します：
- `dist/index.html`
- `dist/index.js`
- `dist/index.css`
- `dist/api/` (PHPファイル)
- `dist/templates/` (CSVファイル)

## ビルド後のアクセス方法

### 方法1: distディレクトリをドキュメントルートとして起動（推奨）

現在のPHPサーバーを停止（Ctrl + C）してから、`dist`ディレクトリに移動して起動：

```bash
cd dist
php -S localhost:8080
```

または、プロジェクトのルートディレクトリから：

```bash
php -S localhost:8080 -t dist
```

`-t dist`オプションで、`dist`ディレクトリをドキュメントルートとして指定します。

### 方法2: スクリプトを使用

新しいスクリプトを作成しました：

```bash
scripts\start-dist-server.bat
```

### 方法3: 再ビルドしてから起動

最新の変更を反映するために再ビルド：

```bash
npm run build
```

その後、`dist`ディレクトリをドキュメントルートとして起動：

```bash
php -S localhost:8080 -t dist
```

## アクセスURL

ビルド後は、以下のURLでアクセス：

```
http://localhost:8080
```

## 重要なポイント

1. **ビルド前**: ルートディレクトリから起動 → `index.tsx`を直接読み込む（開発モード）
2. **ビルド後**: `dist`ディレクトリをドキュメントルートとして起動 → `index.js`を読み込む（本番モード）

## 現在のエラーの原因

現在のエラーは、ルートディレクトリから起動しているため、`index.tsx`を直接読み込もうとしているが、PHP開発サーバーはTypeScriptファイルを処理できないためです。

解決策：`dist`ディレクトリをドキュメントルートとして起動してください。


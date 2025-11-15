# Composer トラブルシューティングガイド

## エラー: "The zip extension and unzip/7z commands are both missing"

### 問題

Composerがパッケージをダウンロードする際、ZIP形式でダウンロードしようとしますが、以下のいずれかが必要です：
- PHPの`zip`拡張機能
- `unzip`または`7z`コマンド（Windowsでは通常利用不可）

### 解決方法

#### 方法1: PHPの`zip`拡張機能を有効化（推奨）

1. PHPの設定ファイルの場所を確認：
   ```bash
   php --ini
   ```

2. `php.ini`ファイルを開く

3. 以下の行を探す：
   ```ini
   ;extension=zip
   ```

4. 行頭のセミコロン（`;`）を削除：
   ```ini
   extension=zip
   ```

5. ファイルを保存

6. 新しいコマンドプロンプトを開いて、再度実行：
   ```bash
   composer install --ignore-platform-reqs
   ```

#### 方法2: Gitをインストール（代替手段）

`zip`拡張機能を有効化できない場合、Gitをインストールすることで、Composerがソースからダウンロードできるようになります：

1. [Git for Windows](https://git-scm.com/download/win)をダウンロード
2. インストール時に「Git from the command line and also from 3rd-party software」を選択（PATHに追加）
3. インストール後、新しいコマンドプロンプトを開く
4. 確認：
   ```bash
   git --version
   ```
5. 再度Composerを実行：
   ```bash
   composer install --ignore-platform-reqs
   ```

### 推奨される設定

Composerを正常に使用するために、以下のPHP拡張機能を有効化することを推奨します：

```ini
extension=zip
extension=gd
extension=mbstring
extension=xml
extension=curl
```

## エラー: "git was not found in your PATH"

### 問題

Composerがソースからダウンロードしようとしたが、Gitが見つからない。

### 解決方法

1. [Git for Windows](https://git-scm.com/download/win)をインストール
2. インストール時に「Git from the command line and also from 3rd-party software」を選択
3. 新しいコマンドプロンプトを開く
4. 再度Composerを実行

または、`zip`拡張機能を有効化することで、Gitなしでも動作します（方法1を推奨）。

## 拡張機能の確認方法

インストールされている拡張機能を確認：

```bash
php -m
```

特定の拡張機能を確認：

```bash
php -m | findstr zip
php -m | findstr gd
php -m | findstr mbstring
```

## まとめ

Composerを使用する場合の最小限の設定：

1. **必須**: `zip`拡張機能を有効化
2. **推奨**: `gd`, `mbstring`, `xml`, `curl`拡張機能を有効化

これらの拡張機能を有効化することで、Composerは正常に動作します。


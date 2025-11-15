# SQLファイルの実行方法

## PowerShellでの注意点

PowerShellでは、`<`（リダイレクト）が正しく動作しない場合があります。以下のエラーが発生する可能性があります：

```
演算子 '<' は、今後の使用のために予約されています。
```

この場合、以下の方法を使用してください。

## エラー: コマンドが認識されない

以下のようなコマンドを実行すると、ヘルプメッセージが表示されます：

```bash
# ❌ 間違い
mysql -u simpleacts_quote -p simpleacts_quotenassen dist/database_setup.sql.txt
```

これは、SQLファイルを引数として直接指定できないためです。

## 正しい実行方法

### 方法1: Get-Contentとパイプを使用（PowerShell推奨）

PowerShellでは、`Get-Content`とパイプを使用します：

```powershell
# ✅ PowerShellでの正しい方法
Get-Content dist/database_setup.sql.txt | mysql -u simpleacts_quote -p simpleacts_quotenassen
```

または、`cmd /c`を使用：

```powershell
# ✅ cmd経由で実行
cmd /c "mysql -u simpleacts_quote -p simpleacts_quotenassen < dist/database_setup.sql.txt"
```

### 方法2: リダイレクトを使用（コマンドプロンプト）

コマンドプロンプト（cmd.exe）では、リダイレクトが正しく動作します：

```bash
# ✅ コマンドプロンプトでの正しい方法
mysql -u simpleacts_quote -p simpleacts_quotenassen < dist/database_setup.sql.txt
```

**重要**: PowerShellでは`<`が正しく動作しない場合があるため、`Get-Content`とパイプを使用するか、`cmd /c`を使用してください。

### 方法3: SOURCEコマンドを使用

```bash
# データベースに接続
mysql -u simpleacts_quote -p simpleacts_quotenassen
```

接続後、SQLファイルを実行：

```sql
SOURCE dist/database_setup.sql.txt;
exit;
```

**注意**: `SOURCE`コマンドを使用する場合、ファイルパスは絶対パスまたは、接続時のカレントディレクトリからの相対パスを指定する必要があります。

### 方法4: 絶対パスを使用（SOURCEコマンド）

```bash
mysql -u simpleacts_quote -p simpleacts_quotenassen
```

```sql
SOURCE C:/Users/yosuke/Downloads/プリント屋バックオフィス-20251104/プリント屋バックオフィス-20251104/dist/database_setup.sql.txt;
exit;
```

## コマンドの構文

### リダイレクトを使用する場合

```bash
mysql -u [ユーザー名] -p [データベース名] < [SQLファイルのパス]
```

例：
```bash
mysql -u simpleacts_quote -p simpleacts_quotenassen < dist/database_setup.sql.txt
```

### SOURCEコマンドを使用する場合

```bash
# 1. データベースに接続
mysql -u [ユーザー名] -p [データベース名]

# 2. SQLファイルを実行
SOURCE [SQLファイルのパス];

# 3. 接続を終了
exit;
```

例：
```bash
mysql -u simpleacts_quote -p simpleacts_quotenassen
```

```sql
SOURCE dist/database_setup.sql.txt;
exit;
```

## よくある間違い

### ❌ 間違い1: リダイレクト（`<`）を忘れる

```bash
mysql -u simpleacts_quote -p simpleacts_quotenassen dist/database_setup.sql.txt
```

→ ヘルプメッセージが表示されます

### ❌ 間違い2: ファイルパスを引用符で囲む（リダイレクトの場合）

```bash
mysql -u simpleacts_quote -p simpleacts_quotenassen < "dist/database_setup.sql.txt"
```

→ 動作しますが、引用符は不要です

### ✅ 正しい: リダイレクトを使用

```bash
mysql -u simpleacts_quote -p simpleacts_quotenassen < dist/database_setup.sql.txt
```

## 実践例

### テーブル構造の作成

**PowerShellの場合：**
```powershell
Get-Content dist/database_setup.sql.txt | mysql -u simpleacts_quote -p simpleacts_quotenassen
```

**コマンドプロンプトの場合：**
```bash
mysql -u simpleacts_quote -p simpleacts_quotenassen < dist/database_setup.sql.txt
```

### データのインポート

**PowerShellの場合：**
```powershell
Get-Content dist/database_data_import.sql | mysql -u simpleacts_quote -p simpleacts_quotenassen
```

**コマンドプロンプトの場合：**
```bash
mysql -u simpleacts_quote -p simpleacts_quotenassen < dist/database_data_import.sql
```

### ツール依存性の設定

**PowerShellの場合：**
```powershell
Get-Content scripts/setup-all-tool-dependencies-full-access.sql | mysql -u simpleacts_quote -p simpleacts_quotenassen
```

**コマンドプロンプトの場合：**
```bash
mysql -u simpleacts_quote -p simpleacts_quotenassen < scripts/setup-all-tool-dependencies-full-access.sql
```

## トラブルシューティング

### エラー: "No such file or directory"

ファイルパスが正しいか確認：

```bash
# ファイルが存在するか確認
dir dist\database_setup.sql.txt

# または
ls dist/database_setup.sql.txt
```

### エラー: "Access denied"

ユーザーにデータベースへのアクセス権限があるか確認：

```bash
# rootユーザーで接続
mysql -u root -p

# 権限を確認
SHOW GRANTS FOR 'simpleacts_quote'@'localhost';
```

### エラー: "Unknown database"

データベースが存在するか確認：

```bash
mysql -u root -p
```

```sql
SHOW DATABASES;
```

存在しない場合は作成：

```sql
CREATE DATABASE simpleacts_quotenassen CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```


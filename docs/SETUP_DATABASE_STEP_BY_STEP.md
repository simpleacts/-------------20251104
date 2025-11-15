# データベースセットアップ手順（ステップバイステップ）

## 重要: PowerShellではSQLコマンドを直接実行できません

PowerShellのプロンプトで直接SQLコマンドを実行することはできません。まず`mysql`コマンドで接続してから、SQLコマンドを実行する必要があります。

## 正しい手順

### ステップ1: rootユーザーでMySQL/MariaDBに接続

PowerShellで以下のコマンドを実行：

```powershell
mysql -u root -p
```

**重要**: このコマンドを実行すると、パスワードの入力が求められます。MariaDBのrootパスワードを入力してください。

### ステップ2: 接続成功の確認

接続が成功すると、以下のようなプロンプトが表示されます：

```
Welcome to the MariaDB monitor.  Commands end with ; or \g.
Your MariaDB connection id is 123
Server version: 12.0.2-MariaDB

Copyright (c) 2000, 2018, Oracle, MariaDB Corporation Ab and others.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

MariaDB [(none)]>
```

**重要**: `MariaDB [(none)]>`というプロンプトが表示されたら、MySQL/MariaDBのコマンドモードに入っています。ここからSQLコマンドを実行できます。

### ステップ3: SQLコマンドを実行

プロンプトが表示されたら、以下のSQLコマンドを**1つずつ**実行します：

```sql
CREATE DATABASE IF NOT EXISTS simpleacts_quotenassen CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**Enterキーを押すと実行されます。**

次に：

```sql
CREATE USER IF NOT EXISTS 'simpleacts_quote'@'localhost' IDENTIFIED BY 'cj708d';
```

**Enterキーを押すと実行されます。**

次に：

```sql
GRANT ALL PRIVILEGES ON simpleacts_quotenassen.* TO 'simpleacts_quote'@'localhost';
```

**Enterキーを押すと実行されます。**

次に：

```sql
FLUSH PRIVILEGES;
```

**Enterキーを押すと実行されます。**

確認：

```sql
SHOW GRANTS FOR 'simpleacts_quote'@'localhost';
```

**Enterキーを押すと実行されます。**

### ステップ4: 接続を終了

```sql
exit;
```

または

```sql
quit;
```

**Enterキーを押すと、MySQL/MariaDBから切断され、PowerShellのプロンプトに戻ります。**

### ステップ5: 接続を確認

PowerShellで以下のコマンドを実行：

```powershell
mysql -u simpleacts_quote -p simpleacts_quotenassen
```

パスワード`cj708d`を入力して、接続できるか確認してください。

接続が成功すると、以下のようなプロンプトが表示されます：

```
MariaDB [simpleacts_quotenassen]>
```

### ステップ6: データベースのインポート

接続できたら、以下のコマンドでテーブル構造とデータをインポート：

```powershell
# PowerShellのプロンプトに戻る（exit; を実行）
exit;
```

PowerShellで：

```powershell
# テーブル構造を作成
Get-Content dist/database_setup.sql.txt | mysql -u simpleacts_quote -p simpleacts_quotenassen

# データをインポート
Get-Content dist/database_data_import.sql | mysql -u simpleacts_quote -p simpleacts_quotenassen
```

パスワードは`cj708d`です。

## よくある間違い

### ❌ 間違い1: PowerShellのプロンプトで直接SQLコマンドを実行

```powershell
PS> CREATE DATABASE IF NOT EXISTS simpleacts_quotenassen;
```

→ これは動作しません。PowerShellはSQLコマンドを理解できません。

### ❌ 間違い2: SQLコマンドを複数行で入力

```powershell
PS> CREATE DATABASE IF NOT EXISTS simpleacts_quotenassen;
PS> CREATE USER IF NOT EXISTS 'simpleacts_quote'@'localhost';
```

→ これも動作しません。まず`mysql -u root -p`で接続する必要があります。

### ✅ 正しい: mysqlコマンドで接続してからSQLコマンドを実行

```powershell
# 1. 接続
PS> mysql -u root -p

# 2. パスワードを入力

# 3. MariaDBのプロンプトが表示されたら、SQLコマンドを実行
MariaDB [(none)]> CREATE DATABASE IF NOT EXISTS simpleacts_quotenassen CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
MariaDB [(none)]> CREATE USER IF NOT EXISTS 'simpleacts_quote'@'localhost' IDENTIFIED BY 'cj708d';
MariaDB [(none)]> GRANT ALL PRIVILEGES ON simpleacts_quotenassen.* TO 'simpleacts_quote'@'localhost';
MariaDB [(none)]> FLUSH PRIVILEGES;
MariaDB [(none)]> exit;
```

## まとめ

1. **PowerShellで**: `mysql -u root -p`を実行
2. **パスワードを入力**: MariaDBのrootパスワード
3. **MariaDBのプロンプトで**: SQLコマンドを1つずつ実行
4. **終了**: `exit;`でPowerShellに戻る
5. **確認**: `mysql -u simpleacts_quote -p simpleacts_quotenassen`で接続確認
6. **インポート**: PowerShellで`Get-Content`とパイプを使用してSQLファイルを実行


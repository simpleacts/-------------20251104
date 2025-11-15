# SQLコマンドの実行方法

## エラーについて

PowerShellでSQLコマンドを直接実行することはできません。`mysql`コマンドに接続してから、SQLコマンドを実行する必要があります。

## 正しい手順

### ステップ1: MySQL/MariaDBに接続

PowerShellまたはコマンドプロンプトで：

```bash
mysql -u root -p
```

パスワードを入力します（入力中は文字が表示されません）。

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

**重要**: `MariaDB [(none)]>`というプロンプトが表示されたら、MySQL/MariaDBのコマンドモードに入っています。

### ステップ3: SQLコマンドを実行

プロンプトが表示されたら、以下のSQLコマンドを**1つずつ**実行します：

```sql
CREATE DATABASE simpleacts_quotenassen CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**Enterキーを押すと実行されます。**

次に：

```sql
CREATE USER 'simpleacts_quote'@'localhost' IDENTIFIED BY 'cj708d';
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
SHOW DATABASES;
```

### ステップ4: 接続を終了

```sql
exit;
```

または

```sql
quit;
```

## 注意点

1. **SQLコマンドの末尾にセミコロン（`;`）が必要**
   - セミコロンがないと、コマンドが実行されません

2. **コメント（`--`）は不要**
   - MySQL/MariaDBのコマンドモードでは、コメントは使えますが、必須ではありません
   - エラーを避けるため、コメントなしで実行することを推奨します

3. **プロンプトが表示されていることを確認**
   - `MariaDB [(none)]>`というプロンプトが表示されていることを確認してください
   - プロンプトが表示されていない場合は、接続に失敗している可能性があります

## 実行例

```
PS C:\Users\yosuke> mysql -u root -p
Enter password: ********
Welcome to the MariaDB monitor...
MariaDB [(none)]> CREATE DATABASE simpleacts_quotenassen CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
Query OK, 1 row affected (0.001 sec)

MariaDB [(none)]> CREATE USER 'simpleacts_quote'@'localhost' IDENTIFIED BY 'cj708d';
Query OK, 0 rows affected (0.001 sec)

MariaDB [(none)]> GRANT ALL PRIVILEGES ON simpleacts_quotenassen.* TO 'simpleacts_quote'@'localhost';
Query OK, 0 rows affected (0.001 sec)

MariaDB [(none)]> FLUSH PRIVILEGES;
Query OK, 0 rows affected (0.001 sec)

MariaDB [(none)]> SHOW DATABASES;
+------------------------+
| Database               |
+------------------------+
| information_schema     |
| mysql                  |
| performance_schema     |
| simpleacts_quotenassen |
+------------------------+
4 rows in set (0.001 sec)

MariaDB [(none)]> exit;
Bye
```

## トラブルシューティング

### エラー: "Access denied"

- パスワードが間違っている可能性があります
- 再度`mysql -u root -p`で接続し直してください

### エラー: "Database already exists"

- データベースが既に存在しています
- スキップして次のコマンドに進んでください

### エラー: "You have an error in your SQL syntax"

- SQLコマンドの構文を確認してください
- セミコロン（`;`）が正しく入力されているか確認してください


# ポート8000エラーの解決方法

## エラー: "Failed to listen on localhost:8000"

このエラーは、ポート8000が既に使用されているか、権限の問題があることを示しています。

## 解決方法

### 方法1: 別のポートを使用（推奨）

ポート8000の代わりに、別のポート（例: 8080）を使用：

```bash
php -S localhost:8080
```

ブラウザで以下のURLにアクセス：

```
http://localhost:8080
```

**注意**: ポートを変更した場合、`templates/server_config.csv`の`APP_BASE_URL`も変更する必要があります：

```csv
APP_BASE_URL,http://localhost:8080
```

### 方法2: ポート8000を使用しているプロセスを確認

ポート8000を使用しているプロセスを確認：

```powershell
netstat -ano | findstr :8000
```

出力例：
```
TCP    0.0.0.0:8000           0.0.0.0:0              LISTENING       12345
```

最後の数字（12345）がプロセスIDです。

プロセスを終了：

```powershell
taskkill /PID 12345 /F
```

その後、再度PHPサーバーを起動：

```bash
php -S localhost:8000
```

### 方法3: 管理者権限で実行

権限の問題の場合、管理者権限でPowerShellを開いて実行：

1. Windowsキー + X
2. 「Windows PowerShell (管理者)」を選択
3. プロジェクトディレクトリに移動
4. PHPサーバーを起動

### 方法4: 別のIPアドレスを使用

`localhost`の代わりに`127.0.0.1`を使用：

```bash
php -S 127.0.0.1:8000
```

## 推奨される解決策

最も簡単な解決策は、**方法1（別のポートを使用）**です。

```bash
php -S localhost:8080
```

そして、ブラウザで `http://localhost:8080` にアクセスしてください。


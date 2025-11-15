<?php
/**
 * メーカー依存データテーブル クリーンアップスクリプト（PHP版）
 * 
 * このスクリプトは、すべてのメーカー依存テーブルのデータを削除します。
 * 
 * 【使用方法】
 * 1. このファイルをサーバーにアップロード
 * 2. ブラウザでアクセス: https://your-domain.com/scripts/cleanup_manufacturer_tables.php
 * 3. 確認画面で対象テーブルとレコード数を確認
 * 4. 問題がなければ「実行」ボタンをクリック
 * 
 * 【注意】
 * - このスクリプトはデータを完全に削除します。実行前に必ずバックアップを取得してください。
 * - 本番環境で実行する場合は、十分に注意してください。
 * - 認証機能を追加することを推奨します。
 */

// セキュリティ: 本番環境では認証を追加してください
// if (!isset($_SERVER['PHP_AUTH_USER']) || $_SERVER['PHP_AUTH_USER'] !== 'admin') {
//     header('WWW-Authenticate: Basic realm="Cleanup Script"');
//     header('HTTP/1.0 401 Unauthorized');
//     die('認証が必要です');
// }

require_once __DIR__ . '/../api/db_connect.php';
require_once __DIR__ . '/../api/schema_utils.php';

// メーカー依存テーブルのベース名リスト
$base_tables = [
    'products_master',
    'product_details',
    'stock',
    'colors',
    'sizes',
    'incoming_stock',
    'skus',
    'brands'
];

$action = $_POST['action'] ?? 'preview';
$target_manufacturer_id = $_POST['manufacturer_id'] ?? null; // nullの場合はすべてのメーカー

// メーカー一覧を取得
$manufacturers = [];
try {
    $stmt = $pdo->query("SELECT id, name FROM manufacturers WHERE id IS NOT NULL AND id != '' AND id != 'undefined' ORDER BY id");
    $manufacturers = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    die("メーカー一覧の取得に失敗しました: " . $e->getMessage());
}

// 対象テーブルを取得
$target_tables = [];
foreach ($manufacturers as $manufacturer) {
    $manufacturer_id = $manufacturer['id'];
    
    // 特定のメーカーIDが指定されている場合は、そのメーカーのみ処理
    if ($target_manufacturer_id !== null && $target_manufacturer_id !== '' && $manufacturer_id !== $target_manufacturer_id) {
        continue;
    }
    
    foreach ($base_tables as $base_table) {
        $table_name = "{$base_table}_{$manufacturer_id}";
        
        if (tableExists($pdo, $table_name)) {
            // レコード数を取得
            try {
                $stmt = $pdo->query("SELECT COUNT(*) as count FROM `{$table_name}`");
                $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
            } catch (PDOException $e) {
                $count = 0;
            }
            
            $target_tables[] = [
                'table_name' => $table_name,
                'manufacturer_id' => $manufacturer_id,
                'manufacturer_name' => $manufacturer['name'] ?? $manufacturer_id,
                'base_table' => $base_table,
                'record_count' => (int)$count
            ];
        }
    }
}

// 実行処理
if ($action === 'execute' && isset($_POST['confirm']) && $_POST['confirm'] === 'yes') {
    $pdo->beginTransaction();
    $deleted_tables = [];
    $total_deleted = 0;
    
    try {
        foreach ($target_tables as $table_info) {
            $table_name = $table_info['table_name'];
            $record_count = $table_info['record_count'];
            
            // TRUNCATEを実行
            $pdo->exec("TRUNCATE TABLE `{$table_name}`");
            
            $deleted_tables[] = [
                'table_name' => $table_name,
                'record_count' => $record_count
            ];
            $total_deleted += $record_count;
        }
        
        $pdo->commit();
        $success = true;
        $message = "クリーンアップが完了しました。{$total_deleted}件のレコードを削除しました。";
    } catch (PDOException $e) {
        $pdo->rollBack();
        $success = false;
        $message = "エラーが発生しました: " . $e->getMessage();
    }
}

?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>メーカー依存テーブル クリーンアップ</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #d32f2f;
            border-bottom: 3px solid #d32f2f;
            padding-bottom: 10px;
        }
        .warning {
            background-color: #fff3cd;
            border: 2px solid #ffc107;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
        }
        .warning strong {
            color: #d32f2f;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        tr:hover {
            background-color: #f5f5f5;
        }
        .record-count {
            text-align: right;
            font-weight: bold;
        }
        .total {
            background-color: #e3f2fd;
            font-weight: bold;
        }
        .btn {
            padding: 12px 24px;
            font-size: 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin: 10px 5px;
        }
        .btn-danger {
            background-color: #d32f2f;
            color: white;
        }
        .btn-danger:hover {
            background-color: #b71c1c;
        }
        .btn-secondary {
            background-color: #6c757d;
            color: white;
        }
        .btn-secondary:hover {
            background-color: #5a6268;
        }
        .success {
            background-color: #d4edda;
            border: 2px solid #28a745;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
            color: #155724;
        }
        .error {
            background-color: #f8d7da;
            border: 2px solid #dc3545;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
            color: #721c24;
        }
        .filter-section {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
        }
        select {
            padding: 8px;
            font-size: 14px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>メーカー依存テーブル クリーンアップ</h1>
        
        <div class="warning">
            <strong>⚠️ 警告</strong><br>
            このスクリプトは、すべてのメーカー依存テーブルのデータを<strong>完全に削除</strong>します。<br>
            実行前に必ず<strong>データベースのバックアップ</strong>を取得してください。<br>
            本番環境で実行する場合は、十分に注意してください。
        </div>
        
        <?php if (isset($success)): ?>
            <?php if ($success): ?>
                <div class="success">
                    <strong>✓ 成功</strong><br>
                    <?php echo htmlspecialchars($message); ?>
                </div>
                
                <h2>削除されたテーブル</h2>
                <table>
                    <thead>
                        <tr>
                            <th>テーブル名</th>
                            <th class="record-count">削除されたレコード数</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($deleted_tables as $table_info): ?>
                            <tr>
                                <td><?php echo htmlspecialchars($table_info['table_name']); ?></td>
                                <td class="record-count"><?php echo number_format($table_info['record_count']); ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php else: ?>
                <div class="error">
                    <strong>✗ エラー</strong><br>
                    <?php echo htmlspecialchars($message); ?>
                </div>
            <?php endif; ?>
        <?php else: ?>
            <form method="POST" action="" onsubmit="return confirm('本当に実行しますか？この操作は取り消せません。');">
                <input type="hidden" name="action" value="execute">
                <input type="hidden" name="confirm" value="yes">
                <input type="hidden" name="manufacturer_id" value="<?php echo htmlspecialchars($target_manufacturer_id ?? ''); ?>">
                
                <div class="filter-section">
                    <label for="manufacturer_filter">メーカーでフィルタ:</label>
                    <select id="manufacturer_filter" onchange="location.href='?manufacturer_id=' + this.value">
                        <option value="">すべてのメーカー</option>
                        <?php foreach ($manufacturers as $manufacturer): ?>
                            <option value="<?php echo htmlspecialchars($manufacturer['id']); ?>" 
                                <?php echo ($target_manufacturer_id === $manufacturer['id']) ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars($manufacturer['id'] . ' - ' . ($manufacturer['name'] ?? '名称なし')); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                
                <h2>対象テーブル一覧</h2>
                <table>
                    <thead>
                        <tr>
                            <th>テーブル名</th>
                            <th>メーカーID</th>
                            <th>メーカー名</th>
                            <th>ベーステーブル</th>
                            <th class="record-count">レコード数</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php 
                        $total_records = 0;
                        foreach ($target_tables as $table_info): 
                            $total_records += $table_info['record_count'];
                        ?>
                            <tr>
                                <td><?php echo htmlspecialchars($table_info['table_name']); ?></td>
                                <td><?php echo htmlspecialchars($table_info['manufacturer_id']); ?></td>
                                <td><?php echo htmlspecialchars($table_info['manufacturer_name']); ?></td>
                                <td><?php echo htmlspecialchars($table_info['base_table']); ?></td>
                                <td class="record-count"><?php echo number_format($table_info['record_count']); ?></td>
                            </tr>
                        <?php endforeach; ?>
                        <tr class="total">
                            <td colspan="4"><strong>合計</strong></td>
                            <td class="record-count"><strong><?php echo number_format($total_records); ?></strong></td>
                        </tr>
                    </tbody>
                </table>
                
                <?php if (count($target_tables) > 0): ?>
                    <div style="margin-top: 30px; text-align: center;">
                        <button type="submit" class="btn btn-danger">
                            クリーンアップを実行（<?php echo number_format($total_records); ?>件のレコードを削除）
                        </button>
                        <a href="?" class="btn btn-secondary">キャンセル</a>
                    </div>
                <?php else: ?>
                    <p>対象となるテーブルが見つかりませんでした。</p>
                <?php endif; ?>
            </form>
        <?php endif; ?>
    </div>
</body>
</html>


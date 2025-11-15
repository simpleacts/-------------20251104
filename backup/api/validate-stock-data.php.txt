<?php
/**
 * 在庫データの整合性チェックAPI
 * インポート前にデータを検証し、問題を早期発見する
 */

header('Content-Type: application/json; charset=utf-8');
require_once 'db_connect.php';
require_once 'validation_utils.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Only POST method is accepted.']);
    exit();
}

$json_data = file_get_contents('php://input');
$request = json_decode($json_data, true);

if (json_last_error() !== JSON_ERROR_NONE || !isset($request['data']) || !isset($request['mapping'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON payload.']);
    exit();
}

$csv_data = $request['data'];
$mapping = $request['mapping'];
$manufacturer_id = $request['manufacturerId'] ?? null;

if (!$manufacturer_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Manufacturer ID is required.']);
    exit();
}

// 検証ルールを取得
$required_fields = ['product_code', 'color_code', 'size_code']; // stock_quantityは任意（未入力も有効）
$validation_rules = getStockValidationRules();

// データ検証を実行
$validation_result = validateCsvData($csv_data, $mapping, $required_fields, $validation_rules);

// 追加の整合性チェック
$consistency_checks = [
    'duplicate_skus' => [],
    'invalid_references' => [],
    'data_quality_issues' => []
];

// 重複SKUのチェック（同じproduct_code + color_code + size_codeの組み合わせ）
$sku_map = [];
foreach ($csv_data as $index => $row) {
    $product_code_column = $mapping['product_code'] ?? '';
    $color_code_column = $mapping['color_code'] ?? '';
    $size_code_column = $mapping['size_code'] ?? '';
    
    if (empty($product_code_column) || empty($color_code_column) || empty($size_code_column)) {
        continue;
    }
    
    $product_code = trim((string)($row[$product_code_column] ?? ''));
    $color_code = trim((string)($row[$color_code_column] ?? ''));
    $size_code = trim((string)($row[$size_code_column] ?? ''));
    
    if (empty($product_code) || empty($color_code) || empty($size_code)) {
        continue;
    }
    
    $sku_key = "{$product_code}_{$color_code}_{$size_code}";
    
    if (isset($sku_map[$sku_key])) {
        $consistency_checks['duplicate_skus'][] = [
            'row' => $index + 2,
            'sku' => $sku_key,
            'previous_row' => $sku_map[$sku_key]
        ];
    } else {
        $sku_map[$sku_key] = $index + 2;
    }
}

// データベースとの整合性チェック（既存データとの比較）
try {
    $stock_table = "stock_{$manufacturer_id}";
    $stmt_check = $pdo->prepare("SHOW TABLES LIKE ?");
    $stmt_check->execute([$stock_table]);
    $table_exists = $stmt_check->rowCount() > 0;
    
    if ($table_exists) {
        // 既存の在庫データを取得
        $stmt = $pdo->prepare("SELECT product_code, color_code, size_code, quantity FROM `{$stock_table}` LIMIT 1000");
        $stmt->execute();
        $existing_stock = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $existing_sku_map = [];
        foreach ($existing_stock as $stock) {
            $sku_key = "{$stock['product_code']}_{$stock['color_code']}_{$stock['size_code']}";
            $existing_sku_map[$sku_key] = $stock;
        }
        
        // インポートデータと既存データの比較
        foreach ($csv_data as $index => $row) {
            $product_code_column = $mapping['product_code'] ?? '';
            $color_code_column = $mapping['color_code'] ?? '';
            $size_code_column = $mapping['size_code'] ?? '';
            
            if (empty($product_code_column) || empty($color_code_column) || empty($size_code_column)) {
                continue;
            }
            
            $product_code = trim((string)($row[$product_code_column] ?? ''));
            $color_code = trim((string)($row[$color_code_column] ?? ''));
            $size_code = trim((string)($row[$size_code_column] ?? ''));
            
            if (empty($product_code) || empty($color_code) || empty($size_code)) {
                continue;
            }
            
            $sku_key = "{$product_code}_{$color_code}_{$size_code}";
            
            if (isset($existing_sku_map[$sku_key])) {
                $existing = $existing_sku_map[$sku_key];
                $new_quantity = normalizeNumericValue($row[$mapping['stock_quantity'] ?? ''] ?? 0) ?? 0;
                
                // 在庫数の大幅な変化をチェック
                $existing_quantity = (int)($existing['quantity'] ?? 0);
                if ($existing_quantity > 0 && abs($new_quantity - $existing_quantity) > $existing_quantity * 0.5) {
                    $consistency_checks['data_quality_issues'][] = [
                        'row' => $index + 2,
                        'sku' => $sku_key,
                        'type' => 'large_quantity_change',
                        'existing_quantity' => $existing_quantity,
                        'new_quantity' => $new_quantity,
                        'change_percentage' => round(($new_quantity - $existing_quantity) / $existing_quantity * 100, 2)
                    ];
                }
            }
        }
    }
} catch (PDOException $e) {
    // データベースチェックでエラーが発生しても、検証は続行
    $consistency_checks['database_check_error'] = $e->getMessage();
}

// 数値の正規化関数（import-stock.phpから）
if (!function_exists('normalizeNumericValue')) {
    function normalizeNumericValue($value) {
        if ($value === null || $value === '') {
            return null;
        }
        $value = (string)$value;
        $value = str_replace(',', '', $value);
        $value = trim($value);
        if ($value === '') {
            return null;
        }
        $numeric_value = floatval($value);
        return intval($numeric_value);
    }
}

// 結果をまとめる
$result = [
    'success' => $validation_result['valid'] && empty($consistency_checks['duplicate_skus']),
    'validation' => $validation_result,
    'consistency_checks' => $consistency_checks,
    'summary' => [
        'total_rows' => count($csv_data),
        'valid_rows' => $validation_result['statistics']['valid_rows'],
        'invalid_rows' => $validation_result['statistics']['invalid_rows'],
        'duplicate_skus_count' => count($consistency_checks['duplicate_skus']),
        'data_quality_issues_count' => count($consistency_checks['data_quality_issues']),
        'recommendations' => []
    ]
];

// 推奨事項を生成
if (!empty($consistency_checks['duplicate_skus'])) {
    $result['summary']['recommendations'][] = '重複するSKUが検出されました。インポート前に重複を解消することを推奨します。';
}

if (!empty($consistency_checks['data_quality_issues'])) {
    $result['summary']['recommendations'][] = '在庫数の大幅な変化が検出されました。データの正確性を確認してください。';
}

if ($validation_result['statistics']['invalid_rows'] > 0) {
    $result['summary']['recommendations'][] = 'エラーがある行があります。エラーを修正してからインポートしてください。';
}

echo json_encode($result, JSON_UNESCAPED_UNICODE);

?>


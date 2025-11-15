<?php
/**
 * CSV保存API
 * csv-writableモードでデータ変更時にCSVファイルを自動保存
 */

header('Content-Type: application/json; charset=utf-8');

// POSTリクエストのみ受け付ける
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Only POST method is allowed']);
    exit();
}

// 入力データを取得
$input = json_decode(file_get_contents('php://input'), true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON payload']);
    exit();
}

$tableName = $input['table'] ?? '';
$data = $input['data'] ?? [];
$manufacturerId = $input['manufacturerId'] ?? null;
$schema = $input['schema'] ?? [];

if (empty($tableName)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Table name is required']);
    exit();
}

// テーブル名の検証（英数字、アンダースコア、ハイフンのみ許可）
if (!preg_match('/^[a-zA-Z0-9_-]+$/', $tableName)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid table name']);
    exit();
}

// テーブル名からベーステーブル名とメーカーIDを抽出
// 新しい命名規則: {manufacturerId}_{tableName} (例: manu_0001_brands)
function parseManufacturerTableName($tableName) {
    $manufacturerDependentTables = [
        'products_master', 'product_details', 'product_tags',
        // 注意: brandsは削除（共通テーブルtemplates/common/brands.csvで全メーカーのブランドを一括管理）
        'stock', 'importer_mappings', 'tags'
    ];
    
    // まず、manu_で始まる形式をチェック（新しい命名規則）
    if (strpos($tableName, 'manu_') === 0) {
        // manu_0001_stock 形式から stock と manu_0001 を抽出
        foreach ($manufacturerDependentTables as $baseTableName) {
            // ファイル名の変換を考慮
            $fileName = $baseTableName;
            if ($baseTableName === 'product_details') {
                $fileName = 'details';
            } else if ($baseTableName === 'stock') {
                $fileName = 'stock';
            } else if ($baseTableName === 'tags') {
                $fileName = 'tags';
            }
            // 注意: brandsは削除（共通テーブルに変更）
            
            $suffix = '_' . $fileName;
            if (substr($tableName, -strlen($suffix)) === $suffix) {
                $manufacturerId = substr($tableName, 0, strlen($tableName) - strlen($suffix));
                return ['baseTableName' => $baseTableName, 'manufacturerId' => $manufacturerId];
            }
        }
    } else {
        // 後方互換性のため、古い命名規則（{tableName}_{manufacturerId}）もサポート
        foreach ($manufacturerDependentTables as $baseTableName) {
            $prefix = $baseTableName . '_';
            if (strpos($tableName, $prefix) === 0) {
                $manufacturerId = substr($tableName, strlen($prefix));
                // manufacturerIdに`manu_`プレフィックスが含まれている場合は除去
                if (strpos($manufacturerId, 'manu_') === 0) {
                    $manufacturerId = substr($manufacturerId, 5); // 'manu_'の長さは5
                }
                return ['baseTableName' => $baseTableName, 'manufacturerId' => $manufacturerId];
            }
        }
    }
    return ['baseTableName' => $tableName, 'manufacturerId' => null];
}

// CSVファイルのパスを決定
function getCsvPath($tableName, $manufacturerId = null) {
    // colors, sizesはstockテーブルから取得されるため、直接保存しない
    if ($tableName === 'colors' || $tableName === 'sizes') {
        return null; // 保存をスキップ
    }
    
    // テーブル名がメーカー依存テーブル名の形式（stock_0001, stock_manu_0001など）の場合、パースする
    $parsed = parseManufacturerTableName($tableName);
    if ($parsed['manufacturerId'] !== null) {
        // メーカー依存テーブル名が直接渡された場合、ベーステーブル名とmanufacturerIdを抽出
        $tableName = $parsed['baseTableName'];
        // manufacturerIdパラメータが指定されていない場合のみ、パースしたmanufacturerIdを使用
        if ($manufacturerId === null) {
            $manufacturerId = $parsed['manufacturerId'];
        }
    }
    
    // tagsテーブルは共通とメーカー固有の両方が存在する可能性がある（先に処理）
    if ($tableName === 'tags') {
        if ($manufacturerId) {
            // manufacturerIdから`manu_`プレフィックスを削除（重複を防ぐ）
            $cleanManufacturerId = $manufacturerId;
            if (strpos($cleanManufacturerId, 'manu_') === 0) {
                $cleanManufacturerId = substr($cleanManufacturerId, 5); // 'manu_'の長さは5
            }
            return "templates/manufacturers/manu_{$cleanManufacturerId}/manu_{$cleanManufacturerId}_tags.csv";
        } else {
            return "templates/common/tags.csv";
        }
    }
    
    // メーカー依存テーブルのリスト（tagsは除外、brandsは共通テーブルに変更）
    $manufacturerDependentTables = [
        'products_master', 'product_details', 'product_tags',
        // 注意: product_colors, product_prices, skusは非推奨（stockテーブルから取得）
        // 注意: colors, sizes, incoming_stockは削除（stockテーブルから直接取得）
        // 注意: brandsは削除（共通テーブルtemplates/common/brands.csvで全メーカーのブランドを一括管理）
        'stock', 'importer_mappings'
    ];
    
    // メーカー依存テーブルの場合（新しいファイル名ルール: {manufacturerId}_{tableName}.csv）
    if (in_array($tableName, $manufacturerDependentTables)) {
        if ($manufacturerId) {
            // manufacturerIdから`manu_`プレフィックスを削除（重複を防ぐ）
            $cleanManufacturerId = $manufacturerId;
            if (strpos($cleanManufacturerId, 'manu_') === 0) {
                $cleanManufacturerId = substr($cleanManufacturerId, 5); // 'manu_'の長さは5
            }
            // ファイル名を決定（tableNameに応じて適切なファイル名に変換）
            $fileName = $tableName;
            if ($tableName === 'product_details') {
                $fileName = 'details';
            } else if ($tableName === 'stock') {
                $fileName = 'stock';
            }
            // 注意: brandsは削除（共通テーブルに変更）
            return "templates/manufacturers/manu_{$cleanManufacturerId}/manu_{$cleanManufacturerId}_{$fileName}.csv";
        } else {
            // メーカーIDが指定されていない場合はエラー
            return null;
        }
    }
    
    // 言語設定テーブルのマッピング
    $languageSettingsMap = [
        'language_settings_common' => 'languages/common',
        'language_settings_customer_management' => 'languages/customermanagement',
        'language_settings_order_management' => 'languages/order-management',
        'language_settings_user_manager' => 'languages/user-manager',
        'language_settings_language_manager' => 'languages/language-manager',
        'language_settings_estimator_settings' => 'languages/estimator-settings',
        'language_settings_worksheet' => 'languages/worksheet',
        'language_settings_proofing' => 'languages/proofing',
        'language_settings_product_management' => 'languages/product-management',
        'language_settings_color_library_manager' => 'languages/color-library-manager',
        'language_settings_dev_management' => 'languages/dev-management',
        'language_settings_hub' => 'languages/hub',
        'language_settings_calculation_logic_manager' => 'languages/calculation-logic-manager',
        'language_settings_shipping_logic_tool' => 'languages/shipping-logic-tool',
        'language_settings_dev_lock_manager' => 'languages/dev-lock-manager',
        'language_settings_app_management' => 'languages/app-management',
        'language_settings_php_info_viewer' => 'languages/php-info-viewer',
        'language_settings_image_batch_linker' => 'languages/image-batch-linker',
        'language_settings_image_file_name_converter' => 'languages/image-file-name-converter',
        'language_settings_display_settings' => 'languages/display-settings',
        'language_settings_inventory_management' => 'languages/inventory-management',
        'language_settings_email_settings' => 'languages/email-settings',
        'language_settings_database_schema_manager' => 'languages/database-schema-manager',
        'language_settings_database' => 'languages/database-schema-manager',
        'language_settings_dtf_cost_calculator' => 'languages/dtf-cost-calculator',
        'language_settings_ink_mixing' => 'languages/ink-mixing',
        'language_settings_ink_product_management' => 'languages/ink-product-management',
        'language_settings_ink_series_management' => 'languages/ink-series-management',
        'language_settings_print_history' => 'languages/print-history',
        'language_settings_production_scheduler' => 'languages/production-scheduler',
        'language_settings_task_settings' => 'languages/task-settings',
        'language_settings_tool_exporter' => 'languages/tool-exporter',
        'language_settings_tool_porting_manager' => 'languages/tool-porting-manager',
        'language_settings_unregistered_module_tool' => 'languages/unregistered-module-tool',
        'language_settings_silkscreen_logic_tool' => 'languages/silkscreen',
    ];
    
    if (isset($languageSettingsMap[$tableName])) {
        return "templates/{$languageSettingsMap[$tableName]}/{$tableName}.csv";
    }
    
    // ツールごとのフォルダマッピング
    $toolFolderMap = [
        'time_units' => 'product-definition',
        'calculation_logic_types' => 'product-definition',
        'ink_product_types' => 'product-definition',
        'weight_volume_units' => 'product-definition',
        'free_input_item_types' => 'product-definition',
        'color_libraries' => 'product-definition',
        'color_library_types' => 'product-definition',
        'payment_methods' => 'product-definition',
        'email_accounts' => 'email-management',
        'email_templates' => 'email-management',
        'email_labels' => 'email-management',
        'email_attachments' => 'email-management',
        'emails' => 'email-management',
        'email_general_settings' => 'email-management',
        'email_settings' => 'email-management',
        'email_label_ai_rules' => 'email-management',
        'task_master' => 'task-settings',
        'task_generation_rules' => 'task-settings',
        'task_time_settings' => 'task-settings',
        'quote_tasks' => 'task-settings',
    ];
    
    if (isset($toolFolderMap[$tableName])) {
        return "templates/{$toolFolderMap[$tableName]}/{$tableName}.csv";
    }
    
    // 共通テーブル
    $commonTables = ['manufacturers', 'categories', 'prefectures', 'brands'];
    if (in_array($tableName, $commonTables)) {
        return "templates/common/{$tableName}.csv";
    }
    
    // デフォルトは直下
    return "templates/{$tableName}.csv";
}

// CSVフィールドをエスケープ
function escapeCSVField($field) {
    if ($field === null || $field === '') {
        return '';
    }
    $str = (string)$field;
    // コンマ、ダブルクォート、改行を含む場合はダブルクォートで囲む
    if (strpos($str, ',') !== false || strpos($str, '"') !== false || strpos($str, "\n") !== false) {
        // ダブルクォートをエスケープ（""に変換）
        return '"' . str_replace('"', '""', $str) . '"';
    }
    return $str;
}

// colors, sizesテーブルはstockテーブルから取得されるため、直接保存をスキップ
if ($tableName === 'colors' || $tableName === 'sizes' || 
    strpos($tableName, 'colors_') === 0 || strpos($tableName, 'sizes_') === 0) {
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => "Table '{$tableName}' is derived from stock table and cannot be saved directly. Changes should be made to the stock table instead.",
        'skipped' => true
    ]);
    exit();
}

// CSVファイルパスを取得
$csvPath = getCsvPath($tableName, $manufacturerId);

if ($csvPath === null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Manufacturer ID is required for manufacturer-dependent tables']);
    exit();
}

// プロジェクトルートのパスを取得（templates/ディレクトリが存在するディレクトリを検出）
$current_dir = __DIR__;
$project_root = $current_dir;
// dist/api/から実行されている場合、dist/を除外してプロジェクトルートを検出
while ($project_root !== dirname($project_root)) {
    $templates_path = $project_root . '/templates';
    if (is_dir($templates_path)) {
        break;
    }
    $project_root = dirname($project_root);
}

// 相対パスを絶対パスに変換
$csvPath = $project_root . '/' . $csvPath;

// ディレクトリが存在しない場合は作成
$dir = dirname($csvPath);
if (!is_dir($dir)) {
    if (!mkdir($dir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create directory: ' . $dir]);
        exit();
    }
}

// スキーマからヘッダー行を取得
$headers = [];
if (!empty($schema) && is_array($schema)) {
    foreach ($schema as $column) {
        if (isset($column['name'])) {
            $headers[] = $column['name'];
        }
    }
} else if (!empty($data) && is_array($data) && count($data) > 0) {
    // スキーマがない場合は、最初のデータ行からキーを取得
    $headers = array_keys($data[0]);
}

// 空のテーブル（データもスキーマもない）の場合は保存をスキップ
if (empty($headers)) {
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => "Table '{$tableName}' is empty (no data and no schema). Skipping save.",
        'skipped' => true,
        'path' => $csvPath // パス情報も含める（ログ用）
    ]);
    exit();
}

// product_detailsファイルの保護チェック（特定のメーカーIDのファイルを保護）
$parsed = parseManufacturerTableName($tableName);
if ($parsed['baseTableName'] === 'product_details' && file_exists($csvPath)) {
    // 保護対象のメーカーIDリスト（必要に応じて追加可能）
    $protectedManufacturerIds = ['manu_0002'];
    $currentManufacturerId = $parsed['manufacturerId'] ?? $manufacturerId;
    
    // manufacturerIdが既にmanu_プレフィックスを含んでいる場合はそのまま使用
    $cleanManufacturerId = $currentManufacturerId;
    if ($cleanManufacturerId && strpos($cleanManufacturerId, 'manu_') !== 0) {
        $cleanManufacturerId = 'manu_' . $cleanManufacturerId;
    }
    
    if ($cleanManufacturerId && in_array($cleanManufacturerId, $protectedManufacturerIds)) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => "Product details file for manufacturer '{$cleanManufacturerId}' is protected and cannot be updated.",
            'skipped' => true,
            'path' => $csvPath
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }
}

// CSVファイルを書き込み
try {
    $handle = fopen($csvPath, 'w');
    if ($handle === false) {
        throw new Exception('Failed to open file for writing: ' . $csvPath);
    }
    
    // BOMを出力（ExcelでUTF-8を正しく認識させるため）
    fwrite($handle, "\xEF\xBB\xBF");
    
    // ヘッダー行を出力
    fputcsv($handle, $headers, ',', '"', '\\');
    
    // データ行を出力
    foreach ($data as $row) {
        $values = [];
        foreach ($headers as $header) {
            $value = $row[$header] ?? '';
            if ($value === null) {
                $value = '';
            }
            $values[] = $value;
        }
        fputcsv($handle, $values, ',', '"', '\\');
    }
    
    fclose($handle);
    
    echo json_encode([
        'success' => true,
        'message' => 'CSV file saved successfully',
        'path' => $csvPath,
        'rows' => count($data)
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to save CSV file: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

?>


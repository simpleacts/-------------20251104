<?php
/**
 * CSV在庫データインポート用のAPI
 * アップロードされたCSVファイルを解析し、CSVファイルに保存する
 */
// エラーレポート設定（デバッグ用）
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
// エラーハンドラーを設定して詳細なエラー情報を取得
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
});

// 実行時間制限を設定（10分）
set_time_limit(600);
ini_set('memory_limit', '512M');

header('Content-Type: application/json; charset=utf-8');
require_once 'validation_utils.php'; // バリデーション関数

// CSVファイルを読み込む関数（import-stock.phpから移植）
function parseCsvFile($file_path, $encoding = 'UTF-8', $mapping = null) {
    $data = [];
    $headers = [];
    $header_found = false;
    
    $handle = fopen($file_path, 'r');
    if ($handle === false) {
        throw new Exception("CSVファイルを開くことができませんでした。");
    }
    
    // BOMをスキップ
    $bom = fread($handle, 3);
    if ($bom !== "\xEF\xBB\xBF") {
        rewind($handle);
    }
    
    // エンコーディング変換が必要な場合
    if ($encoding !== 'UTF-8') {
        $temp_file = tempnam(sys_get_temp_dir(), 'csv_');
        $temp_handle = fopen($temp_file, 'w');
        $content = file_get_contents($file_path);
        $converted = mb_convert_encoding($content, 'UTF-8', $encoding);
        file_put_contents($temp_file, $converted);
        fclose($handle);
        fclose($temp_handle);
        $handle = fopen($temp_file, 'r');
    }
    
    $row_index = 0;
    $code_columns = ['code', 'sizeCode', 'colorCode', 'size_code', 'color_code', 'product_code', 'productCode', 'jan_code'];
    
    // マッピングから取得したCSV列名を追加
    $csv_code_columns = [];
    if ($mapping) {
        foreach ($mapping as $field => $csv_column) {
            if (in_array($field, $code_columns) && !empty($csv_column)) {
                $csv_code_columns[] = $csv_column;
            }
        }
    }
    
    while (($row = fgetcsv($handle, 0, ',', '"', '"')) !== false) {
        // 空行をスキップ
        if (empty(array_filter($row, function($v) { return trim($v) !== ''; }))) {
            continue;
        }
        
        if (!$header_found) {
            $headers = array_map('trim', $row);
            $header_found = true;
            continue;
        }
        
        if (count($row) !== count($headers)) {
            continue;
        }
        
        $row_data = [];
        foreach ($headers as $index => $header) {
            $value = isset($row[$index]) ? $row[$index] : '';
            
            if ($value === '' || $value === null) {
                $row_data[$header] = null;
            } elseif (in_array($header, $code_columns) || in_array($header, $csv_code_columns)) {
                $value_str = trim((string)$value);
                $row_data[$header] = $value_str;
            } else {
                $value_str = trim((string)$value);
                if ($value_str === '') {
                    $row_data[$header] = null;
                } elseif (strtolower($value_str) === 'true') {
                    $row_data[$header] = true;
                } elseif (strtolower($value_str) === 'false') {
                    $row_data[$header] = false;
                } else {
                    $value_str = html_entity_decode($value_str, ENT_QUOTES | ENT_HTML5, 'UTF-8');
                    $numeric_str = str_replace(',', '', $value_str);
                    if (is_numeric($numeric_str) && is_finite(floatval($numeric_str))) {
                        $numeric_value = floatval($numeric_str);
                        if ($numeric_value == intval($numeric_value)) {
                            $row_data[$header] = intval($numeric_value);
                        } else {
                            $row_data[$header] = $numeric_value;
                        }
                    } else {
                        $row_data[$header] = $value_str;
                    }
                }
            }
        }
        
        $data[] = $row_data;
        $row_index++;
    }
    
    fclose($handle);
    return $data;
}

// CSVファイルのパスを取得する関数
function getCsvPath($tableName, $manufacturerId = null) {
    if ($tableName === 'colors' || $tableName === 'sizes') {
        return null;
    }
    
    // テーブル名からメーカーIDを抽出
    $parsed = parseManufacturerTableNameForCsv($tableName);
    if ($parsed['manufacturerId'] !== null) {
        $tableName = $parsed['baseTableName'];
        if ($manufacturerId === null) {
            $manufacturerId = $parsed['manufacturerId'];
        }
    }
    
    $manufacturerDependentTables = [
        'product_details',  // products_master, product_tagsは削除済み
        'stock', 'importer_mappings', 'tags'
    ];
    
    // tagsテーブルは共通とメーカー固有の両方が存在する可能性がある（先に処理）
    if ($tableName === 'tags') {
        if ($manufacturerId) {
            // manufacturerIdが既にmanu_プレフィックスを含んでいる場合はそのまま使用、含まれていない場合は追加
            $cleanManufacturerId = $manufacturerId;
            if (strpos($cleanManufacturerId, 'manu_') !== 0) {
                $cleanManufacturerId = 'manu_' . $cleanManufacturerId;
            }
            $expectedFileName = "{$cleanManufacturerId}_tags.csv";
            $expectedPath = "templates/manufacturers/{$cleanManufacturerId}/{$expectedFileName}";
            return $expectedPath;
        } else {
            return "templates/common/tags.csv";
        }
    }
    
    if (in_array($tableName, $manufacturerDependentTables)) {
        if ($manufacturerId) {
            // manufacturerIdが既にmanu_プレフィックスを含んでいる場合はそのまま使用、含まれていない場合は追加
            $cleanManufacturerId = $manufacturerId;
            if (strpos($cleanManufacturerId, 'manu_') !== 0) {
                $cleanManufacturerId = 'manu_' . $cleanManufacturerId;
            }
            // ファイル名を決定（tableNameに応じて適切なファイル名に変換）
            $fileName = $tableName;
            if ($tableName === 'product_details') {
                $fileName = 'details';
            } else if ($tableName === 'stock') {
                $fileName = 'stock';
            }
            $expectedFileName = "{$cleanManufacturerId}_{$fileName}.csv";
            $expectedPath = "templates/manufacturers/{$cleanManufacturerId}/{$expectedFileName}";
            return $expectedPath;
        } else {
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

function parseManufacturerTableNameForCsv($tableName) {
    $manufacturerDependentTables = [
        'product_details',  // products_master, product_tagsは削除済み
        'stock', 'importer_mappings', 'tags'
    ];
    
    if (strpos($tableName, 'manu_') === 0) {
        foreach ($manufacturerDependentTables as $baseTableName) {
            $fileName = $baseTableName;
            if ($baseTableName === 'product_details') {
                $fileName = 'details';
            } else if ($baseTableName === 'stock') {
                $fileName = 'stock';
            } else if ($baseTableName === 'tags') {
                $fileName = 'tags';
            }
            $suffix = '_' . $fileName;
            if (substr($tableName, -strlen($suffix)) === $suffix) {
                $manufacturerId = substr($tableName, 0, strlen($tableName) - strlen($suffix));
                return ['baseTableName' => $baseTableName, 'manufacturerId' => $manufacturerId];
            }
        }
    }
    return ['baseTableName' => $tableName, 'manufacturerId' => null];
}

// 数値を正規化（validation_utils.phpから移植）
function normalizeNumericValue($value) {
    if ($value === null || $value === '') {
        return null;
    }
    $value_str = trim((string)$value);
    // ハイフン（-）を空値として扱う
    if ($value_str === '' || $value_str === '-') {
        return null;
    }
    $numeric_str = str_replace(',', '', $value_str);
    if (is_numeric($numeric_str) && is_finite(floatval($numeric_str))) {
        $numeric_value = floatval($numeric_str);
        if ($numeric_value == intval($numeric_value)) {
            return intval($numeric_value);
        } else {
            return $numeric_value;
        }
    }
    return null;
}

// 日付を正規化
function normalizeDate($date_string) {
    if (empty($date_string)) {
        return null;
    }
    $date_string = trim((string)$date_string);
    // ハイフン（-）を空値として扱う
    if ($date_string === '' || $date_string === '-') {
        return null;
    }
    
    if (preg_match('/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/', $date_string, $matches)) {
        $month = intval($matches[1]);
        $day = intval($matches[2]);
        $year = isset($matches[3]) ? intval($matches[3]) : null;
        
        if ($year === null) {
            $year = intval(date('Y'));
        } else if ($year < 100) {
            $year = 2000 + $year;
        }
        
        if (checkdate($month, $day, $year)) {
            return sprintf('%04d-%02d-%02d', $year, $month, $day);
        }
    }
    
    if (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/', $date_string, $matches)) {
        $year = intval($matches[1]);
        $month = intval($matches[2]);
        $day = intval($matches[3]);
        
        if (checkdate($month, $day, $year)) {
            return sprintf('%04d-%02d-%02d', $year, $month, $day);
        }
    }
    
    $timestamp = strtotime($date_string);
    if ($timestamp !== false) {
        $parsed_date = date('Y-m-d', $timestamp);
        if ($parsed_date !== '1970-01-01') {
            return $parsed_date;
        }
    }
    
    return null;
}

// カラー名から色名を抽出
function extractColorName($color_name) {
    if (empty($color_name)) {
        return '';
    }
    $parts = explode(':', $color_name, 2);
    return count($parts) > 1 ? trim($parts[1]) : trim($parts[0]);
}

// サイズ名からサイズコードを生成
function generateSizeCode($size_name) {
    if (empty($size_name)) {
        return '';
    }
    return trim((string)$size_name);
}

// デバッグログ用の配列
$debug_log = [];
function logDebug($message, $data = null, $level = 'info') {
    global $debug_log;
    $entry = [
        'timestamp' => date('Y-m-d H:i:s.u'),
        'level' => $level,
        'message' => $message
    ];
    if ($data !== null) {
        $entry['data'] = is_array($data) || is_object($data) ? json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR) : $data;
    }
    $debug_log[] = $entry;
    
    if ($level === 'error' || $level === 'warning') {
        error_log("[import-stock-csv.php] [{$level}] {$message}" . ($data !== null ? " | Data: " . json_encode($data, JSON_UNESCAPED_UNICODE) : ""));
    }
}

// --- Main Logic ---

// CORSプリフライトリクエスト（OPTIONS）に対応
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'error' => 'Only POST method is accepted.',
        'received_method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
        'request_uri' => $_SERVER['REQUEST_URI'] ?? 'unknown'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// FormDataからCSVファイルを取得して解析
$csv_data = null;
$mapping = null;
$manufacturer_id = null;
$debug_mode = false;
$skip_validation_errors = false;
$skip_error_rows = true;

if (isset($_FILES['csv_file']) && $_FILES['csv_file']['error'] === UPLOAD_ERR_OK) {
    $file_path = $_FILES['csv_file']['tmp_name'];
    $encoding = $_POST['encoding'] ?? 'UTF-8';
    
    try {
        $mapping_json = $_POST['mapping'] ?? '{}';
        $mapping_for_parse = json_decode($mapping_json, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('マッピングのJSON解析に失敗しました: ' . json_last_error_msg());
        }
        $csv_data = parseCsvFile($file_path, $encoding, $mapping_for_parse);
        if (empty($csv_data)) {
            throw new Exception('CSVファイルが空です。データが含まれていません。');
        }
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'message' => 'CSVファイルの読み込みに失敗しました: ' . $e->getMessage(),
            'debug' => [
                'file_path' => $file_path,
                'file_exists' => file_exists($file_path),
                'file_size' => file_exists($file_path) ? filesize($file_path) : 0,
                'encoding' => $encoding,
                'mapping_json' => $mapping_json ?? null,
                'mapping_decode_error' => json_last_error() !== JSON_ERROR_NONE ? json_last_error_msg() : null
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }
    
    $mapping = json_decode($_POST['mapping'] ?? '{}', true);
    $product_settings = json_decode($_POST['productSettings'] ?? '{}', true);
    $manufacturer_id = $_POST['manufacturerId'] ?? null;
    $debug_mode = isset($_POST['debug']) && $_POST['debug'] === 'true';
    $skip_validation_errors = isset($_POST['skipValidationErrors']) && $_POST['skipValidationErrors'] === 'true';
    $skip_error_rows = !isset($_POST['skipErrorRows']) || $_POST['skipErrorRows'] === 'true';
    $update_product_name = isset($_POST['updateProductName']) && $_POST['updateProductName'] === 'true';
    $update_stock_quantity = !isset($_POST['updateStockQuantity']) || $_POST['updateStockQuantity'] === 'true'; // デフォルト: true
} else {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'CSVファイルがアップロードされていません。']);
    exit();
}

if (!$manufacturer_id) {
    logDebug('Manufacturer ID is missing', [
        'POST_data' => $_POST,
        'FILES_data' => isset($_FILES) ? array_keys($_FILES) : []
    ], 'error');
    http_response_code(400);
    echo json_encode([
        'success' => false, 
        'message' => 'Manufacturer ID is required.',
        'debug' => [
            'manufacturer_id' => $manufacturer_id,
            'POST_keys' => array_keys($_POST ?? []),
            'has_csv_file' => isset($_FILES['csv_file'])
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// データ検証
logDebug('Starting data validation');
$required_fields = ['product_code', 'color_code', 'size_code'];
$validation_rules = getStockValidationRules();
$validation_result = validateCsvData($csv_data, $mapping, $required_fields, $validation_rules);

logDebug('Validation completed', [
    'valid' => $validation_result['valid'],
    'error_count' => count($validation_result['errors']),
    'warning_count' => count($validation_result['warnings']),
    'statistics' => $validation_result['statistics']
]);

$error_row_indices = [];
if (!$validation_result['valid']) {
    if ($skip_validation_errors) {
        logDebug('Validation errors detected but continuing import', [
            'error_count' => count($validation_result['errors']),
            'invalid_rows' => $validation_result['statistics']['invalid_rows'],
            'skip_validation_errors' => true
        ], 'warning');
        
        if (isset($validation_result['row_errors']) && is_array($validation_result['row_errors'])) {
            foreach ($validation_result['row_errors'] as $row_num => $errors) {
                $error_row_indices[] = $row_num - 2;
            }
        }
    } else {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'データ検証に失敗しました',
            'validation' => [
                'errors' => $validation_result['errors'],
                'warnings' => $validation_result['warnings'],
                'statistics' => $validation_result['statistics'],
                'row_errors' => $validation_result['row_errors']
            ],
            'debug_log' => $debug_mode ? $debug_log : null
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }
}

if (!empty($validation_result['warnings'])) {
    foreach ($validation_result['warnings'] as $warning) {
        logDebug($warning, null, 'warning');
    }
}

$summary = [
    'totalRows' => count($csv_data),
    'updatedStock' => 0,
    'newItems' => 0,
    'skippedUnchanged' => 0,
    'newProducts' => 0,
    'errors' => [],
    'errorSummary' => []
];

// CSVインポートデータを格納する配列
$csv_stock_data = [];
$csv_product_details_map = [];

// プロジェクトルートのパスを取得（dist/ディレクトリを優先的に使用）
function getProjectRoot() {
    $current_dir = __DIR__;
    
    // dist/api/から実行されている場合、dist/をプロジェクトルートとして使用
    if (strpos($current_dir, DIRECTORY_SEPARATOR . 'dist' . DIRECTORY_SEPARATOR . 'api') !== false) {
        // dist/api/から実行されている場合、dist/を返す
        $dist_path = dirname($current_dir); // dist/api -> dist
        if (is_dir($dist_path)) {
            return $dist_path;
        }
    }
    
    // dist/ディレクトリが存在する場合はそれを使用
    $dist_dir = dirname($current_dir) . DIRECTORY_SEPARATOR . 'dist';
    if (is_dir($dist_dir)) {
        return $dist_dir;
    }
    
    // プロジェクトルートからdist/を探す
    $project_root = $current_dir;
    while ($project_root !== dirname($project_root)) {
        $dist_path = $project_root . DIRECTORY_SEPARATOR . 'dist';
        if (is_dir($dist_path)) {
            return $dist_path;
        }
        $project_root = dirname($project_root);
    }
    
    // フォールバック: templates/ディレクトリを探す
    $project_root = $current_dir;
    while ($project_root !== dirname($project_root)) {
        $templates_path = $project_root . DIRECTORY_SEPARATOR . 'templates';
        if (is_dir($templates_path)) {
            return $project_root;
        }
        $project_root = dirname($project_root);
    }
    
    return $current_dir; // 最終的なフォールバック
}

try {
    // プロジェクトルートのパスを取得（dist/ディレクトリを優先的に使用）
    $project_root = getProjectRoot();
    
    // 既存のCSVファイルを読み込む
    // manufacturerIdをそのまま使用（変換しない）
    $stock_csv_path = getCsvPath('stock', $manufacturer_id);
    if ($stock_csv_path) {
        // 相対パスを絶対パスに変換
        $stock_csv_path = $project_root . '/' . $stock_csv_path;
        // ファイル名が期待と異なる場合の警告
        $cleanManufacturerId = $manufacturer_id;
        if (strpos($cleanManufacturerId, 'manu_') !== 0) {
            $cleanManufacturerId = 'manu_' . $cleanManufacturerId;
        }
        $expectedFileName = "{$cleanManufacturerId}_stock.csv";
        $actualFileName = basename($stock_csv_path);
        if ($actualFileName !== $expectedFileName && file_exists($stock_csv_path)) {
            logDebug('Warning: Stock CSV filename mismatch', [
                'expected' => $expectedFileName,
                'actual' => $actualFileName,
                'path' => $stock_csv_path
            ], 'warning');
        }
        if (file_exists($stock_csv_path)) {
            try {
                $existing_stock_data = parseCsvFile($stock_csv_path, 'UTF-8');
                foreach ($existing_stock_data as $row) {
                    $csv_stock_data[] = $row;
                }
                logDebug('Loaded existing stock CSV', ['path' => $stock_csv_path, 'rows' => count($existing_stock_data)]);
            } catch (Exception $e) {
                logDebug('Failed to load existing stock CSV', ['path' => $stock_csv_path, 'error' => $e->getMessage()], 'warning');
            }
        }
    }
    
    $details_csv_path = getCsvPath('product_details', $manufacturer_id);
    if ($details_csv_path) {
        // 相対パスを絶対パスに変換
        $details_csv_path = $project_root . '/' . $details_csv_path;
        // ファイル名が期待と異なる場合の警告
        $cleanManufacturerId = $manufacturer_id;
        if (strpos($cleanManufacturerId, 'manu_') !== 0) {
            $cleanManufacturerId = 'manu_' . $cleanManufacturerId;
        }
        $expectedFileName = "{$cleanManufacturerId}_details.csv";
        $actualFileName = basename($details_csv_path);
        if ($actualFileName !== $expectedFileName && file_exists($details_csv_path)) {
            logDebug('Warning: Product details CSV filename mismatch', [
                'expected' => $expectedFileName,
                'actual' => $actualFileName,
                'path' => $details_csv_path
            ], 'warning');
        }
        if (file_exists($details_csv_path)) {
            try {
                $existing_details_data = parseCsvFile($details_csv_path, 'UTF-8');
                foreach ($existing_details_data as $row) {
                    $product_code_key = $row['product_code'] ?? '';
                    if ($product_code_key) {
                        $csv_product_details_map[$product_code_key] = $row;
                    }
                }
                logDebug('Loaded existing product_details CSV', ['path' => $details_csv_path, 'rows' => count($existing_details_data)]);
            } catch (Exception $e) {
                logDebug('Failed to load existing product_details CSV', ['path' => $details_csv_path, 'error' => $e->getMessage()], 'warning');
            }
        }
    }
    
    foreach ($csv_data as $index => $row) {
        if ($skip_validation_errors && !empty($error_row_indices) && in_array($index, $error_row_indices, true)) {
            logDebug("Skipping row with validation error", [
                'row' => $index + 2,
                'errors' => $validation_result['row_errors'][$index + 2] ?? []
            ], 'warning');
            $summary['errors'][] = "[行 " . ($index + 2) . "] 検証エラーのためスキップしました";
            continue;
        }
        
        try {
            if ($debug_mode && $index < 5) {
                logDebug("Processing row " . ($index + 2), [
                    'row_data_sample' => array_slice($row, 0, 5, true)
                ]);
            }
            
            // 必須フィールドを取得
            $product_code_column = $mapping['product_code'] ?? '';
            $product_code = !empty($product_code_column) ? trim((string)($row[$product_code_column] ?? '')) : '';
            if (!$product_code) {
                throw new Exception("Row " . ($index + 2) . ": Product code is missing.");
            }
            
            $color_code_column = $mapping['color_code'] ?? '';
            $color_code_raw = $row[$color_code_column] ?? '';
            $color_code = !empty($color_code_column) ? trim((string)$color_code_raw) : '';
            if ($color_code === '' || $color_code === null) {
                throw new Exception("Row " . ($index + 2) . ": Color code is missing.");
            }
            
            $size_code_column = $mapping['size_code'] ?? '';
            $size_code_raw = $row[$size_code_column] ?? '';
            $size_code = !empty($size_code_column) ? trim((string)$size_code_raw) : '';
            if ($size_code === '' || $size_code === null) {
                $size_name_column = $mapping['size_name'] ?? '';
                $size_name_temp = !empty($size_name_column) ? ($row[$size_name_column] ?? '') : '';
                $size_code = generateSizeCode($size_name_temp);
                if (!$size_code) {
                    throw new Exception("Row " . ($index + 2) . ": Size code is missing.");
                }
            }
            
            // オプショナルフィールドを取得
            $product_name_column = $mapping['product_name'] ?? '';
            $product_name = !empty($product_name_column) ? ($row[$product_name_column] ?? '') : '';
            
            $color_name_column = $mapping['color_name'] ?? '';
            $color_name_raw = !empty($color_name_column) ? ($row[$color_name_column] ?? '') : '';
            $color_name = extractColorName($color_name_raw);
            
            $size_name_column = $mapping['size_name'] ?? '';
            $size_name = !empty($size_name_column) ? ($row[$size_name_column] ?? '') : '';
            
            $stock_quantity_column = $mapping['stock_quantity'] ?? '';
            $stock_quantity_raw = !empty($stock_quantity_column) ? ($row[$stock_quantity_column] ?? 0) : 0;
            $stock_quantity = normalizeNumericValue($stock_quantity_raw) ?? 0;
            
            $incoming_quantities = [];
            $incoming_dates = [];
            for ($i = 1; $i <= 3; $i++) {
                $qty_key = 'incoming_quantity_' . $i;
                $date_key = 'incoming_date_' . $i;
                $qty_column = $mapping[$qty_key] ?? '';
                $date_column = $mapping[$date_key] ?? '';
                $qty_raw = !empty($qty_column) ? ($row[$qty_column] ?? null) : null;
                $date_raw = !empty($date_column) ? ($row[$date_column] ?? null) : null;
                $incoming_quantities[$i] = normalizeNumericValue($qty_raw);
                $incoming_dates[$i] = normalizeDate($date_raw);
            }
            
            if (empty($incoming_quantities[1]) && !empty($mapping['incoming_quantity'])) {
                $incoming_quantity_column = $mapping['incoming_quantity'];
                $incoming_quantities[1] = normalizeNumericValue($row[$incoming_quantity_column] ?? null);
            }
            if (empty($incoming_dates[1]) && !empty($mapping['incoming_date'])) {
                $incoming_date_column = $mapping['incoming_date'];
                $incoming_dates[1] = normalizeDate($row[$incoming_date_column] ?? null);
            }
            
            $list_price_column = $mapping['list_price'] ?? '';
            $list_price_raw = !empty($list_price_column) ? ($row[$list_price_column] ?? null) : null;
            $list_price = normalizeNumericValue($list_price_raw);
            
            $cost_price_column = $mapping['cost_price'] ?? '';
            $cost_price_raw = !empty($cost_price_column) ? ($row[$cost_price_column] ?? null) : null;
            $cost_price = normalizeNumericValue($cost_price_raw);
            
            $jan_code_column = $mapping['jan_code'] ?? '';
            $jan_code = !empty($jan_code_column) ? ($row[$jan_code_column] ?? null) : null;
            
            // product_details用の商品名を準備（サイズとカラーの表記を除去）
            // stock_product_name部分のみを使用（サイズとカラーを含まない商品名）
            $product_name_for_details = trim($product_name);
            
            // サイズ名とカラー名が商品名に含まれている場合は除去
            if (!empty($size_name)) {
                $size_name_trimmed = trim($size_name);
                // 商品名からサイズ名を除去（末尾に含まれる場合）
                $product_name_for_details = preg_replace('/\s*' . preg_quote($size_name_trimmed, '/') . '\s*$/u', '', $product_name_for_details);
                // 商品名からサイズ名を除去（途中に含まれる場合、スペースで区切られている場合）
                $product_name_for_details = preg_replace('/\s+' . preg_quote($size_name_trimmed, '/') . '\s+/u', ' ', $product_name_for_details);
            }
            if (!empty($color_name)) {
                $color_name_trimmed = trim($color_name);
                // 商品名からカラー名を除去（末尾に含まれる場合）
                $product_name_for_details = preg_replace('/\s*' . preg_quote($color_name_trimmed, '/') . '\s*$/u', '', $product_name_for_details);
                // 商品名からカラー名を除去（途中に含まれる場合、スペースで区切られている場合）
                $product_name_for_details = preg_replace('/\s+' . preg_quote($color_name_trimmed, '/') . '\s+/u', ' ', $product_name_for_details);
            }
            
            // 余分なスペースを除去
            $product_name_for_details = preg_replace('/\s+/u', ' ', $product_name_for_details);
            $product_name_for_details = trim($product_name_for_details);
            
            // 半角カナを全角に変換、全角英数字を半角に変換、全角スペースを半角に変換
            // K: 半角カナ→全角カナ, V: 濁点・半濁点変換, r: 全角英数字→半角英数字, s: 全角スペース→半角スペース
            $product_name_fullwidth = mb_convert_kana($product_name_for_details, 'KVrs', 'UTF-8');
            
            // product_detailsデータを準備
            // product_settingsから設定を取得
            $product_setting = $product_settings[$product_code] ?? [];
            $category_id = $product_setting['category_id'] ?? null;
            $is_published = isset($product_setting['is_published']) ? (int)$product_setting['is_published'] : null;
            $brand_id = $product_setting['brand_id'] ?? null;
            
            if (!isset($csv_product_details_map[$product_code])) {
                // 新規品番のみ追加
                $product_details_id = "prod_{$manufacturer_id}_{$product_code}";
                $csv_product_details_map[$product_code] = [
                    'id' => $product_details_id,
                    'manufacturer_id' => $manufacturer_id,
                    'product_code' => $product_code,
                    'productName' => $product_name_fullwidth,
                    'product_name' => $product_name_fullwidth,
                    'description' => null,
                    'images' => null,
                    'tags' => null,
                    'brand' => null,
                    'meta_title' => null,
                    'meta_description' => null,
                    'og_image_url' => null,
                    'og_title' => null,
                    'og_description' => null
                ];
                $summary['newProducts']++;
            } else {
                // 既存の品番がある場合
                if ($update_product_name) {
                    // 商品名を更新するオプションが有効な場合、商品名を更新
                    $csv_product_details_map[$product_code]['productName'] = $product_name_fullwidth;
                    $csv_product_details_map[$product_code]['product_name'] = $product_name_fullwidth;
                }
                // 商品名を更新しない場合は、既存データをそのまま保持（商品データ管理ツールから編集）
            }
            
            $now = date('Y-m-d H:i:s');
            $item_id = 'stock_' . $manufacturer_id . '_' . $product_code . '_' . $color_code . '_' . $size_code;
            
            // 既存データを検索
            // 判定条件: 品番、カラーコード、サイズコードの3つで判定
            $existing = null;
            foreach ($csv_stock_data as $csv_row) {
                // 品番が一致するか確認
                if (($csv_row['product_code'] ?? '') !== $product_code) {
                    continue;
                }
                // カラーコードが一致するか確認
                if (($csv_row['color_code'] ?? '') !== $color_code) {
                    continue;
                }
                // サイズコードが一致するか確認
                if (($csv_row['size_code'] ?? '') !== $size_code) {
                    continue;
                }
                // すべて一致した場合
                $existing = $csv_row;
                break;
            }
            
            if ($existing) {
                // 既存データを更新
                $hasChanges = false;
                if (($existing['stock_product_name'] ?? '') !== $product_name) $hasChanges = true;
                if (($existing['color_name'] ?? '') !== $color_name) $hasChanges = true;
                if (($existing['size_name'] ?? '') !== $size_name) $hasChanges = true;
                // 在庫数を更新するオプションが有効な場合のみ在庫数の変更をチェック
                if ($update_stock_quantity && (int)($existing['quantity'] ?? 0) !== (int)$stock_quantity) {
                    $hasChanges = true;
                } else if (!$update_stock_quantity) {
                    // 在庫数を更新しない場合は、在庫数の変更を無視（他の変更があれば更新）
                }
                
                for ($i = 1; $i <= 3; $i++) {
                    $existing_qty = $existing["incoming_quantity_{$i}"] ?? null;
                    if ($existing_qty !== null) $existing_qty = (int)$existing_qty;
                    $incoming_qty = $incoming_quantities[$i] ?? null;
                    if ($incoming_qty !== null) $incoming_qty = (int)$incoming_qty;
                    if ($existing_qty !== $incoming_qty) $hasChanges = true;
                }
                
                for ($i = 1; $i <= 3; $i++) {
                    $existing_date = $existing["incoming_date_{$i}"] ?? null;
                    $incoming_date = $incoming_dates[$i] ?? null;
                    if ($existing_date && $incoming_date) {
                        $existing_date = date('Y-m-d', strtotime($existing_date));
                        $incoming_date_formatted = date('Y-m-d', strtotime($incoming_date));
                        if ($existing_date !== $incoming_date_formatted) $hasChanges = true;
                    } else if ($existing_date !== $incoming_date) {
                        $hasChanges = true;
                    }
                }
                
                $existing_price = $existing['list_price'] ?? null;
                if ($existing_price !== null) $existing_price = (int)$existing_price;
                if ($list_price !== null) $list_price = (int)$list_price;
                if ($existing_price !== $list_price) $hasChanges = true;
                
                $existing_cost = $existing['cost_price'] ?? null;
                if ($existing_cost !== null) $existing_cost = (int)$existing_cost;
                if ($cost_price !== null) $cost_price = (int)$cost_price;
                if ($existing_cost !== $cost_price) $hasChanges = true;
                
                if (($existing['jan_code'] ?? '') !== ($jan_code ?? '')) $hasChanges = true;
                
                $existing_category_id = $existing['category_id'] ?? null;
                if ($category_id !== null && $existing_category_id !== $category_id) $hasChanges = true;
                
                $existing_is_published = isset($existing['is_published']) ? (int)$existing['is_published'] : null;
                if ($is_published !== null && $existing_is_published !== $is_published) $hasChanges = true;
                
                $existing_brand_id = $existing['brand_id'] ?? null;
                if ($brand_id !== null && $existing_brand_id !== $brand_id) $hasChanges = true;
                
                if ($hasChanges) {
                    $existing_index = -1;
                    foreach ($csv_stock_data as $idx => $csv_row) {
                        if (($csv_row['id'] ?? '') === ($existing['id'] ?? '')) {
                            $existing_index = $idx;
                            break;
                        }
                    }
                    
                    $updated_row = [
                        'id' => $existing['id'] ?? $item_id,
                        'manufacturer_id' => $manufacturer_id,
                        'product_code' => $product_code,
                        'stock_product_name' => $product_name,
                        'color_code' => $color_code,
                        'color_name' => $color_name,
                        'size_code' => $size_code,
                        'size_name' => $size_name,
                        'quantity' => $update_stock_quantity ? $stock_quantity : ($existing['quantity'] ?? 0),
                        'incoming_quantity_1' => $incoming_quantities[1] ?? null,
                        'incoming_date_1' => $incoming_dates[1] ?? null,
                        'incoming_quantity_2' => $incoming_quantities[2] ?? null,
                        'incoming_date_2' => $incoming_dates[2] ?? null,
                        'incoming_quantity_3' => $incoming_quantities[3] ?? null,
                        'incoming_date_3' => $incoming_dates[3] ?? null,
                        'category_id' => $category_id,
                        'is_published' => $is_published,
                        'brand_id' => $brand_id,
                        'list_price' => $list_price,
                        'cost_price' => $cost_price,
                        'jan_code' => $jan_code,
                        'created_at' => $existing['created_at'] ?? $now,
                        'updated_at' => $now
                    ];
                    
                    if ($existing_index >= 0) {
                        $csv_stock_data[$existing_index] = $updated_row;
                    } else {
                        $csv_stock_data[] = $updated_row;
                    }
                    $summary['updatedStock']++;
                } else {
                    $summary['skippedUnchanged']++;
                }
            } else {
                // 新規データを追加
                $csv_stock_data[] = [
                    'id' => $item_id,
                    'manufacturer_id' => $manufacturer_id,
                    'product_code' => $product_code,
                    'stock_product_name' => $product_name,
                    'color_code' => $color_code,
                    'color_name' => $color_name,
                    'size_code' => $size_code,
                    'size_name' => $size_name,
                    'quantity' => $stock_quantity,
                    'incoming_quantity_1' => $incoming_quantities[1] ?? null,
                    'incoming_date_1' => $incoming_dates[1] ?? null,
                    'incoming_quantity_2' => $incoming_quantities[2] ?? null,
                    'incoming_date_2' => $incoming_dates[2] ?? null,
                    'incoming_quantity_3' => $incoming_quantities[3] ?? null,
                    'incoming_date_3' => $incoming_dates[3] ?? null,
                    'category_id' => $category_id,
                    'is_published' => $is_published,
                    'brand_id' => $brand_id,
                    'list_price' => $list_price,
                    'cost_price' => $cost_price,
                    'jan_code' => $jan_code,
                    'created_at' => $now,
                    'updated_at' => $now
                ];
                $summary['newItems']++;
                $summary['updatedStock']++;
            }
        } catch (Exception $e) {
            $row_num = $index + 2;
            logDebug("Row processing error (skipped)", [
                'row_number' => $row_num,
                'error_message' => $e->getMessage(),
                'file' => basename($e->getFile()),
                'line' => $e->getLine()
            ], 'warning');
            
            $error_key = $e->getMessage();
            if (!isset($summary['errorSummary'][$error_key])) {
                $summary['errorSummary'][$error_key] = [
                    'message' => $e->getMessage(),
                    'count' => 0,
                    'rows' => [],
                    'location' => basename($e->getFile()) . ':' . $e->getLine()
                ];
            }
            $summary['errorSummary'][$error_key]['count']++;
            $summary['errorSummary'][$error_key]['rows'][] = $row_num;
            
            continue;
        }
    }
    
    // CSVファイルに保存
    // manufacturerIdをそのまま使用（変換しない）
    
    // プロジェクトルートのパスを取得（dist/ディレクトリを優先的に使用）
    $project_root = getProjectRoot();
    
    logDebug('Saving to CSV files', [
        'manufacturer_id' => $manufacturer_id,
        'stock_rows' => count($csv_stock_data),
        'product_details_rows' => count($csv_product_details_map),
        'project_root' => $project_root
    ]);
    
    // stock CSVファイルを保存
    $stock_csv_path = getCsvPath('stock', $manufacturer_id);
    logDebug('Stock CSV path resolved', [
        'base_path' => getCsvPath('stock', $manufacturer_id),
        'manufacturer_id' => $manufacturer_id
    ]);
    
    if ($stock_csv_path) {
        // 相対パスを絶対パスに変換
        $stock_csv_path = $project_root . '/' . $stock_csv_path;
        // ファイル名が期待と異なる場合の警告
        $cleanManufacturerId = $manufacturer_id;
        if (strpos($cleanManufacturerId, 'manu_') !== 0) {
            $cleanManufacturerId = 'manu_' . $cleanManufacturerId;
        }
        $expectedFileName = "{$cleanManufacturerId}_stock.csv";
        $actualFileName = basename($stock_csv_path);
        if ($actualFileName !== $expectedFileName) {
            logDebug('Warning: Stock CSV filename mismatch', [
                'expected' => $expectedFileName,
                'actual' => $actualFileName,
                'path' => $stock_csv_path
            ], 'warning');
        }
        logDebug('Stock CSV absolute path', [
            'absolute_path' => $stock_csv_path,
            'project_root' => $project_root,
            'relative_path' => getCsvPath('stock', $manufacturer_id)
        ]);
        
        $stock_dir = dirname($stock_csv_path);
        if (!is_dir($stock_dir)) {
            logDebug('Creating stock directory', ['dir' => $stock_dir]);
            if (!mkdir($stock_dir, 0755, true)) {
                throw new Exception('Failed to create directory: ' . $stock_dir);
            }
        }
        
        $stock_headers = [];
        if (!empty($csv_stock_data)) {
            $stock_headers = array_keys($csv_stock_data[0]);
        } else {
            $stock_headers = [
                'id', 'manufacturer_id', 'product_code', 'stock_product_name',
                'color_code', 'color_name', 'size_code', 'size_name',
                'quantity', 'incoming_quantity_1', 'incoming_date_1',
                'incoming_quantity_2', 'incoming_date_2',
                'incoming_quantity_3', 'incoming_date_3',
                'category_id', 'is_published', 'brand_id',
                'list_price', 'cost_price', 'jan_code', 'created_at', 'updated_at'
            ];
        }
        
        logDebug('Opening stock CSV file for writing', [
            'path' => $stock_csv_path,
            'headers_count' => count($stock_headers),
            'data_rows_count' => count($csv_stock_data)
        ]);
        
        $stock_handle = fopen($stock_csv_path, 'w');
        if ($stock_handle === false) {
            throw new Exception('Failed to open stock CSV file for writing: ' . $stock_csv_path);
        }
        
        fwrite($stock_handle, "\xEF\xBB\xBF");
        fputcsv($stock_handle, $stock_headers, ',', '"', '\\');
        
        $written_rows = 0;
        foreach ($csv_stock_data as $row) {
            $values = [];
            foreach ($stock_headers as $header) {
                $value = $row[$header] ?? '';
                if ($value === null) {
                    $value = '';
                }
                $values[] = $value;
            }
            fputcsv($stock_handle, $values, ',', '"', '\\');
            $written_rows++;
        }
        
        $flush_result = fflush($stock_handle);
        $close_result = fclose($stock_handle);
        
        logDebug('Saved stock CSV file', [
            'path' => $stock_csv_path,
            'rows' => count($csv_stock_data),
            'written_rows' => $written_rows,
            'flush_result' => $flush_result,
            'close_result' => $close_result,
            'file_exists' => file_exists($stock_csv_path),
            'file_size' => file_exists($stock_csv_path) ? filesize($stock_csv_path) : 0
        ]);
    } else {
        logDebug('Stock CSV path is null', [
            'manufacturer_id' => $manufacturer_id,
            'getCsvPath_result' => getCsvPath('stock', $manufacturer_id)
        ]);
    }
    
    // product_details CSVファイルを保存
    // 既存の品番は更新せず、新規品番のみ追加
    $details_csv_path = getCsvPath('product_details', $manufacturer_id);
    if ($details_csv_path) {
        // 相対パスを絶対パスに変換
        $details_csv_path = $project_root . '/' . $details_csv_path;
        // ファイル名が期待と異なる場合の警告
        $cleanManufacturerId = $manufacturer_id;
        if (strpos($cleanManufacturerId, 'manu_') !== 0) {
            $cleanManufacturerId = 'manu_' . $cleanManufacturerId;
        }
        $expectedFileName = "{$cleanManufacturerId}_details.csv";
        $actualFileName = basename($details_csv_path);
        if ($actualFileName !== $expectedFileName) {
            logDebug('Warning: Product details CSV filename mismatch', [
                'expected' => $expectedFileName,
                'actual' => $actualFileName,
                'path' => $details_csv_path
            ], 'warning');
        }
        
        // 既存ファイルは615-647行目で既に読み込まれている
        // $csv_product_details_mapには既存の品番と新規品番が含まれている
        // 既存の品番は更新せず、新規品番のみ追加されている
        
        $details_dir = dirname($details_csv_path);
        if (!is_dir($details_dir)) {
            if (!mkdir($details_dir, 0755, true)) {
                throw new Exception('Failed to create directory: ' . $details_dir);
            }
        }
        
        $csv_product_details_data = array_values($csv_product_details_map);
        
        $details_headers = [];
        if (!empty($csv_product_details_data)) {
            $details_headers = array_keys($csv_product_details_data[0]);
        } else {
            $details_headers = [
                'id', 'manufacturer_id', 'product_code', 'productName', 'product_name',
                'description', 'images', 'tags', 'brand',
                'meta_title', 'meta_description', 'og_image_url', 'og_title', 'og_description'
            ];
        }
        
        $details_handle = fopen($details_csv_path, 'w');
        if ($details_handle === false) {
            throw new Exception('Failed to open product_details CSV file for writing: ' . $details_csv_path);
        }
        
        fwrite($details_handle, "\xEF\xBB\xBF");
        fputcsv($details_handle, $details_headers, ',', '"', '\\');
        
        foreach ($csv_product_details_data as $row) {
            $values = [];
            foreach ($details_headers as $header) {
                $value = $row[$header] ?? '';
                if ($value === null) {
                    $value = '';
                }
                $values[] = $value;
            }
            fputcsv($details_handle, $values, ',', '"', '\\');
        }
        
        fclose($details_handle);
        logDebug('Saved product_details CSV file', [
            'path' => $details_csv_path,
            'rows' => count($csv_product_details_data),
            'new_products' => $summary['newProducts']
        ]);
    }
    
    $message = "インポートが完了しました。";
    if (count($summary['errors']) > 0) {
        $error_count = count($summary['errors']);
        $unique_error_count = count($summary['errorSummary']);
        $message .= " {$error_count}件のエラーが発生しました。エラータイプは {$unique_error_count}種類です。";
    }
    
    $error_summary_formatted = [];
    foreach ($summary['errorSummary'] as $error) {
        $rows_preview = count($error['rows']) > 10 
            ? implode(', ', array_slice($error['rows'], 0, 10)) . '... (他 ' . (count($error['rows']) - 10) . '件)'
            : implode(', ', $error['rows']);
        $error_summary_formatted[] = [
            'message' => $error['message'],
            'count' => $error['count'],
            'affected_rows' => $rows_preview,
            'location' => $error['location']
        ];
    }
    usort($error_summary_formatted, function($a, $b) {
        return $b['count'] - $a['count'];
    });
    
    echo json_encode([
        'success' => true,
        'message' => $message,
        'summary' => [
            'totalRows' => $summary['totalRows'],
            'updatedStock' => $summary['updatedStock'],
            'newItems' => $summary['newItems'],
            'skippedUnchanged' => $summary['skippedUnchanged'],
            'newProducts' => $summary['newProducts'],
            'errors' => $summary['errors'],
            'errorSummary' => $error_summary_formatted
        ],
        'debug_log' => $debug_mode ? $debug_log : null
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    $errorDetails = [
        'success' => false,
        'message' => 'インポート処理中にエラーが発生しました',
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $debug_mode ? $e->getTraceAsString() : null,
        'debug_log' => $debug_mode ? $debug_log : null,
        'request_info' => [
            'method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
            'has_csv_file' => isset($_FILES['csv_file']),
            'manufacturer_id' => $manufacturer_id ?? null,
            'mapping_keys' => $mapping ? array_keys($mapping) : null
        ]
    ];
    echo json_encode($errorDetails, JSON_UNESCAPED_UNICODE);
    error_log("[import-stock-csv.php] Fatal error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
    error_log("[import-stock-csv.php] Stack trace: " . $e->getTraceAsString());
} catch (Error $e) {
    // PHP 7+ のError例外もキャッチ
    http_response_code(500);
    $errorDetails = [
        'success' => false,
        'message' => 'インポート処理中に致命的なエラーが発生しました',
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $debug_mode ? $e->getTraceAsString() : null,
        'debug_log' => $debug_mode ? $debug_log : null,
        'request_info' => [
            'method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
            'has_csv_file' => isset($_FILES['csv_file']),
            'manufacturer_id' => $manufacturer_id ?? null
        ]
    ];
    echo json_encode($errorDetails, JSON_UNESCAPED_UNICODE);
    error_log("[import-stock-csv.php] Fatal error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
    error_log("[import-stock-csv.php] Stack trace: " . $e->getTraceAsString());
}

<?php
/**
 * Product Definition Tool - Direct Database Access API
 * 商品定義管理ツール専用API
 * ツール名: product-definition-tool
 */

header('Content-Type: application/json; charset=utf-8');
// CORS: Restrict in production
$allowed_origins = [
    'http://localhost', 'http://localhost:3000', 'http://127.0.0.1', 'http://127.0.0.1:3000',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: {$origin}");
} else {
    header('Access-Control-Allow-Origin: *'); // Development only
}
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'db_connect.php';
require_once 'schema_utils.php';

$tool_name = 'product-definition-tool';
error_log("[{$tool_name}-data.php] Request received");

/**
 * Validates and sanitizes table name to prevent SQL injection
 * Only allows alphanumeric characters, underscores, and hyphens
 */
function validateTableName($tableName) {
    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $tableName)) {
        throw new InvalidArgumentException("Invalid table name: '{$tableName}' contains invalid characters");
    }
    return $tableName;
}

/**
 * Fetches table data directly from database
 * @param PDO $pdo Database connection
 * @param string $tableName Table name (validated)
 * @param bool $lightweight If true, fetch only essential columns for large tables
 * @return array Array of rows from the table
 */
function fetchDirectTable($pdo, $tableName, $lightweight = false) {
    try {
        $safeTableName = validateTableName($tableName);
        
        // Check if table exists using schema_utils function (more reliable)
        if (!tableExists($pdo, $safeTableName)) {
            error_log("[product-definition-tool-data.php] Table '{$safeTableName}' does not exist in database");
            return [];
        }
        
        // Full data fetch - table name is validated and whitelisted, so safe to use
        $stmt = $pdo->query("SELECT * FROM `{$safeTableName}`");
        
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        error_log("[product-definition-tool-data.php] Fetched " . count($rows) . " rows from table '{$safeTableName}'");
        
        // Filter out completely empty rows (all values are null, undefined, or empty strings)
        $filteredRows = array_filter($rows, function($row) {
            if (!$row || !is_array($row)) {
                return false;
            }
            
            // Check if at least one field has a meaningful value
            $hasValidValue = false;
            foreach ($row as $value) {
                if ($value === null || $value === '') {
                    continue;
                }
                if (is_string($value) && trim($value) !== '') {
                    $hasValidValue = true;
                    break;
                }
                if (is_bool($value) || is_numeric($value)) {
                    $hasValidValue = true;
                    break;
                }
            }
            
            return $hasValidValue;
        });
        
        $filteredCount = count($filteredRows);
        if ($filteredCount !== count($rows)) {
            error_log("[product-definition-tool-data.php] Filtered " . (count($rows) - $filteredCount) . " empty rows from table '{$safeTableName}'");
        }
        
        return array_values($filteredRows);
    } catch (InvalidArgumentException $e) {
        error_log("[product-definition-tool-data.php] Invalid table name error: " . $e->getMessage());
        throw $e;
    } catch (PDOException $e) {
        error_log("[product-definition-tool-data.php] Error fetching table '{$tableName}': " . $e->getMessage());
        throw $e;
    }
}

/**
 * メーカー依存テーブルのリスト
 */
function isManufacturerDependentTable($tableName) {
    $manufacturerDependentTables = [
        'sizes', 'colors'
    ];
    return in_array($tableName, $manufacturerDependentTables);
}

/**
 * メーカー別テーブル名からベーステーブル名を抽出
 * @param string $tableName テーブル名（例: 'colors_manu_0001'）
 * @return array ['baseTableName' => string, 'manufacturerId' => string|null]
 */
function parseManufacturerTableName($tableName) {
    $manufacturerDependentTables = [
        'sizes', 'colors'
    ];
    
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
    
    return ['baseTableName' => $tableName, 'manufacturerId' => null];
}

/**
 * メーカー一覧を取得
 * @param PDO $pdo Database connection
 * @return array Array of manufacturers
 */
function fetchManufacturers($pdo) {
    try {
        $stmt = $pdo->query("SELECT * FROM `manufacturers`");
        $manufacturers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        // メーカーIDが有効なもののみをフィルタ
        $manufacturers = array_filter($manufacturers, function($m) {
            return isset($m['id']) && $m['id'] !== 'undefined' && trim($m['id']) !== '';
        });
        return array_values($manufacturers);
    } catch (PDOException $e) {
        error_log("[product-definition-tool-data.php] Error fetching manufacturers: " . $e->getMessage());
        return [];
    }
}

// --- API Routing ---
$table_names_req = $_GET['tables'] ?? null;
$lightweight = isset($_GET['lightweight']) && $_GET['lightweight'] === 'true';

if (!$table_names_req) {
    http_response_code(400);
    echo json_encode(['error' => 'Request parameter "tables" not specified.']);
    exit();
}

// Whitelist of tables for Product Definition Tool
// Whitelist of tables for Product Definition Tool
// 目的: ツールごとのアクセス制限（セキュリティ）
// 注意: tableExists()は「テーブルの存在確認」、ホワイトリストは「ツールがアクセス可能なテーブル」を制限する
// 両方の役割が異なるため、両方必要
$all_tables_whitelist = [
    'manufacturers', 'brands', 'categories', 'tags', 'product_sizes', 'product_color_sizes',
    // 注意: colors, sizesは削除済み（stockテーブルから取得）
    'print_locations', 'print_size_constraints', 'category_print_locations',
    'print_cost_combination', 'plate_cost_combination', 'payment_methods',
    'time_units', 'calculation_logic_types', 'ink_product_types', 'weight_volume_units',
    'free_input_item_types', 'color_libraries', 'color_library_types'
];

try {
    $requested_tables_raw = explode(',', $table_names_req);
    $db = [];
    $tables_to_fetch = in_array('all', $requested_tables_raw) ? $all_tables_whitelist : $requested_tables_raw;
    
    // メーカー一覧を取得（メーカー別テーブルを取得するために必要）
    $manufacturers = [];
    if (in_array('manufacturers', $tables_to_fetch) || in_array('all', $requested_tables_raw)) {
        $manufacturers = fetchManufacturers($pdo);
    } else {
        // manufacturersテーブルがリクエストされていなくても、メーカー依存テーブルがある場合は取得
        $hasManufacturerDependentTable = false;
        foreach ($tables_to_fetch as $table) {
            $parsed = parseManufacturerTableName($table);
            if (isManufacturerDependentTable($parsed['baseTableName'])) {
                $hasManufacturerDependentTable = true;
                break;
            }
        }
        if ($hasManufacturerDependentTable) {
            $manufacturers = fetchManufacturers($pdo);
        }
    }

    // Direct database queries - no intermediate layer
    // Security: All table names are validated against whitelist before use
    foreach($tables_to_fetch as $table) {
        $table = trim($table);
        
        // メーカー別テーブル名が直接リクエストされた場合の処理
        $parsed = parseManufacturerTableName($table);
        $baseTableName = $parsed['baseTableName'];
        $isManufacturerTableName = $parsed['manufacturerId'] !== null;
        
        // Security: Whitelist check - ベーステーブル名またはメーカー別テーブル名をチェック
        if (!in_array($baseTableName, $all_tables_whitelist)) {
            error_log("[product-definition-tool-data.php] SECURITY: Attempted access to non-whitelisted table: '{$table}' (base: '{$baseTableName}')");
            continue;
        }
        
        try {
            // Additional validation: Ensure table name contains only safe characters
            if (!preg_match('/^[a-zA-Z0-9_-]+$/', $table)) {
                error_log("[product-definition-tool-data.php] SECURITY: Invalid characters in table name: '{$table}'");
                continue;
            }
            
            // メーカー別テーブル名が直接リクエストされた場合
            if ($isManufacturerTableName) {
                // 直接取得
                try {
                    // テーブルの存在確認（データベースから直接確認）
                    if (!tableExists($pdo, $table)) {
                        error_log("[product-definition-tool-data.php] Manufacturer table '{$table}' does not exist in database");
                        $db[$table] = ['schema' => [], 'data' => []];
                    } else {
                        $rawRows = fetchDirectTable($pdo, $table, $lightweight);
                        $schema = fetchTableSchema($pdo, $table);
                        $db[$table] = [
                            'schema' => $schema,
                            'data' => $rawRows
                        ];
                        error_log("[product-definition-tool-data.php] Fetched manufacturer table '{$table}' with " . count($rawRows) . " rows and " . count($schema) . " columns");
                    }
                } catch (PDOException $e) {
                    // メーカー別テーブルが存在しない場合は空配列を返す
                    $db[$table] = ['schema' => [], 'data' => []];
                    error_log("[product-definition-tool-data.php] Manufacturer table '{$table}' does not exist, returning empty array");
                }
            } elseif (isManufacturerDependentTable($baseTableName) && !empty($manufacturers)) {
                // ベーステーブル名がリクエストされた場合、すべてのメーカー別テーブルを取得
                foreach ($manufacturers as $manufacturer) {
                    $manufacturerId = $manufacturer['id'] ?? null;
                    if (!$manufacturerId || $manufacturerId === 'undefined' || trim($manufacturerId) === '') {
                        continue;
                    }
                    
                    $manufacturerTableName = "{$baseTableName}_{$manufacturerId}";
                    try {
                        // テーブルの存在確認（データベースから直接確認）
                        if (!tableExists($pdo, $manufacturerTableName)) {
                            error_log("[product-definition-tool-data.php] Manufacturer table '{$manufacturerTableName}' does not exist in database");
                            $db[$manufacturerTableName] = ['schema' => [], 'data' => []];
                        } else {
                            $manufacturerRows = fetchDirectTable($pdo, $manufacturerTableName, $lightweight);
                            $manufacturerSchema = fetchTableSchema($pdo, $manufacturerTableName);
                            $db[$manufacturerTableName] = [
                                'schema' => $manufacturerSchema,
                                'data' => $manufacturerRows
                            ];
                            error_log("[product-definition-tool-data.php] Fetched manufacturer table '{$manufacturerTableName}' with " . count($manufacturerRows) . " rows and " . count($manufacturerSchema) . " columns");
                        }
                    } catch (PDOException $e) {
                        // メーカー別テーブルが存在しない場合は空配列を返す
                        $db[$manufacturerTableName] = ['schema' => [], 'data' => []];
                        error_log("[product-definition-tool-data.php] Manufacturer table '{$manufacturerTableName}' does not exist, returning empty array");
                    }
                }
            } else {
                // メーカー非依存テーブルはそのまま取得
                // テーブルの存在確認（データベースから直接確認）
                if (!tableExists($pdo, $table)) {
                    error_log("[product-definition-tool-data.php] Table '{$table}' does not exist in database");
                    $db[$table] = ['schema' => [], 'data' => []];
                } else {
                    $rawRows = fetchDirectTable($pdo, $table, $lightweight);
                    $schema = fetchTableSchema($pdo, $table);
                    $db[$table] = [
                        'schema' => $schema,
                        'data' => $rawRows
                    ];
                    
                    // Debug: Log loading results
                    if (empty($rawRows)) {
                        error_log("[product-definition-tool-data.php] Table '{$table}' returned empty array (no rows or all rows filtered), but schema has " . count($schema) . " columns");
                    } else {
                        error_log("[product-definition-tool-data.php] Successfully loaded " . count($rawRows) . " rows from table '{$table}' with " . count($schema) . " columns");
                    }
                }
            }
        } catch (InvalidArgumentException $e) {
            error_log("[product-definition-tool-data.php] Error loading table '{$table}': " . $e->getMessage());
            $db[$table] = ['schema' => [], 'data' => []]; // Return empty array on invalid table name
        } catch (PDOException $e) {
            // If a table doesn't exist or has other errors, log and return empty array
            $errorCode = $e->getCode();
            $errorMessage = $e->getMessage();
            
            error_log("[product-definition-tool-data.php] Error loading table '{$table}': Code {$errorCode}, Message: {$errorMessage}");
            
            if ($e->getCode() == '42S02') { // SQLSTATE[42S02]: Base table or view not found
                $db[$table] = ['schema' => [], 'data' => []];
                error_log("[product-definition-tool-data.php] Table '{$table}' not found, returning empty array");
            } else {
                $db[$table] = ['schema' => [], 'data' => []];
                error_log("[product-definition-tool-data.php] Table '{$table}' error (not 42S02), returning empty array");
            }
        } catch (Exception $e) {
            error_log("[product-definition-tool-data.php] Unexpected error loading table '{$table}': " . $e->getMessage());
            $db[$table] = ['schema' => [], 'data' => []];
        }
    }
    
    echo json_encode($db, JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database query failed: ' . $e->getMessage()]);
    exit();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
    exit();
}
?>


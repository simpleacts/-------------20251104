<?php
/**
 * Silkscreen Logic Tool - Direct Database Access API
 * シルクスクリーン計算ロジックツール専用API
 * ツール名: silkscreen-logic-tool
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

$tool_name = 'silkscreen-logic-tool';
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
            error_log("[silkscreen-logic-tool-data.php] Table '{$safeTableName}' does not exist in database");
            return [];
        }
        
        // Lightweight mode: fetch only essential columns for large tables
        // 注意: products_masterは削除済み（stockテーブルから取得）
        if ($lightweight && $safeTableName === 'stock') {
            $stmt = $pdo->query("SELECT `id`, `productCode`, `brand_id`, `category_id`, `is_published`, `jan_code` FROM `{$safeTableName}`");
        } else {
            // Full data fetch - table name is validated and whitelisted, so safe to use
            $stmt = $pdo->query("SELECT * FROM `{$safeTableName}`");
        }
        
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        error_log("[silkscreen-logic-tool-data.php] Fetched " . count($rows) . " rows from table '{$safeTableName}'");
        
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
            error_log("[silkscreen-logic-tool-data.php] Filtered " . (count($rows) - $filteredCount) . " empty rows from table '{$safeTableName}'");
        }
        
        return array_values($filteredRows);
    } catch (InvalidArgumentException $e) {
        error_log("[silkscreen-logic-tool-data.php] Invalid table name error: " . $e->getMessage());
        throw $e;
    } catch (PDOException $e) {
        error_log("[silkscreen-logic-tool-data.php] Error fetching table '{$tableName}': " . $e->getMessage());
        throw $e;
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

// Whitelist of tables for Silkscreen Logic Tool (same as estimator)
$all_tables_whitelist = [
    // 基本設定
    'settings', 'color_settings', 'layout_settings', 'behavior_settings',
    // マスタデータ
    // 注意: colors, sizesは削除済み（stockテーブルから取得）
    'brands', 'customer_groups', 'tags', 'categories', 'manufacturers',
    // 価格・コスト設定
    'plate_costs', 'special_ink_costs', 'additional_print_costs_by_size',
    'additional_print_costs_by_location', 'additional_print_costs_by_tag',
    'print_pricing_tiers', 'shipping_costs',
    // 組み合わせ・制約
    'print_cost_combination', 'plate_cost_combination',
    'category_print_locations', 'print_size_constraints', 'print_locations',
    // 会社情報・その他
    'company_info', 'partner_codes', 'prefectures',
    // 価格ルール
    'pricing_rules', 'pricing_assignments', 'volume_discount_schedules',
    // 追加オプション
    'additional_options',
    // DTF関連
    'dtf_consumables', 'dtf_equipment', 'dtf_labor_costs',
    'dtf_electricity_rates', 'dtf_printers', 'dtf_print_speeds', 'dtf_press_time_costs',
    // PDF関連
    'pdf_templates', 'pdf_item_display_configs',
    // 商品データ
    // 注意: products_master, product_details, product_tagsは削除済み（stockテーブルから取得）
    'stock', 'incoming_stock'
    // 注意: product_prices, product_colors, skusは非推奨（stockテーブルから取得）
];

try {
    $requested_tables_raw = explode(',', $table_names_req);
    $db = [];
    $tables_to_fetch = in_array('all', $requested_tables_raw) ? $all_tables_whitelist : $requested_tables_raw;

    // Direct database queries - no intermediate layer
    // Security: All table names are validated against whitelist before use
    foreach($tables_to_fetch as $table) {
        $table = trim($table);
        
        // Security: Whitelist check - only allow predefined table names
        if (!in_array($table, $all_tables_whitelist)) {
            error_log("[silkscreen-logic-tool-data.php] SECURITY: Attempted access to non-whitelisted table: '{$table}'");
            continue;
        }
        
        try {
            // Additional validation: Ensure table name contains only safe characters
            if (!preg_match('/^[a-zA-Z0-9_-]+$/', $table)) {
                error_log("[silkscreen-logic-tool-data.php] SECURITY: Invalid characters in table name: '{$table}'");
                continue;
            }
            
            // テーブルの存在確認（データベースから直接確認）
            if (!tableExists($pdo, $table)) {
                error_log("[silkscreen-logic-tool-data.php] Table '{$table}' does not exist in database");
                $db[$table] = ['schema' => [], 'data' => []];
                continue;
            }
            
            // Direct query - table name is whitelisted and validated, so safe to use
            // 注意: products_masterは削除済み（stockテーブルから取得）
            $isLightweightTable = ($table === 'stock');
            $rawRows = fetchDirectTable($pdo, $table, $lightweight && $isLightweightTable);
            $schema = fetchTableSchema($pdo, $table);
            $db[$table] = [
                'schema' => $schema,
                'data' => $rawRows
            ];
            
            // Debug: Log loading results
            if (empty($rawRows)) {
                error_log("[silkscreen-logic-tool-data.php] Table '{$table}' returned empty array (no rows or all rows filtered), but schema has " . count($schema) . " columns");
            } else {
                error_log("[silkscreen-logic-tool-data.php] Successfully loaded " . count($rawRows) . " rows from table '{$table}' with " . count($schema) . " columns");
            }
        } catch (InvalidArgumentException $e) {
            error_log("[silkscreen-logic-tool-data.php] Error loading table '{$table}': " . $e->getMessage());
            $db[$table] = ['schema' => [], 'data' => []]; // Return empty array on invalid table name
        } catch (PDOException $e) {
            // If a table doesn't exist or has other errors, log and return empty array
            $errorCode = $e->getCode();
            $errorMessage = $e->getMessage();
            
            error_log("[silkscreen-logic-tool-data.php] Error loading table '{$table}': Code {$errorCode}, Message: {$errorMessage}");
            
            if ($e->getCode() == '42S02') { // SQLSTATE[42S02]: Base table or view not found
                $db[$table] = ['schema' => [], 'data' => []];
                error_log("[silkscreen-logic-tool-data.php] Table '{$table}' not found, returning empty array");
            } else {
                $db[$table] = ['schema' => [], 'data' => []];
                error_log("[silkscreen-logic-tool-data.php] Table '{$table}' error (not 42S02), returning empty array");
            }
        } catch (Exception $e) {
            error_log("[silkscreen-logic-tool-data.php] Unexpected error loading table '{$table}': " . $e->getMessage());
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


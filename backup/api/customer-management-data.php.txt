<?php
/**
 * Customer Management Tool - Direct Database Access API
 * 顧客管理ツール専用API
 * ツール名: customer-management
 */

header('Content-Type: application/json; charset=utf-8');
$allowed_origins = [
    'http://localhost', 'http://localhost:3000', 'http://127.0.0.1', 'http://127.0.0.1:3000',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: {$origin}");
} else {
    header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'db_connect.php';
require_once 'schema_utils.php';

$tool_name = 'customer-management';
error_log("[{$tool_name}-data.php] Request received");

/**
 * Validates and sanitizes table name to prevent SQL injection
 */
function validateTableName($tableName) {
    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $tableName)) {
        throw new InvalidArgumentException("Invalid table name: '{$tableName}' contains invalid characters");
    }
    return $tableName;
}

/**
 * Fetches table data directly from database
 */
function fetchDirectTable($pdo, $tableName, $lightweight = false) {
    try {
        $safeTableName = validateTableName($tableName);
        
        // Check if table exists using schema_utils function (more reliable)
        if (!tableExists($pdo, $safeTableName)) {
            error_log("[customer-management-data.php] Table '{$safeTableName}' does not exist in database");
            return [];
        }
        
        // Lightweight mode: fetch only essential columns for large tables
        if ($lightweight && $safeTableName === 'customers') {
            $stmt = $pdo->query("SELECT `id`, `company_name`, `name_kanji`, `name_kana`, `phone`, `email`, `customer_group_id`, `zip_code`, `address1`, `address2` FROM `{$safeTableName}`");
        } else {
            // Full data fetch - table name is validated and whitelisted, so safe to use
            $stmt = $pdo->query("SELECT * FROM `{$safeTableName}`");
        }
        
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        error_log("[customer-management-data.php] Fetched " . count($rows) . " rows from table '{$safeTableName}'");
        
        // Filter out completely empty rows
        $filteredRows = array_filter($rows, function($row) {
            if (!$row || !is_array($row)) {
                return false;
            }
            
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
            error_log("[customer-management-data.php] Filtered " . (count($rows) - $filteredCount) . " empty rows from table '{$safeTableName}'");
        }
        
        return array_values($filteredRows);
    } catch (InvalidArgumentException $e) {
        error_log("[customer-management-data.php] Invalid table name error: " . $e->getMessage());
        throw $e;
    } catch (PDOException $e) {
        error_log("[customer-management-data.php] Error fetching table '{$tableName}': " . $e->getMessage());
        throw $e;
    }
}

$table_names_req = $_GET['tables'] ?? null;
$lightweight = isset($_GET['lightweight']) && $_GET['lightweight'] === 'true';

if (!$table_names_req) {
    http_response_code(400);
    echo json_encode(['error' => 'Request parameter "tables" not specified.']);
    exit();
}

// Whitelist of tables for Customer Management Tool
$all_tables_whitelist = [
    'customers', 'quotes', 'customer_groups', 'pagination_settings', 'prefectures'
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
            error_log("[customer-management-data.php] SECURITY: Attempted access to non-whitelisted table: '{$table}'");
            continue;
        }
        
        try {
            // Additional validation: Ensure table name contains only safe characters
            if (!preg_match('/^[a-zA-Z0-9_-]+$/', $table)) {
                error_log("[customer-management-data.php] SECURITY: Invalid characters in table name: '{$table}'");
                continue;
            }
            
            // テーブルの存在確認（データベースから直接確認）
            if (!tableExists($pdo, $table)) {
                error_log("[customer-management-data.php] Table '{$table}' does not exist in database");
                $db[$table] = ['schema' => [], 'data' => []];
                continue;
            }
            
            // Direct query - table name is whitelisted and validated, so safe to use
            $isLightweightTable = ($table === 'customers');
            $rawRows = fetchDirectTable($pdo, $table, $lightweight && $isLightweightTable);
            $schema = fetchTableSchema($pdo, $table);
            $db[$table] = [
                'schema' => $schema,
                'data' => $rawRows
            ];
            
            // Debug: Log loading results
            if (empty($rawRows)) {
                error_log("[customer-management-data.php] Table '{$table}' returned empty array (no rows or all rows filtered), but schema has " . count($schema) . " columns");
            } else {
                error_log("[customer-management-data.php] Successfully loaded " . count($rawRows) . " rows from table '{$table}' with " . count($schema) . " columns");
            }
        } catch (InvalidArgumentException $e) {
            error_log("[customer-management-data.php] Error loading table '{$table}': " . $e->getMessage());
            $db[$table] = ['schema' => [], 'data' => []]; // Return empty array on invalid table name
        } catch (PDOException $e) {
            // If a table doesn't exist or has other errors, log and return empty array
            $errorCode = $e->getCode();
            $errorMessage = $e->getMessage();
            
            error_log("[customer-management-data.php] Error loading table '{$table}': Code {$errorCode}, Message: {$errorMessage}");
            
            if ($e->getCode() == '42S02') { // SQLSTATE[42S02]: Base table or view not found
                $db[$table] = ['schema' => [], 'data' => []];
                error_log("[customer-management-data.php] Table '{$table}' not found, returning empty array");
            } else {
                $db[$table] = ['schema' => [], 'data' => []];
                error_log("[customer-management-data.php] Table '{$table}' error (not 42S02), returning empty array");
            }
        } catch (Exception $e) {
            error_log("[customer-management-data.php] Unexpected error loading table '{$table}': " . $e->getMessage());
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


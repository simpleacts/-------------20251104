<?php
/**
 * App Initialization - Direct Database Access API
 * アプリ初期化専用API
 * ツール名: app-initialization
 */

// Set error reporting to catch issues early while keeping responses JSON-only
error_reporting(E_ALL);
ini_set('display_errors', 0);            // Never dump HTML into JSON responses
ini_set('display_startup_errors', 0);
ini_set('log_errors', 1);

// Set JSON header first to ensure proper response format
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
header('Access-Control-Allow-Methods: GET, HEAD');
header('Access-Control-Allow-Headers: Content-Type');

// Try to require db_connect.php with better error handling
try {
    if (!file_exists(__DIR__ . '/db_connect.php')) {
        throw new Exception('db_connect.php not found in ' . __DIR__);
    }
    require_once 'db_connect.php';
require_once 'schema_utils.php';
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection setup failed: ' . $e->getMessage()]);
    error_log('[app-initialization-data.php] Failed to require db_connect.php: ' . $e->getMessage());
    exit();
}

$tool_name = 'app-initialization';
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
function fetchDirectTable($pdo, $tableName) {
    try {
        $safeTableName = validateTableName($tableName);
        
        // Check if table exists using schema_utils function (more reliable)
        if (!tableExists($pdo, $safeTableName)) {
            error_log("[app-initialization-data.php] Table '{$safeTableName}' does not exist in database");
            return [];
        }
        
        // Full data fetch - table name is validated and whitelisted, so safe to use
        $stmt = $pdo->query("SELECT * FROM `{$safeTableName}`");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        error_log("[app-initialization-data.php] Fetched " . count($rows) . " rows from table '{$safeTableName}'");
        
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
            error_log("[app-initialization-data.php] Filtered " . (count($rows) - $filteredCount) . " empty rows from table '{$safeTableName}'");
        }
        
        return array_values($filteredRows);
    } catch (InvalidArgumentException $e) {
        error_log("[app-initialization-data.php] Invalid table name error: " . $e->getMessage());
        throw $e;
    } catch (PDOException $e) {
        error_log("[app-initialization-data.php] Error fetching table '{$tableName}': " . $e->getMessage());
        throw $e;
    }
}

// Handle HEAD requests (for connectivity check)
if ($_SERVER['REQUEST_METHOD'] === 'HEAD') {
    http_response_code(200);
    exit();
}

$table_names_req = $_GET['tables'] ?? null;

if (!$table_names_req) {
    http_response_code(400);
    echo json_encode(['error' => 'Request parameter "tables" not specified.']);
    exit();
}

// Whitelist of tables for App Initialization
// This should match getInitialTables() in db.live.ts
// Note: Some tools may request additional tables like quote_items, quote_designs for initialization
$all_tables_whitelist = [
    'settings', 'color_settings', 'layout_settings', 'behavior_settings', 'pagination_settings',
    'users', 'roles', 'role_permissions', 'dev_locks', 'google_api_settings', 'email_accounts', 'tool_migrations',
    'app_logs', 'tool_visibility_settings', 'mobile_tool_mappings', 'tool_dependencies', 'icons', 'ai_settings', 'google_fonts',
    'modules_page_tool', 'modules_core',
    // Quote-related tables (used by estimator and other tools)
    'quotes', 'quote_items', 'quote_designs', 'quote_tasks', 'quote_history',
    // Customer-related tables
    'customers',
    // Language settings
    'language_settings_common', 'language_settings',
    // Size order master (common table for all manufacturers)
    'size_order_master'
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
            error_log("[app-initialization-data.php] SECURITY: Attempted access to non-whitelisted table: '{$table}'");
            continue;
        }
        
        try {
            // Additional validation: Ensure table name contains only safe characters
            if (!preg_match('/^[a-zA-Z0-9_-]+$/', $table)) {
                error_log("[app-initialization-data.php] SECURITY: Invalid characters in table name: '{$table}'");
                continue;
            }
            
            // テーブルの存在確認（データベースから直接確認）
            if (!tableExists($pdo, $table)) {
                error_log("[app-initialization-data.php] Table '{$table}' does not exist in database");
                $db[$table] = ['schema' => [], 'data' => []];
                continue;
            }
            
            // Direct query - table name is whitelisted and validated, so safe to use
            $rawRows = fetchDirectTable($pdo, $table);
            $schema = fetchTableSchema($pdo, $table);
            $db[$table] = [
                'schema' => $schema,
                'data' => $rawRows
            ];
            
            // Debug: Log loading results
            if (empty($rawRows)) {
                error_log("[app-initialization-data.php] Table '{$table}' returned empty array (no rows or all rows filtered), but schema has " . count($schema) . " columns");
            } else {
                error_log("[app-initialization-data.php] Successfully loaded " . count($rawRows) . " rows from table '{$table}' with " . count($schema) . " columns");
            }
        } catch (InvalidArgumentException $e) {
            error_log("[app-initialization-data.php] Error loading table '{$table}': " . $e->getMessage());
            $db[$table] = ['schema' => [], 'data' => []]; // Return empty array on invalid table name
        } catch (PDOException $e) {
            // If a table doesn't exist or has other errors, log and return empty array
            $errorCode = $e->getCode();
            $errorMessage = $e->getMessage();
            
            error_log("[app-initialization-data.php] Error loading table '{$table}': Code {$errorCode}, Message: {$errorMessage}");
            
            if ($e->getCode() == '42S02') { // SQLSTATE[42S02]: Base table or view not found
                $db[$table] = ['schema' => [], 'data' => []];
                error_log("[app-initialization-data.php] Table '{$table}' not found, returning empty array");
            } else {
                $db[$table] = ['schema' => [], 'data' => []];
                error_log("[app-initialization-data.php] Table '{$table}' error (not 42S02), returning empty array");
            }
        } catch (Exception $e) {
            error_log("[app-initialization-data.php] Unexpected error loading table '{$table}': " . $e->getMessage());
            $db[$table] = ['schema' => [], 'data' => []];
        }
    }
    
    echo json_encode($db, JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    http_response_code(500);
    $errorMessage = 'Database query failed: ' . $e->getMessage();
    error_log('[app-initialization-data.php] PDOException: ' . $errorMessage);
    echo json_encode(['error' => $errorMessage]);
    exit();
} catch (Exception $e) {
    http_response_code(500);
    $errorMessage = 'Server error: ' . $e->getMessage();
    error_log('[app-initialization-data.php] Exception: ' . $errorMessage);
    echo json_encode(['error' => $errorMessage]);
    exit();
} catch (Error $e) {
    // Catch fatal errors (PHP 7+)
    http_response_code(500);
    $errorMessage = 'Fatal error: ' . $e->getMessage();
    error_log('[app-initialization-data.php] Fatal Error: ' . $errorMessage);
    echo json_encode(['error' => $errorMessage]);
    exit();
}
?>


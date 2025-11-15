<?php
/**
 * Architecture Designer - Direct Database Access API
 * アーキテクチャ設計専用API
 * ツール名: architecture-designer
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

$tool_name = 'architecture-designer';
error_log("[{$tool_name}-data.php] Request received");

function validateTableName($tableName) {
    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $tableName)) {
        throw new InvalidArgumentException("Invalid table name: '{$tableName}' contains invalid characters");
    }
    return $tableName;
}

function fetchDirectTable($pdo, $tableName, $lightweight = false) {
    try {
        $safeTableName = validateTableName($tableName);
        
        // Check if table exists using schema_utils function (more reliable)
        if (!tableExists($pdo, $safeTableName)) {
            error_log("[architecture-designer-data.php] Table '{$safeTableName}' does not exist in database");
            return [];
        }
        
        $stmt = $pdo->query("SELECT * FROM `{$safeTableName}`");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        error_log("[architecture-designer-data.php] Fetched " . count($rows) . " rows from table '{$safeTableName}'");
        
        $filteredRows = array_filter($rows, function($row) {
            if (!$row || !is_array($row)) return false;
            $hasValidValue = false;
            foreach ($row as $value) {
                if ($value === null || $value === '') continue;
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
        
        return array_values($filteredRows);
    } catch (InvalidArgumentException $e) {
        error_log("[architecture-designer-data.php] Invalid table name error: " . $e->getMessage());
        throw $e;
    } catch (PDOException $e) {
        error_log("[architecture-designer-data.php] Error fetching table '{$tableName}': " . $e->getMessage());
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

$all_tables_whitelist = ['modules_core', 'modules_page_tool', 'modules_service', 'modules_other', 'modules_ui_atoms', 'modules_ui_molecules', 'modules_ui_organisms', 'modules_ui_modals'];

try {
    $requested_tables_raw = explode(',', $table_names_req);
    $db = [];
    $tables_to_fetch = in_array('all', $requested_tables_raw) ? $all_tables_whitelist : $requested_tables_raw;

    foreach($tables_to_fetch as $table) {
        $table = trim($table);
        
        if (!in_array($table, $all_tables_whitelist)) {
            error_log("[architecture-designer-data.php] SECURITY: Attempted access to non-whitelisted table: '{$table}'");
            continue;
        }
        
        try {
            if (!preg_match('/^[a-zA-Z0-9_-]+$/', $table)) {
                error_log("[architecture-designer-data.php] SECURITY: Invalid characters in table name: '{$table}'");
                continue;
            }
            
            // テーブルの存在確認（データベースから直接確認）
            if (!tableExists($pdo, $table)) {
                error_log("[architecture-designer-data.php] Table '{$table}' does not exist in database");
                $db[$table] = ['schema' => [], 'data' => []];
                continue;
            }
            
            $rawRows = fetchDirectTable($pdo, $table, $lightweight);
            $schema = fetchTableSchema($pdo, $table);
            $db[$table] = [
                'schema' => $schema,
                'data' => $rawRows
            ];
            
            if (empty($rawRows)) {
                error_log("[architecture-designer-data.php] Table '{$table}' returned empty array, but schema has " . count($schema) . " columns");
            } else {
                error_log("[architecture-designer-data.php] Successfully loaded " . count($rawRows) . " rows from table '{$table}' with " . count($schema) . " columns");
            }
        } catch (Exception $e) {
            error_log("[architecture-designer-data.php] Error loading table '{$table}': " . $e->getMessage());
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


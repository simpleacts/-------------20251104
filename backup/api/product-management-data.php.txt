<?php
/**
 * Product Management Tool - Direct Database Access API
 * 商品データ管理ツール専用API
 * ツール名: product-management
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

$tool_name = 'product-management';
error_log("[{$tool_name}-data.php] Request received");

/**
 * Validates and sanitizes table name to prevent SQL injection
 * Only allows alphanumeric characters, underscores, and hyphens
 */
function validateTableName($tableName) {
    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $tableName)) {
        throw new InvalidArgumentException("Invalid table name: {$tableName}");
    }
    return $tableName;
}

/**
 * メーカー依存テーブルのリスト
 */
function isManufacturerDependentTable($tableName) {
    $manufacturerDependentTables = [
        'product_details', 'stock', 'importer_mappings', 'tags'
    ];
    return in_array($tableName, $manufacturerDependentTables);
}

/**
 * メーカーIDを含むテーブル名を生成
 * 新しい命名規則: {manufacturerId}_{tableName} (例: manu_0001_details)
 */
function getManufacturerTableName($baseTableName, $manufacturerId) {
    $fileName = $baseTableName;
    if ($baseTableName === 'product_details') {
        $fileName = 'details';
    } else if ($baseTableName === 'stock') {
        $fileName = 'stock';
    } else if ($baseTableName === 'tags') {
        $fileName = 'tags';
    }
    return "{$manufacturerId}_{$fileName}";
}

/**
 * メーカー別テーブル名からベーステーブル名を抽出
 */
function parseManufacturerTableName($tableName) {
    $manufacturerDependentTables = [
        'product_details', 'stock', 'importer_mappings', 'tags'
    ];
    
    // manu_で始まる形式をチェック（新しい命名規則）
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
    
    return ['baseTableName' => null, 'manufacturerId' => null];
}

/**
 * テーブルデータを取得
 */
function fetchTableData($pdo, $tableName, $lightweight = false) {
    try {
        $safeTableName = validateTableName($tableName);
        
        if (!tableExists($pdo, $safeTableName)) {
            error_log("[{$GLOBALS['tool_name']}-data.php] Table '{$safeTableName}' does not exist");
            return ['schema' => [], 'data' => []];
        }
        
        $stmt = $pdo->query("SELECT * FROM `{$safeTableName}`");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $schema = fetchTableSchema($pdo, $safeTableName);
        
        return [
            'schema' => $schema,
            'data' => $rows
        ];
    } catch (Exception $e) {
        error_log("[{$GLOBALS['tool_name']}-data.php] Error fetching table '{$tableName}': " . $e->getMessage());
        throw $e;
    }
}

// ホワイトリスト
$all_tables_whitelist = [
    // 共通テーブル
    'manufacturers', 'brands', 'categories', 'tags',
    // メーカー依存テーブル（manu_xxxx_details形式）
    // product_detailsはmanu_xxxx_detailsとして扱う
];

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

try {
    $pdo = get_db_connection();
    $requested_tables_raw = explode(',', $table_names_req);
    $db = [];
    $tables_to_fetch = in_array('all', $requested_tables_raw) ? $all_tables_whitelist : $requested_tables_raw;

    foreach($tables_to_fetch as $table) {
        $table = trim($table);
        
        // メーカー依存テーブルのチェック
        $parsed = parseManufacturerTableName($table);
        $isManufacturerTable = $parsed['baseTableName'] !== null;
        
        // 共通テーブルまたはメーカー依存テーブルのみ許可
        if (!in_array($table, $all_tables_whitelist) && !$isManufacturerTable) {
            error_log("[{$tool_name}-data.php] SECURITY: Attempted access to non-whitelisted table: '{$table}'");
            continue;
        }
        
        try {
            if (!preg_match('/^[a-zA-Z0-9_-]+$/', $table)) {
                error_log("[{$tool_name}-data.php] SECURITY: Invalid characters in table name: '{$table}'");
                continue;
            }
            
            $tableData = fetchTableData($pdo, $table);
            $db[$table] = $tableData;
            
            error_log("[{$tool_name}-data.php] Successfully loaded " . count($tableData['data']) . " rows from table '{$table}'");
        } catch (Exception $e) {
            error_log("[{$tool_name}-data.php] Error processing table '{$table}': " . $e->getMessage());
            $db[$table] = ['schema' => [], 'data' => []];
        }
    }
    
    echo json_encode($db, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Exception $e) {
    error_log("[{$tool_name}-data.php] Fatal error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}


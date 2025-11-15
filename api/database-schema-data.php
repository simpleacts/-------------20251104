<?php
/**
 * Database Schema Manager - Schema Only API
 * データベーススキーマ管理ツール専用API（スキーマ情報のみ）
 * ツール名: database-schema-manager
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

$tool_name = 'database-schema-manager';
error_log("[{$tool_name}-schema-data.php] Request received");

function validateTableName($tableName) {
    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $tableName)) {
        throw new InvalidArgumentException("Invalid table name: '{$tableName}' contains invalid characters");
    }
    return $tableName;
}

// getAllTables関数はschema_utils.phpから使用

try {
    $action = $_GET['action'] ?? 'schema';
    
    if ($action === 'tables') {
        // すべてのテーブル一覧を返す
        $tables = getAllTableNames($pdo);
        echo json_encode(['tables' => $tables], JSON_UNESCAPED_UNICODE);
    } else if ($action === 'schema') {
        // 指定されたテーブルのスキーマを返す
        $table_names_req = $_GET['tables'] ?? null;
        
        if (!$table_names_req) {
            http_response_code(400);
            echo json_encode(['error' => 'Request parameter "tables" not specified.']);
            exit();
        }
        
        $requested_tables_raw = explode(',', $table_names_req);
        $db = [];
        
        foreach($requested_tables_raw as $table) {
            $table = trim($table);
            
            if (!preg_match('/^[a-zA-Z0-9_-]+$/', $table)) {
                error_log("[database-schema-data.php] SECURITY: Invalid characters in table name: '{$table}'");
                continue;
            }
            
            try {
                $schema = fetchTableSchema($pdo, $table);
                if (count($schema) > 0) {
                    // フロントエンドの形式に合わせる: { tableName: { schema: [...], data: [] } }
                    $db[$table] = [
                        'schema' => $schema,
                        'data' => [] // データは取得しない
                    ];
                }
            } catch (Exception $e) {
                error_log("[database-schema-data.php] Error loading schema for table '{$table}': " . $e->getMessage());
                // エラーが発生したテーブルはスキップ
            }
        }
        
        echo json_encode($db, JSON_UNESCAPED_UNICODE);
    } else if ($action === 'all') {
        // すべてのテーブルのスキーマを返す
        $tables = getAllTableNames($pdo);
        $db = [];
        
        foreach($tables as $table) {
            try {
                $schema = fetchTableSchema($pdo, $table);
                if (count($schema) > 0) {
                    $db[$table] = [
                        'schema' => $schema,
                        'data' => []
                    ];
                }
            } catch (Exception $e) {
                error_log("[database-schema-data.php] Error loading schema for table '{$table}': " . $e->getMessage());
            }
        }
        
        echo json_encode($db, JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action. Use "tables", "schema", or "all".']);
        exit();
    }
    
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


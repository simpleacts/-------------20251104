<?php
// Suppress error display to prevent HTML in JSON response
ini_set('display_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);

// Start output buffering to catch any unexpected output
ob_start();

header('Content-Type: application/json; charset=utf-8');

// Clear any output before requiring db_connect
ob_clean();

try {
    require_once 'db_connect.php'; // $pdo is available
    require_once 'schema_utils.php'; // fetchTableSchema関数を使用
} catch (Exception $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ob_end_clean();
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Only POST method is accepted.']);
    exit();
}

$json_data = file_get_contents('php://input');
$request = json_decode($json_data, true);

if (json_last_error() !== JSON_ERROR_NONE || !isset($request['tableName']) || !isset($request['data']) || !isset($request['mapping'])) {
    ob_end_clean();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON payload. Required fields: tableName, data, mapping.']);
    exit();
}

$tableName = $request['tableName'];
$csvData = $request['data'];
$mapping = $request['mapping'];
$tool_name = 'data-io'; // データ入出力ツールの固定ツール名

// Access control check: verify that data-io tool has INSERT permission for this table
$accessControlQuery = "SELECT allowed_operations, write_fields FROM tool_dependencies WHERE tool_name = :tool_name AND table_name = :table_name";
$accessControlStmt = $pdo->prepare($accessControlQuery);
$accessControlStmt->execute(['tool_name' => $tool_name, 'table_name' => $tableName]);
$accessControl = $accessControlStmt->fetch(PDO::FETCH_ASSOC);

if ($accessControl) {
    // Get allowed_operations, defaulting to '*' if NULL or empty (backward compatibility)
    $allowedOpsStr = $accessControl['allowed_operations'] ?? '*';
    if ($allowedOpsStr === '' || $allowedOpsStr === null) {
        $allowedOpsStr = '*'; // デフォルトですべて許可
    }
    
    // Parse allowed operations
    $allowedOps = $allowedOpsStr === '*' 
        ? ['INSERT', 'UPDATE', 'DELETE'] 
        : array_map('trim', explode(',', strtoupper($allowedOpsStr)));
    
    // Check if INSERT operation is allowed
    if (!in_array('INSERT', $allowedOps)) {
        ob_end_clean();
        http_response_code(403); // Forbidden
        echo json_encode([
            'success' => false,
            'message' => "データ入出力ツールは、テーブル '{$tableName}' に対してINSERT操作を実行する権限がありません。",
            'debug' => [
                'tool_name' => $tool_name,
                'table_name' => $tableName,
                'operation' => 'INSERT',
                'allowed_operations' => $allowedOps,
                'access_control_found' => true
            ]
        ]);
        exit();
    }
    
    error_log("[import-generic.php] Access control check passed: tool_name={$tool_name}, table_name={$tableName}, INSERT allowed");
} else {
    // If no access control is defined, allow all operations (backward compatibility)
    error_log("[import-generic.php] No access control found for tool '{$tool_name}' on table '{$tableName}', allowing INSERT (backward compatibility)");
}

$allowed_tables = [
    'customers', 'customer_groups', 'quotes', 'quote_items', 'quote_designs', 'quote_history',
    'quote_status_master', 'payment_status_master', 'production_status_master', 
    'shipping_status_master', 'data_confirmation_status_master', 'shipping_carriers',
    'products_master', 'product_details', 'product_tags',
    // 注意: product_prices, product_colors, skusは非推奨（stockテーブルから取得） 
    'stock', 'manufacturers', 'brands', 'categories', 'tags',
    // 注意: colors, sizesは削除済み（stockテーブルから取得） 
    'print_locations', 'print_size_constraints', 'plate_costs', 'special_ink_costs', 
    'additional_print_costs_by_size', 'additional_print_costs_by_location', 
    'additional_print_costs_by_tag', 'print_pricing_tiers', 'print_pricing_schedules',
    'category_pricing_schedules', 'pricing_rules', 'pricing_assignments', 'volume_discount_schedules',
    'print_cost_combination', 'plate_cost_combination', 'settings', 'company_info', 
    'shipping_costs', 'partner_codes', 'gallery_images', 'gallery_tags', 
    'category_print_locations', 'prefectures', 'incoming_stock',
    // 注意: skusは非推奨（stockテーブルから取得） 
    'importer_mappings', 'filename_rule_presets', 'print_history', 'print_history_positions', 
    'print_history_images', 'ink_manufacturers', 'ink_series', 'ink_products', 'ink_recipes', 
    'ink_recipe_components', 'ink_recipe_usage', 'pantone_colors', 'dic_colors', 
    'users', 'roles', 'role_permissions', 'id_formats',
    'dtf_consumables', 'dtf_equipment', 'dtf_labor_costs', 'dtf_press_time_costs', 'dtf_electricity_rates',
    'pdf_templates', 'additional_options', 'app_logs',
    'task_master', 'quote_tasks', 'task_generation_rules', 'pdf_preview_zoom_configs'
];

if (!in_array($tableName, $allowed_tables)) {
    ob_end_clean();
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => "Access to table '{$tableName}' is not allowed for import."]);
    exit();
}

$summary = [
    'totalRows' => count($csvData),
    'insertedRows' => 0,
    'errors' => []
];

try {
    $pdo->beginTransaction();

    // Get id format for the target table
    $stmt_format = $pdo->prepare("SELECT prefix, padding FROM id_formats WHERE table_name = ?");
    $stmt_format->execute([$tableName]);
    $format = $stmt_format->fetch();
    $prefix = $format ? $format['prefix'] : substr($tableName, 0, 4) . '_';
    
    // Get primary key column name
    $stmt_pk = $pdo->query("SHOW KEYS FROM `{$tableName}` WHERE Key_name = 'PRIMARY'");
    $pk_result = $stmt_pk->fetch();
    if (!$pk_result) {
        throw new Exception("Table '{$tableName}' does not have a primary key.");
    }
    $pk_col = $pk_result['Column_name'];


    foreach ($csvData as $index => $csvRow) {
        try {
            $rowData = [];
            foreach ($mapping as $dbCol => $csvCol) {
                if (isset($csvRow[$csvCol])) {
                    // Treat empty strings from CSV as NULL for the database
                    $rowData[$dbCol] = $csvRow[$csvCol] === '' ? null : $csvRow[$csvCol];
                }
            }
            
            // Skip if the mapped row data is entirely empty
            if (count(array_filter($rowData, fn($v) => $v !== null)) === 0) {
                continue;
            }

            // Generate a new unique primary key
            $rowData[$pk_col] = $prefix . uniqid('', true);

            $columns = array_keys($rowData);
            $columns_sql = '`' . implode('`, `', $columns) . '`';
            $placeholders = implode(', ', array_fill(0, count($columns), '?'));
            
            $sql = "INSERT INTO `{$tableName}` ({$columns_sql}) VALUES ({$placeholders})";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute(array_values($rowData));
            $summary['insertedRows']++;

        } catch (PDOException $e) {
            $summary['errors'][] = "Row " . ($index + 2) . ": " . $e->getMessage();
        }
    }

    $pdo->commit();
    
    $message = "インポートが完了しました。";
    if (count($summary['errors']) > 0) {
        $message .= " 一部の行でエラーが発生しました。";
    }

    // インポート後に更新されたテーブルデータを取得（data-io-data.phpへの依存を削除）
    $updatedTableData = null;
    try {
        if (tableExists($pdo, $tableName)) {
            $stmt = $pdo->query("SELECT * FROM `{$tableName}`");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $schema = fetchTableSchema($pdo, $tableName);
            $updatedTableData = [
                $tableName => [
                    'schema' => $schema,
                    'data' => $rows
                ]
            ];
        }
    } catch (Exception $e) {
        error_log("[import-generic.php] Failed to fetch updated table data: " . $e->getMessage());
        // エラーが発生してもインポート結果は返す
    }

    // Clear any unexpected output before sending JSON
    ob_clean();
    $response = [
        'success' => true, 
        'message' => $message, 
        'summary' => $summary
    ];
    
    // 更新されたテーブルデータを含める
    if ($updatedTableData !== null) {
        $response['updatedTable'] = $updatedTableData;
    }
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    ob_end_flush();

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'データベース処理中にエラーが発生しました: ' . $e->getMessage(),
        'summary' => $summary
    ]);
    exit();
}
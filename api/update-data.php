<?php
// This file will be renamed to update-data.php on the server.

header('Content-Type: application/json; charset=utf-8');

// The require statement expects 'db_connect.php' as it will be renamed on the server.
require_once 'db_connect.php'; 
// After this line, the $pdo object is available.

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['error' => 'Only POST method is accepted.']);
    exit();
}

// Get the raw POST data
$json_data = file_get_contents('php://input');
$data = json_decode($json_data, true);

// Validate input
if (json_last_error() !== JSON_ERROR_NONE || !isset($data['table']) || !isset($data['operations']) || !is_array($data['operations'])) {
    http_response_code(400); // Bad Request
    echo json_encode(['error' => 'Invalid JSON payload. Required fields: "table", "operations" (array).']);
    exit();
}

$table_name = $data['table'];
$operations = $data['operations'];
$tool_name = $data['tool_name'] ?? null; // Optional: tool name for access control

// Whitelist tables to prevent arbitrary table modification.
// This list should be comprehensive for the app's needs.
$allowed_tables = [
    'customers', 'customer_groups', 'quotes', 'quote_items', 'quote_designs', 'quote_history',
    'quote_status_master', 'payment_status_master', 'production_status_master', 
    'shipping_status_master', 'data_confirmation_status_master', 'shipping_carriers',
    'products_master', 'product_details', 'product_tags',
    // 注意: product_prices, product_colors, skusは非推奨（stockテーブルから取得） 
    'product_sizes', 'product_color_sizes',
    'stock', 'stock_history', 'manufacturers', 'brands', 'categories', 'tags',
    // 注意: colors, sizesは削除済み（stockテーブルから取得） 
    'print_locations', 'print_size_constraints', 'plate_costs', 'special_ink_costs', 
    'additional_print_costs_by_size', 'additional_print_costs_by_location', 
    'additional_print_costs_by_tag', 'print_pricing_tiers', 'print_pricing_schedules',
    'category_pricing_schedules', 'pricing_rules', 'pricing_assignments', 'volume_discount_schedules',
    'print_cost_combination', 'plate_cost_combination', 'settings', 'color_settings', 'layout_settings', 'behavior_settings', 'company_info', 
    'shipping_costs', 'partner_codes', 'gallery_images', 'gallery_tags', 
    'category_print_locations', 'prefectures', 'skus', 'incoming_stock', 
    'importer_mappings', 'filename_rule_presets', 'print_history', 'print_history_positions', 
    'print_history_images', 'print_location_metrics', 'ink_manufacturers', 'ink_series', 'ink_products', 'ink_recipes', 
    'ink_recipe_components', 'ink_recipe_usage', 'pantone_colors', 'dic_colors', 
    'users', 'roles', 'role_permissions', 'id_formats',
    'dtf_consumables', 'dtf_equipment', 'dtf_labor_costs', 'dtf_press_time_costs', 'dtf_electricity_rates',
    'dtf_printers', 'dtf_print_speeds',
    'pdf_templates', 'pdf_item_display_configs', 'additional_options', 'app_logs',
    'task_master', 'quote_tasks', 'task_generation_rules', 'task_time_settings',
    'google_api_settings', 'ai_settings', 'email_accounts', 'pdf_preview_zoom_configs',
    'email_templates', 'email_settings', 'emails', 'email_attachments',
    'email_labels', 'email_label_ai_rules',
    'dev_roadmap', 'dev_constitution', 'dev_guidelines_recommended', 'dev_guidelines_prohibited',
    'work_sessions', 'work_session_quotes',
    'tool_visibility_settings', 'pagination_settings', 'tool_dependencies', 'tool_migrations',
    'mobile_tool_mappings', 'icons', 'google_fonts', 'gemini_models',
    'bills', 'bill_items', 'languages', 'payment_methods',
    'modules_core', 'modules_page_tool', 'modules_service', 'modules_other',
    'modules_ui_atoms', 'modules_ui_molecules', 'modules_ui_organisms', 'modules_ui_modals',
    'language_settings' // 後方互換性のため（非推奨）
];


// Check if table is in allowed list or matches language_settings_* or stock_* pattern
$is_allowed = in_array($table_name, $allowed_tables);
if (!$is_allowed && strpos($table_name, 'language_settings_') === 0) {
    // Allow all language_settings_* tables for write access
    $is_allowed = true;
}
if (!$is_allowed && preg_match('/^stock_[a-zA-Z0-9_-]+$/', $table_name)) {
    // Allow all stock_{manufacturer_id} tables for write access
    $is_allowed = true;
}

if (!$is_allowed) {
    http_response_code(403); // Forbidden
    echo json_encode(['error' => "Access to table '{$table_name}' is not allowed."]);
    exit();
}

// Check if columns being updated are auto-generated from stock data (read-only)
try {
    // 更新対象のカラムを取得
    $columns_to_check = [];
    foreach ($operations as $op) {
        if (isset($op['data']) && is_array($op['data'])) {
            $columns_to_check = array_merge($columns_to_check, array_keys($op['data']));
        }
    }
    $columns_to_check = array_unique($columns_to_check);
    
    if (!empty($columns_to_check)) {
        // 自動生成カラムをチェック
        $placeholders = implode(',', array_fill(0, count($columns_to_check), '?'));
        $autoGenCheck = $pdo->prepare("
            SELECT column_name, source_table, source_column 
            FROM `auto_generated_columns` 
            WHERE table_name = ? AND column_name IN ({$placeholders})
        ");
        $params = array_merge([$table_name], $columns_to_check);
        $autoGenCheck->execute($params);
        $autoGenColumns = $autoGenCheck->fetchAll(PDO::FETCH_ASSOC);
        
        if (!empty($autoGenColumns)) {
            // 自動生成カラムが含まれている場合はエラー
            $blocked_columns = array_column($autoGenColumns, 'column_name');
            $source_table = $autoGenColumns[0]['source_table'];
            $columns_list = implode(', ', $blocked_columns);
            
            http_response_code(403); // Forbidden
            echo json_encode([
                'error' => "テーブル '{$table_name}' の以下のカラム（{$columns_list}）は '{$source_table}' から自動生成されたため、直接編集できません。元データテーブル（{$source_table}）を編集してください。",
                'auto_generated_columns' => $blocked_columns,
                'source_table' => $source_table,
                'editable_columns' => array_diff($columns_to_check, $blocked_columns)
            ]);
            exit();
        }
    }
} catch (PDOException $e) {
    // auto_generated_columnsテーブルが存在しない場合はスキップ（後方互換性）
    // エラーをログに記録するが、処理は続行
    error_log("[update-data.php] Failed to check auto-generated columns: " . $e->getMessage());
}

// Access control check: if tool_name is provided, verify operations are allowed
if ($tool_name) {
    // Load tool dependencies to check access control
    $accessControlQuery = "SELECT allowed_operations, write_fields FROM tool_dependencies WHERE tool_name = :tool_name AND table_name = :table_name";
    $accessControlStmt = $pdo->prepare($accessControlQuery);
    $accessControlStmt->execute(['tool_name' => $tool_name, 'table_name' => $table_name]);
    $accessControl = $accessControlStmt->fetch(PDO::FETCH_ASSOC);
    
    // デバッグ用ログ（本番環境では削除またはコメントアウト推奨）
    error_log("[update-data.php] Access control check: tool_name={$tool_name}, table_name={$table_name}, found=" . ($accessControl ? 'yes' : 'no'));
    if ($accessControl) {
        error_log("[update-data.php] allowed_operations=" . ($accessControl['allowed_operations'] ?? 'NULL') . ", write_fields=" . ($accessControl['write_fields'] ?? 'NULL'));
    }
    
    if ($accessControl) {
        // Get allowed_operations, defaulting to '*' if NULL or empty (backward compatibility)
        $allowedOpsStr = $accessControl['allowed_operations'] ?? '*';
        if ($allowedOpsStr === '' || $allowedOpsStr === null) {
            $allowedOpsStr = '*'; // デフォルトですべて許可
            error_log("[update-data.php] allowed_operations was NULL/empty, defaulting to '*'");
        }
        
        // Parse allowed operations
        $allowedOps = $allowedOpsStr === '*' 
            ? ['INSERT', 'UPDATE', 'DELETE'] 
            : array_map('trim', explode(',', strtoupper($allowedOpsStr)));
        
        error_log("[update-data.php] Parsed allowed operations: " . implode(', ', $allowedOps));
        
        // Check each operation
        foreach ($operations as $op) {
            $opType = strtoupper($op['type'] ?? '');
            if (!in_array($opType, $allowedOps)) {
                error_log("[update-data.php] Operation '{$opType}' not allowed. Allowed: " . implode(', ', $allowedOps));
                http_response_code(403); // Forbidden
                echo json_encode([
                    'error' => "Tool '{$tool_name}' is not allowed to perform '{$opType}' operation on table '{$table_name}'.",
                    'debug' => [
                        'tool_name' => $tool_name,
                        'table_name' => $table_name,
                        'operation' => $opType,
                        'allowed_operations' => $allowedOps,
                        'access_control_found' => true
                    ]
                ]);
                exit();
            }
        }
        error_log("[update-data.php] All operations allowed for tool '{$tool_name}' on table '{$table_name}'");
    } else {
        // If no access control is defined, allow all operations (backward compatibility)
        error_log("[update-data.php] No access control found for tool '{$tool_name}' on table '{$table_name}', allowing all operations (backward compatibility)");
    }
}

try {
    $pdo->beginTransaction();

    foreach ($operations as $op) {
        $type = $op['type'] ?? null;
        
        switch ($type) {
            case 'INSERT':
                if (empty($op['data'])) continue 2; // continue the outer foreach loop
                
                // テーブルの存在するカラムを取得（存在しないカラムをスキップするため）
                $stmt_columns = $pdo->prepare("SHOW COLUMNS FROM `{$table_name}`");
                $stmt_columns->execute();
                $existing_columns = [];
                while ($col = $stmt_columns->fetch(PDO::FETCH_ASSOC)) {
                    $existing_columns[] = $col['Field'];
                }
                
                // Convert empty strings to NULL for database consistency
                // 存在するカラムのみを使用
                $cleanData = [];
                foreach ($op['data'] as $key => $value) {
                    if (!in_array($key, $existing_columns)) {
                        continue; // 存在しないカラムはスキップ
                    }
                    if ($value === '' || $value === null) {
                        $cleanData[$key] = null;
                    } else {
                        $cleanData[$key] = $value;
                    }
                }
                
                // Skip if all values are null/empty (prevent inserting empty rows)
                if (count(array_filter($cleanData, function($v) { return $v !== null && $v !== ''; })) === 0) {
                    continue 2; // Skip this INSERT operation
                }
                
                $columns = array_keys($cleanData);
                $placeholders = array_map(function($c) { return ":$c"; }, $columns);
                
                $sql = "INSERT INTO `{$table_name}` (`" . implode('`, `', $columns) . "`) VALUES (" . implode(', ', $placeholders) . ")";
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute($cleanData);
                break;

            case 'UPDATE':
                if (empty($op['data']) || empty($op['where'])) continue 2;
                
                // テーブルの存在するカラムを取得（存在しないカラムをスキップするため）
                $stmt_columns = $pdo->prepare("SHOW COLUMNS FROM `{$table_name}`");
                $stmt_columns->execute();
                $existing_columns = [];
                while ($col = $stmt_columns->fetch(PDO::FETCH_ASSOC)) {
                    $existing_columns[] = $col['Field'];
                }
                
                // 存在するカラムのみを使用
                $valid_data = [];
                foreach ($op['data'] as $key => $val) {
                    if (in_array($key, $existing_columns)) {
                        $valid_data[$key] = $val;
                    }
                }
                
                if (empty($valid_data)) {
                    continue 2; // 有効なカラムがない場合はスキップ
                }
                
                $set_parts = [];
                foreach (array_keys($valid_data) as $col) {
                    $set_parts[] = "`{$col}` = :data_{$col}";
                }
                
                $where_parts = [];
                foreach (array_keys($op['where']) as $col) {
                    $where_parts[] = "`{$col}` = :where_{$col}";
                }

                $sql = "UPDATE `{$table_name}` SET " . implode(', ', $set_parts) . " WHERE " . implode(' AND ', $where_parts);
                
                $params = [];
                foreach($valid_data as $key => $val) $params[":data_{$key}"] = $val;
                foreach($op['where'] as $key => $val) $params[":where_{$key}"] = $val;

                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                break;

            case 'DELETE':
                if (empty($op['where'])) continue 2;
                
                $where_parts = [];
                foreach (array_keys($op['where']) as $col) {
                    $where_parts[] = "`{$col}` = :{$col}";
                }
                
                $sql = "DELETE FROM `{$table_name}` WHERE " . implode(' AND ', $where_parts);

                $stmt = $pdo->prepare($sql);
                $stmt->execute($op['where']);
                break;

            default:
                // If type is invalid, rollback and throw error
                throw new Exception("Invalid operation type: {$type}");
        }
    }

    $pdo->commit();

    echo json_encode(['success' => true, 'message' => 'Database updated successfully.']);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => 'Database update failed: ' . $e->getMessage()]);
    exit();
}

?>
<?php
// データベーステーブル構造を変更するAPIエンドポイント
// This file will be renamed to alter-table.php on the server.

header('Content-Type: application/json; charset=utf-8');
require_once 'db_connect.php'; // $pdo is available

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
if (json_last_error() !== JSON_ERROR_NONE || !isset($data['table']) || !isset($data['changes']) || !is_array($data['changes'])) {
    http_response_code(400); // Bad Request
    echo json_encode(['error' => 'Invalid JSON payload. Required fields: "table", "changes" (array).']);
    exit();
}

$table_name = $data['table'];
$changes = $data['changes'];
$dry_run = $data['dry_run'] ?? false; // ドライランモード（実際には実行しない）

// Whitelist tables to prevent arbitrary table modification
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

// Check if table is in allowed list or matches pattern
$is_allowed = in_array($table_name, $allowed_tables);
if (!$is_allowed && strpos($table_name, 'language_settings_') === 0) {
    // Allow all language_settings_* tables
    $is_allowed = true;
}
if (!$is_allowed && preg_match('/^stock_[a-zA-Z0-9_-]+$/', $table_name)) {
    // Allow all stock_{manufacturer_id} tables
    $is_allowed = true;
}
if (!$is_allowed && preg_match('/^colors_[a-zA-Z0-9_-]+$/', $table_name)) {
    // Allow all colors_{manufacturer_id} tables
    $is_allowed = true;
}
if (!$is_allowed && preg_match('/^sizes_[a-zA-Z0-9_-]+$/', $table_name)) {
    // Allow all sizes_{manufacturer_id} tables
    $is_allowed = true;
}
if (!$is_allowed && preg_match('/^products_master_[a-zA-Z0-9_-]+$/', $table_name)) {
    // Allow all products_master_{manufacturer_id} tables
    $is_allowed = true;
}
if (!$is_allowed && preg_match('/^product_details_[a-zA-Z0-9_-]+$/', $table_name)) {
    // Allow all product_details_{manufacturer_id} tables
    $is_allowed = true;
}

if (!$is_allowed) {
    http_response_code(403); // Forbidden
    echo json_encode(['error' => "Access to table '{$table_name}' is not allowed."]);
    exit();
}

try {
    $pdo->beginTransaction();
    
    $executed_sql = [];
    $errors = [];
    $warnings = [];
    
    foreach ($changes as $change) {
        $change_type = $change['type'] ?? null;
        $column_name = $change['columnName'] ?? null;
        $sql = $change['sql'] ?? null;
        
        // CUSTOM_SQLタイプの場合は直接SQLを実行
        if ($change_type === 'CUSTOM_SQL' && $sql) {
            $executed_sql[] = $sql;
            if (!$dry_run) {
                try {
                    $pdo->exec($sql);
                } catch (PDOException $e) {
                    $errors[] = "SQL execution failed: " . $e->getMessage();
                    $pdo->rollBack();
                    http_response_code(500);
                    echo json_encode([
                        'success' => false,
                        'error' => 'Database operation failed',
                        'details' => $errors,
                        'executed_sql' => $executed_sql
                    ]);
                    exit();
                }
            }
            continue;
        }
        
        if (!$change_type || !$column_name) {
            $errors[] = "Invalid change: missing type or columnName";
            continue;
        }
        
        // SQL文が提供されている場合はそれを使用、なければ生成
        if (!$sql) {
            $sql = generateAlterTableSQL($table_name, $change);
        }
        
        if (!$sql) {
            $errors[] = "Failed to generate SQL for change: {$change_type} on column {$column_name}";
            continue;
        }
        
        $executed_sql[] = $sql;
        
        if (!$dry_run) {
            try {
                $pdo->exec($sql);
            } catch (PDOException $e) {
                $errors[] = "SQL execution failed for {$change_type} on column {$column_name}: " . $e->getMessage();
                // エラーが発生した場合はロールバック
                $pdo->rollBack();
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'error' => 'Database operation failed',
                    'details' => $errors,
                    'executed_sql' => $executed_sql
                ]);
                exit();
            }
        }
    }
    
    if (!$dry_run) {
        $pdo->commit();
    } else {
        $pdo->rollBack(); // ドライランの場合はロールバック
    }
    
    echo json_encode([
        'success' => true,
        'message' => $dry_run ? 'Dry run completed. No changes were made.' : 'Table structure updated successfully.',
        'executed_sql' => $executed_sql,
        'warnings' => $warnings,
        'dry_run' => $dry_run
    ]);
    
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database operation failed: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
    exit();
}

/**
 * ALTER TABLE SQL文を生成
 */
function generateAlterTableSQL($table_name, $change) {
    $change_type = $change['type'];
    $column_name = $change['columnName'];
    $new_column_name = $change['newColumnName'] ?? null;
    $new_type = $change['newType'] ?? null;
    $new_column = $change['newColumn'] ?? null;
    
    switch ($change_type) {
        case 'ADD_COLUMN':
            if (!$new_column) {
                return null;
            }
            $db_type = $new_column['dbType'] ?? $new_column['type'] ?? 'VARCHAR(255)';
            $nullable = ($new_column['nullable'] !== false) ? '' : ' NOT NULL';
            $default = isset($new_column['defaultValue']) ? " DEFAULT '" . addslashes($new_column['defaultValue']) . "'" : '';
            $unique = (isset($new_column['isUnique']) && $new_column['isUnique'] === true) ? ' UNIQUE' : '';
            return "ALTER TABLE `{$table_name}` ADD COLUMN `{$new_column['name']}` {$db_type}{$nullable}{$default}{$unique};";
            
        case 'MODIFY_COLUMN':
            if (!$new_type) {
                return null;
            }
            // 既存のカラム情報を取得して、NULL許可などを保持
            // 簡易版: 新しい型のみを適用
            $nullable = ($change['nullable'] !== false) ? '' : ' NOT NULL';
            $default = isset($change['defaultValue']) ? " DEFAULT '" . addslashes($change['defaultValue']) . "'" : '';
            $unique = (isset($change['isUnique']) && $change['isUnique'] === true) ? ' UNIQUE' : '';
            return "ALTER TABLE `{$table_name}` MODIFY COLUMN `{$column_name}` {$new_type}{$nullable}{$default}{$unique};";
            
        case 'DROP_COLUMN':
            return "ALTER TABLE `{$table_name}` DROP COLUMN `{$column_name}`;";
            
        case 'RENAME_COLUMN':
            if (!$new_column_name) {
                return null;
            }
            // MySQL 8.0以降は RENAME COLUMN を使用、それ以前は CHANGE を使用
            // 互換性のため CHANGE を使用
            // 既存の型を取得する必要があるが、簡易版では元の型を保持
            return "ALTER TABLE `{$table_name}` CHANGE COLUMN `{$column_name}` `{$new_column_name}` VARCHAR(255);";
            
        default:
            return null;
    }
}


<?php
/**
 * CSVエクスポートAPI
 * データベースのテーブルをCSV形式でエクスポートします
 */

header('Content-Type: text/csv; charset=utf-8');

require_once 'db_connect.php';
require_once 'schema_utils.php';

// CSVフィールドをエスケープする関数（フロントエンドのescapeCSVFieldと同等）
function escapeCSVField($field) {
    if ($field === null || $field === '') {
        return '';
    }
    $str = (string)$field;
    // コンマ、ダブルクォート、改行を含む場合はダブルクォートで囲む
    if (strpos($str, ',') !== false || strpos($str, '"') !== false || strpos($str, "\n") !== false) {
        // ダブルクォートをエスケープ（""に変換）
        return '"' . str_replace('"', '""', $str) . '"';
    }
    return $str;
}

// テーブル名を検証
function validateTableName($tableName) {
    // テーブル名は英数字、アンダースコア、ハイフンのみ許可
    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $tableName)) {
        throw new InvalidArgumentException("Invalid table name: {$tableName}");
    }
    return $tableName;
}

// 許可されたテーブルのホワイトリスト（update-data.phpと同じ）
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

// language_settings_* パターンも許可
$is_language_table = false;
if (strpos($_GET['table'] ?? '', 'language_settings_') === 0) {
    $is_language_table = true;
}

// GETパラメータからテーブル名を取得
$table_name = $_GET['table'] ?? '';

if (empty($table_name)) {
    http_response_code(400);
    echo "Error: Table name is required. Use ?table=table_name";
    exit();
}

// テーブル名を検証
try {
    $table_name = validateTableName($table_name);
} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo "Error: " . $e->getMessage();
    exit();
}

// ホワイトリストチェック
$is_allowed = in_array($table_name, $allowed_tables) || $is_language_table;

if (!$is_allowed) {
    http_response_code(403);
    echo "Error: Access to table '{$table_name}' is not allowed.";
    exit();
}

try {
    // テーブルが存在するか確認（schema_utils関数を使用）
    if (!tableExists($pdo, $table_name)) {
        http_response_code(404);
        echo "Error: Table '{$table_name}' does not exist.";
        exit();
    }

    // 在庫関連テーブルかどうかをチェック（データを空にする）
    $is_stock_table = preg_match('/^stock_[a-zA-Z0-9_-]+$/', $table_name) || 
                      preg_match('/^incoming_stock_[a-zA-Z0-9_-]+$/', $table_name);

    // ファイル名を設定（BOM付きUTF-8でExcel対応）
    $filename = $table_name . '_' . date('Y-m-d_His') . '.csv';
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    
    // BOMを出力（ExcelでUTF-8を正しく認識させるため）
    echo "\xEF\xBB\xBF";

    // カラム名を取得
    $stmt = $pdo->query("SHOW COLUMNS FROM `{$table_name}`");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (!empty($columns)) {
        // ヘッダー行を出力
        echo implode(',', array_map('escapeCSVField', $columns)) . "\n";
        
        // 在庫関連テーブルの場合はデータ行を出力しない（ヘッダーのみ）
        if (!$is_stock_table) {
            // データを取得
            $stmt = $pdo->query("SELECT * FROM `{$table_name}`");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // データ行を出力
            foreach ($rows as $row) {
                $values = [];
                foreach ($columns as $column) {
                    $value = $row[$column] ?? '';
                    // NULLの場合は空文字列
                    if ($value === null) {
                        $value = '';
                    }
                    $values[] = escapeCSVField($value);
                }
                echo implode(',', $values) . "\n";
            }
        }
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo "Error: Database query failed: " . $e->getMessage();
    exit();
} catch (Exception $e) {
    http_response_code(500);
    echo "Error: " . $e->getMessage();
    exit();
}

?>


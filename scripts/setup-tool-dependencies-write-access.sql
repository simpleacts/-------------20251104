-- ============================================
-- ツール依存関係の書き込み権限設定スクリプト
-- ============================================
-- このスクリプトは、すべてのツールが読み込んでいるテーブルに対して
-- 書き込み権限（INSERT, UPDATE, DELETE）を設定します。
--
-- 実行方法:
-- 1. データベースに接続
-- 2. このSQLファイルを実行
-- ============================================

-- 1. allowed_operationsカラムが存在しない場合は追加
-- 注意: 既にカラムが存在する場合はエラーになりますが、無視してください
SET @dbname = DATABASE();
SET @tablename = 'tool_dependencies';
SET @columnname = 'allowed_operations';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1', -- カラムが存在する場合は何もしない
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname, '` VARCHAR(255) DEFAULT ''*'' COMMENT ''許可される操作: INSERT,UPDATE,DELETE または * (すべて許可)''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 2. tool_dependenciesテーブル自体への書き込み権限を設定
-- tool-dependency-managerツールがtool_dependenciesテーブルを管理できるようにする
INSERT INTO `tool_dependencies` (`tool_name`, `table_name`, `read_fields`, `write_fields`, `allowed_operations`, `load_strategy`)
VALUES ('tool-dependency-manager', 'tool_dependencies', '*', '*', '*', 'on_tool_mount')
ON DUPLICATE KEY UPDATE 
    `read_fields` = '*',
    `write_fields` = '*',
    `allowed_operations` = '*';

-- 3. すべてのツールとテーブルの組み合わせに対して書き込み権限を設定
-- ユーザーが提供したリストに基づいて、すべてのツールが読み込んでいるテーブルに対して
-- 書き込み権限を付与します。

-- 注意: 既存のレコードは更新され、新しいレコードは追加されます。
-- write_fieldsが設定されていない場合は'*'に設定し、
-- allowed_operationsが設定されていない場合は'*'に設定します。

-- 各ツールとテーブルの組み合わせを設定
-- フォーマット: (tool_name, table_name, read_fields, write_fields, allowed_operations, load_strategy)

INSERT INTO `tool_dependencies` (`tool_name`, `table_name`, `read_fields`, `write_fields`, `allowed_operations`, `load_strategy`)
VALUES
-- hub
('hub', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('hub', 'language_settings_hub', '*', '*', '*', 'on_tool_mount'),

-- order-management
('order-management', 'payment_methods', '*', '*', '*', 'on_tool_mount'),
('order-management', 'google_api_settings', '*', '*', '*', 'on_tool_mount'),
('order-management', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('order-management', 'language_settings_order_management', '*', '*', '*', 'on_tool_mount'),

-- ai-task-management
('ai-task-management', 'quote_tasks', '*', '*', '*', 'on_tool_mount'),
('ai-task-management', 'quotes', '*', '*', '*', 'on_tool_mount'),
('ai-task-management', 'customers', '*', '*', '*', 'on_tool_mount'),
('ai-task-management', 'emails', '*', '*', '*', 'on_tool_mount'),
('ai-task-management', 'task_master', '*', '*', '*', 'on_tool_mount'),
('ai-task-management', 'email_accounts', '*', '*', '*', 'on_tool_mount'),
('ai-task-management', 'email_attachments', '*', '*', '*', 'on_tool_mount'),
('ai-task-management', 'work_sessions', '*', '*', '*', 'on_tool_mount'),
('ai-task-management', 'work_session_quotes', '*', '*', '*', 'on_tool_mount'),
('ai-task-management', 'users', '*', '*', '*', 'on_tool_mount'),

-- production-scheduler
('production-scheduler', 'quotes', '*', '*', '*', 'on_tool_mount'),
('production-scheduler', 'quote_tasks', '*', '*', '*', 'on_tool_mount'),
('production-scheduler', 'task_master', '*', '*', '*', 'on_tool_mount'),
('production-scheduler', 'customers', '*', '*', '*', 'on_tool_mount'),
('production-scheduler', 'quote_items', '*', '*', '*', 'on_tool_mount'),
('production-scheduler', 'settings', '*', '*', '*', 'on_tool_mount'),
('production-scheduler', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('production-scheduler', 'language_settings_production_scheduler', '*', '*', '*', 'on_tool_mount'),

-- customer-management
('customer-management', 'customers', '*', '*', '*', 'on_tool_mount'),
('customer-management', 'quotes', '*', '*', '*', 'on_tool_mount'),
('customer-management', 'customer_groups', '*', '*', '*', 'on_tool_mount'),
('customer-management', 'pagination_settings', '*', '*', '*', 'on_tool_mount'),
('customer-management', 'prefectures', '*', '*', '*', 'on_tool_mount'),

-- email-tool
('email-tool', 'emails', '*', '*', '*', 'on_tool_mount'),
('email-tool', 'email_attachments', '*', '*', '*', 'on_tool_mount'),
('email-tool', 'quotes', '*', '*', '*', 'on_tool_mount'),
('email-tool', 'customers', '*', '*', '*', 'on_tool_mount'),
('email-tool', 'email_accounts', '*', '*', '*', 'on_tool_mount'),
('email-tool', 'task_master', '*', '*', '*', 'on_tool_mount'),

-- estimator
('estimator', 'settings', '*', '*', '*', 'on_tool_mount'),
('estimator', 'color_settings', '*', '*', '*', 'on_tool_mount'),
('estimator', 'layout_settings', '*', '*', '*', 'on_tool_mount'),
('estimator', 'behavior_settings', '*', '*', '*', 'on_tool_mount'),
('estimator', 'customer_groups', '*', '*', '*', 'on_tool_mount'),
('estimator', 'colors', '*', '*', '*', 'on_tool_mount'),
('estimator', 'sizes', '*', '*', '*', 'on_tool_mount'),
('estimator', 'tags', '*', '*', '*', 'on_tool_mount'),
('estimator', 'manufacturers', '*', '*', '*', 'on_tool_mount'),
('estimator', 'payment_methods', '*', '*', '*', 'on_tool_mount'),
('estimator', 'free_input_item_types', '*', '*', '*', 'on_tool_mount'),
('estimator', 'special_ink_costs', '*', '*', '*', 'on_tool_mount'),
('estimator', 'additional_print_costs_by_size', '*', '*', '*', 'on_tool_mount'),
('estimator', 'additional_print_costs_by_location', '*', '*', '*', 'on_tool_mount'),
('estimator', 'additional_print_costs_by_tag', '*', '*', '*', 'on_tool_mount'),
('estimator', 'print_cost_combination', '*', '*', '*', 'on_tool_mount'),
('estimator', 'plate_cost_combination', '*', '*', '*', 'on_tool_mount'),
('estimator', 'category_print_locations', '*', '*', '*', 'on_tool_mount'),
('estimator', 'print_size_constraints', '*', '*', '*', 'on_tool_mount'),
('estimator', 'print_locations', '*', '*', '*', 'on_tool_mount'),
('estimator', 'company_info', '*', '*', '*', 'on_tool_mount'),
('estimator', 'partner_codes', '*', '*', '*', 'on_tool_mount'),
('estimator', 'prefectures', '*', '*', '*', 'on_tool_mount'),
('estimator', 'pricing_rules', '*', '*', '*', 'on_tool_mount'),
('estimator', 'pricing_assignments', '*', '*', '*', 'on_tool_mount'),
('estimator', 'volume_discount_schedules', '*', '*', '*', 'on_tool_mount'),
('estimator', 'additional_options', '*', '*', '*', 'on_tool_mount'),
('estimator', 'dtf_consumables', '*', '*', '*', 'on_tool_mount'),
('estimator', 'dtf_equipment', '*', '*', '*', 'on_tool_mount'),
('estimator', 'dtf_labor_costs', '*', '*', '*', 'on_tool_mount'),
('estimator', 'dtf_electricity_rates', '*', '*', '*', 'on_tool_mount'),
('estimator', 'dtf_printers', '*', '*', '*', 'on_tool_mount'),
('estimator', 'dtf_print_speeds', '*', '*', '*', 'on_tool_mount'),
('estimator', 'dtf_press_time_costs', '*', '*', '*', 'on_tool_mount'),
('estimator', 'pdf_templates', '*', '*', '*', 'on_tool_mount'),
('estimator', 'pdf_item_display_configs', '*', '*', '*', 'on_tool_mount'),
('estimator', 'product_price_groups', '*', '*', '*', 'on_tool_mount'),
('estimator', 'product_price_group_items', '*', '*', '*', 'on_tool_mount'),
('estimator', 'product_colors', '*', '*', '*', 'on_tool_mount'),
('estimator', 'product_tags', '*', '*', '*', 'on_tool_mount'),
('estimator', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('estimator', 'language_settings_estimator_settings', '*', '*', '*', 'on_tool_mount'),

-- proofing
-- 注意: products_master, product_detailsは削除済み（stockテーブルから取得）
('proofing', 'quotes', '*', '*', '*', 'on_tool_mount'),
('proofing', 'customers', '*', '*', '*', 'on_tool_mount'),
('proofing', 'stock', '*', '*', '*', 'on_tool_mount'),
('proofing', 'brands', '*', '*', '*', 'on_tool_mount'),
('proofing', 'quote_items', '*', '*', '*', 'on_tool_mount'),
('proofing', 'google_api_settings', '*', '*', '*', 'on_tool_mount'),
('proofing', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('proofing', 'language_settings_proofing', '*', '*', '*', 'on_tool_mount'),

-- worksheet
('worksheet', 'quotes', '*', '*', '*', 'on_tool_mount'),
('worksheet', 'customers', '*', '*', '*', 'on_tool_mount'),
('worksheet', 'quote_items', '*', '*', '*', 'on_tool_mount'),
('worksheet', 'products_master', '*', '*', '*', 'on_tool_mount'),
('worksheet', 'product_details', '*', '*', '*', 'on_tool_mount'),
('worksheet', 'brands', '*', '*', '*', 'on_tool_mount'),
('worksheet', 'colors', '*', '*', '*', 'on_tool_mount'),
('worksheet', 'company_info', '*', '*', '*', 'on_tool_mount'),
('worksheet', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('worksheet', 'language_settings_worksheet', '*', '*', '*', 'on_tool_mount'),

-- accounts-receivable
('accounts-receivable', 'quotes', '*', '*', '*', 'on_tool_mount'),
('accounts-receivable', 'customers', '*', '*', '*', 'on_tool_mount'),
('accounts-receivable', 'bills', '*', '*', '*', 'on_tool_mount'),
('accounts-receivable', 'customer_groups', '*', '*', '*', 'on_tool_mount'),

-- accounts-payable
('accounts-payable', 'quotes', '*', '*', '*', 'on_tool_mount'),
('accounts-payable', 'customers', '*', '*', '*', 'on_tool_mount'),
('accounts-payable', 'bills', '*', '*', '*', 'on_tool_mount'),
('accounts-payable', 'customer_groups', '*', '*', '*', 'on_tool_mount'),

-- work-record
('work-record', 'work_sessions', '*', '*', '*', 'on_tool_mount'),
('work-record', 'work_session_quotes', '*', '*', '*', 'on_tool_mount'),
('work-record', 'quotes', '*', '*', '*', 'on_tool_mount'),
('work-record', 'task_master', '*', '*', '*', 'on_tool_mount'),
('work-record', 'users', '*', '*', '*', 'on_tool_mount'),

-- cash-flow-analysis
('cash-flow-analysis', 'quotes', '*', '*', '*', 'on_tool_mount'),
('cash-flow-analysis', 'customers', '*', '*', '*', 'on_tool_mount'),
('cash-flow-analysis', 'bills', '*', '*', '*', 'on_tool_mount'),
('cash-flow-analysis', 'customer_groups', '*', '*', '*', 'on_tool_mount'),

-- task-analysis
('task-analysis', 'quote_tasks', '*', '*', '*', 'on_tool_mount'),
('task-analysis', 'task_master', '*', '*', '*', 'on_tool_mount'),

-- product-management
('product-management', 'product_sizes', '*', '*', '*', 'on_tool_mount'),
('product-management', 'product_color_sizes', '*', '*', '*', 'on_tool_mount'),
('product-management', 'incoming_stock', '*', '*', '*', 'on_tool_mount'),
('product-management', 'product_price_groups', '*', '*', '*', 'on_tool_mount'),
('product-management', 'product_price_group_items', '*', '*', '*', 'on_tool_mount'),

-- product-definition-tool
('product-definition-tool', 'manufacturers', '*', '*', '*', 'on_tool_mount'),
('product-definition-tool', 'brands', '*', '*', '*', 'on_tool_mount'),
('product-definition-tool', 'categories', '*', '*', '*', 'on_tool_mount'),
('product-definition-tool', 'tags', '*', '*', '*', 'on_tool_mount'),
('product-definition-tool', 'colors', '*', '*', '*', 'on_tool_mount'),
('product-definition-tool', 'sizes', '*', '*', '*', 'on_tool_mount'),
('product-definition-tool', 'product_sizes', '*', '*', '*', 'on_tool_mount'),
('product-definition-tool', 'product_color_sizes', '*', '*', '*', 'on_tool_mount'),
('product-definition-tool', 'print_locations', '*', '*', '*', 'on_tool_mount'),
('product-definition-tool', 'print_size_constraints', '*', '*', '*', 'on_tool_mount'),
('product-definition-tool', 'category_print_locations', '*', '*', '*', 'on_tool_mount'),
('product-definition-tool', 'print_cost_combination', '*', '*', '*', 'on_tool_mount'),
('product-definition-tool', 'plate_cost_combination', '*', '*', '*', 'on_tool_mount'),
('product-definition-tool', 'payment_methods', '*', '*', '*', 'on_tool_mount'),
('product-definition-tool', 'time_units', '*', '*', '*', 'on_tool_mount'),
('product-definition-tool', 'calculation_logic_types', '*', '*', '*', 'on_tool_mount'),
('product-definition-tool', 'ink_product_types', '*', '*', '*', 'on_tool_mount'),
('product-definition-tool', 'weight_volume_units', '*', '*', '*', 'on_tool_mount'),
('product-definition-tool', 'free_input_item_types', '*', '*', '*', 'on_tool_mount'),
('product-definition-tool', 'color_libraries', '*', '*', '*', 'on_tool_mount'),
('product-definition-tool', 'color_library_types', '*', '*', '*', 'on_tool_mount'),

-- product-definition-manufacturer-tool
('product-definition-manufacturer-tool', 'manufacturers', '*', '*', '*', 'on_tool_mount'),
('product-definition-manufacturer-tool', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('product-definition-manufacturer-tool', 'language_settings_product_definition', '*', '*', '*', 'on_tool_mount'),

-- inventory-management
('inventory-management', 'stock', '*', '*', '*', 'on_tool_mount'),
('inventory-management', 'skus', '*', '*', '*', 'on_tool_mount'),
('inventory-management', 'products_master', '*', '*', '*', 'on_tool_mount'),
('inventory-management', 'product_details', '*', '*', '*', 'on_tool_mount'),
('inventory-management', 'colors', '*', '*', '*', 'on_tool_mount'),
('inventory-management', 'sizes', '*', '*', '*', 'on_tool_mount'),
('inventory-management', 'brands', '*', '*', '*', 'on_tool_mount'),
('inventory-management', 'incoming_stock', '*', '*', '*', 'on_tool_mount'),
('inventory-management', 'stock_history', '*', '*', '*', 'on_tool_mount'),
('inventory-management', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('inventory-management', 'language_settings_inventory_management', '*', '*', '*', 'on_tool_mount'),

-- pricing-manager
('pricing-manager', 'print_pricing_schedules', '*', '*', '*', 'on_tool_mount'),
('pricing-manager', 'print_pricing_tiers', '*', '*', '*', 'on_tool_mount'),
('pricing-manager', 'users', '*', '*', '*', 'on_tool_mount'),
('pricing-manager', 'roles', '*', '*', '*', 'on_tool_mount'),

-- pricing-assistant
('pricing-assistant', 'pricing_rules', '*', '*', '*', 'on_tool_mount'),
('pricing-assistant', 'pricing_assignments', '*', '*', '*', 'on_tool_mount'),
('pricing-assistant', 'category_pricing_schedules', '*', '*', '*', 'on_tool_mount'),
('pricing-assistant', 'plate_costs', '*', '*', '*', 'on_tool_mount'),
('pricing-assistant', 'special_ink_costs', '*', '*', '*', 'on_tool_mount'),
('pricing-assistant', 'additional_print_costs_by_size', '*', '*', '*', 'on_tool_mount'),
('pricing-assistant', 'additional_print_costs_by_location', '*', '*', '*', 'on_tool_mount'),
('pricing-assistant', 'additional_print_costs_by_tag', '*', '*', '*', 'on_tool_mount'),
('pricing-assistant', 'shipping_costs', '*', '*', '*', 'on_tool_mount'),
('pricing-assistant', 'customer_groups', '*', '*', '*', 'on_tool_mount'),
('pricing-assistant', 'manufacturers', '*', '*', '*', 'on_tool_mount'),
('pricing-assistant', 'categories', '*', '*', '*', 'on_tool_mount'),
('pricing-assistant', 'print_pricing_schedules', '*', '*', '*', 'on_tool_mount'),

-- production-settings
('production-settings', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('production-settings', 'language_settings_production_settings', '*', '*', '*', 'on_tool_mount'),

-- task-settings
('task-settings', 'task_master', '*', '*', '*', 'on_tool_mount'),
('task-settings', 'task_generation_rules', '*', '*', '*', 'on_tool_mount'),
('task-settings', 'task_time_settings', '*', '*', '*', 'on_tool_mount'),
('task-settings', 'time_units', '*', '*', '*', 'on_tool_mount'),
('task-settings', 'calculation_logic_types', '*', '*', '*', 'on_tool_mount'),
('task-settings', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('task-settings', 'language_settings_task_settings', '*', '*', '*', 'on_tool_mount'),

-- print-history
('print-history', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('print-history', 'language_settings_print_history', '*', '*', '*', 'on_tool_mount'),

-- ink-mixing
('ink-mixing', 'ink_recipes', '*', '*', '*', 'on_tool_mount'),
('ink-mixing', 'ink_recipe_components', '*', '*', '*', 'on_tool_mount'),
('ink-mixing', 'ink_products', '*', '*', '*', 'on_tool_mount'),
('ink-mixing', 'ink_series', '*', '*', '*', 'on_tool_mount'),
('ink-mixing', 'ink_manufacturers', '*', '*', '*', 'on_tool_mount'),
('ink-mixing', 'pantone_colors', '*', '*', '*', 'on_tool_mount'),
('ink-mixing', 'dic_colors', '*', '*', '*', 'on_tool_mount'),
('ink-mixing', 'quotes', '*', '*', '*', 'on_tool_mount'),
('ink-mixing', 'customers', '*', '*', '*', 'on_tool_mount'),
('ink-mixing', 'ink_recipe_usage', '*', '*', '*', 'on_tool_mount'),
('ink-mixing', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('ink-mixing', 'language_settings_ink_mixing', '*', '*', '*', 'on_tool_mount'),

-- ink-series-management
('ink-series-management', 'ink_series', '*', '*', '*', 'on_tool_mount'),
('ink-series-management', 'ink_manufacturers', '*', '*', '*', 'on_tool_mount'),
('ink-series-management', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('ink-series-management', 'language_settings_ink_series_management', '*', '*', '*', 'on_tool_mount'),

-- ink-product-management
('ink-product-management', 'ink_products', '*', '*', '*', 'on_tool_mount'),
('ink-product-management', 'ink_series', '*', '*', '*', 'on_tool_mount'),
('ink-product-management', 'ink_manufacturers', '*', '*', '*', 'on_tool_mount'),
('ink-product-management', 'ink_product_types', '*', '*', '*', 'on_tool_mount'),
('ink-product-management', 'weight_volume_units', '*', '*', '*', 'on_tool_mount'),
('ink-product-management', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('ink-product-management', 'language_settings_ink_product_management', '*', '*', '*', 'on_tool_mount'),

-- color-library-manager
('color-library-manager', 'pantone_colors', '*', '*', '*', 'on_tool_mount'),
('color-library-manager', 'dic_colors', '*', '*', '*', 'on_tool_mount'),
('color-library-manager', 'color_libraries', '*', '*', '*', 'on_tool_mount'),
('color-library-manager', 'color_library_types', '*', '*', '*', 'on_tool_mount'),
('color-library-manager', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('color-library-manager', 'language_settings_color_library_manager', '*', '*', '*', 'on_tool_mount'),

-- dtf-cost-calculator
('dtf-cost-calculator', 'settings', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'color_settings', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'layout_settings', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'behavior_settings', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'brands', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'customer_groups', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'colors', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'sizes', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'tags', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'categories', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'manufacturers', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'payment_methods', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'free_input_item_types', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'plate_costs', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'special_ink_costs', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'additional_print_costs_by_size', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'additional_print_costs_by_location', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'additional_print_costs_by_tag', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'print_pricing_tiers', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'shipping_costs', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'print_cost_combination', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'plate_cost_combination', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'category_print_locations', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'print_size_constraints', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'print_locations', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'company_info', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'partner_codes', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'prefectures', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'pricing_rules', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'pricing_assignments', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'volume_discount_schedules', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'additional_options', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'dtf_consumables', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'dtf_equipment', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'dtf_labor_costs', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'dtf_electricity_rates', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'dtf_printers', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'dtf_print_speeds', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'dtf_press_time_costs', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'pdf_templates', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'pdf_item_display_configs', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'product_price_groups', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'product_price_group_items', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'products_master', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'product_details', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'product_prices', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'product_colors', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'product_tags', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'customers', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'language_settings_estimator_settings', '*', '*', '*', 'on_tool_mount'),
('dtf-cost-calculator', 'language_settings_dtf_cost_calculator', '*', '*', '*', 'on_tool_mount'),

-- data-io (データ入出力ツールはimport-generic.phpで許可されているすべてのテーブルに書き込み権限が必要)
('data-io', 'brands', '*', '*', '*', 'on_tool_mount'),
('data-io', 'filename_rule_presets', '*', '*', '*', 'on_tool_mount'),
('data-io', 'importer_mappings', '*', '*', '*', 'on_tool_mount'),
('data-io', 'sql_export_presets', '*', '*', '*', 'on_tool_mount'),
('data-io', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('data-io', 'language_settings_data_io', '*', '*', '*', 'on_tool_mount'),
-- import-generic.phpで許可されているすべてのテーブル
('data-io', 'customers', '*', '*', '*', 'on_tool_mount'),
('data-io', 'customer_groups', '*', '*', '*', 'on_tool_mount'),
('data-io', 'quotes', '*', '*', '*', 'on_tool_mount'),
('data-io', 'quote_items', '*', '*', '*', 'on_tool_mount'),
('data-io', 'quote_designs', '*', '*', '*', 'on_tool_mount'),
('data-io', 'quote_history', '*', '*', '*', 'on_tool_mount'),
('data-io', 'quote_status_master', '*', '*', '*', 'on_tool_mount'),
('data-io', 'payment_status_master', '*', '*', '*', 'on_tool_mount'),
('data-io', 'production_status_master', '*', '*', '*', 'on_tool_mount'),
('data-io', 'shipping_status_master', '*', '*', '*', 'on_tool_mount'),
('data-io', 'data_confirmation_status_master', '*', '*', '*', 'on_tool_mount'),
('data-io', 'shipping_carriers', '*', '*', '*', 'on_tool_mount'),
('data-io', 'products_master', '*', '*', '*', 'on_tool_mount'),
('data-io', 'product_details', '*', '*', '*', 'on_tool_mount'),
('data-io', 'product_prices', '*', '*', '*', 'on_tool_mount'),
('data-io', 'product_colors', '*', '*', '*', 'on_tool_mount'),
('data-io', 'product_tags', '*', '*', '*', 'on_tool_mount'),
('data-io', 'stock', '*', '*', '*', 'on_tool_mount'),
('data-io', 'manufacturers', '*', '*', '*', 'on_tool_mount'),
('data-io', 'categories', '*', '*', '*', 'on_tool_mount'),
('data-io', 'tags', '*', '*', '*', 'on_tool_mount'),
('data-io', 'colors', '*', '*', '*', 'on_tool_mount'),
('data-io', 'sizes', '*', '*', '*', 'on_tool_mount'),
('data-io', 'print_locations', '*', '*', '*', 'on_tool_mount'),
('data-io', 'print_size_constraints', '*', '*', '*', 'on_tool_mount'),
('data-io', 'plate_costs', '*', '*', '*', 'on_tool_mount'),
('data-io', 'special_ink_costs', '*', '*', '*', 'on_tool_mount'),
('data-io', 'additional_print_costs_by_size', '*', '*', '*', 'on_tool_mount'),
('data-io', 'additional_print_costs_by_location', '*', '*', '*', 'on_tool_mount'),
('data-io', 'additional_print_costs_by_tag', '*', '*', '*', 'on_tool_mount'),
('data-io', 'print_pricing_tiers', '*', '*', '*', 'on_tool_mount'),
('data-io', 'print_pricing_schedules', '*', '*', '*', 'on_tool_mount'),
('data-io', 'category_pricing_schedules', '*', '*', '*', 'on_tool_mount'),
('data-io', 'pricing_rules', '*', '*', '*', 'on_tool_mount'),
('data-io', 'pricing_assignments', '*', '*', '*', 'on_tool_mount'),
('data-io', 'volume_discount_schedules', '*', '*', '*', 'on_tool_mount'),
('data-io', 'print_cost_combination', '*', '*', '*', 'on_tool_mount'),
('data-io', 'plate_cost_combination', '*', '*', '*', 'on_tool_mount'),
('data-io', 'settings', '*', '*', '*', 'on_tool_mount'),
('data-io', 'company_info', '*', '*', '*', 'on_tool_mount'),
('data-io', 'shipping_costs', '*', '*', '*', 'on_tool_mount'),
('data-io', 'partner_codes', '*', '*', '*', 'on_tool_mount'),
('data-io', 'gallery_images', '*', '*', '*', 'on_tool_mount'),
('data-io', 'gallery_tags', '*', '*', '*', 'on_tool_mount'),
('data-io', 'category_print_locations', '*', '*', '*', 'on_tool_mount'),
('data-io', 'prefectures', '*', '*', '*', 'on_tool_mount'),
('data-io', 'skus', '*', '*', '*', 'on_tool_mount'),
('data-io', 'incoming_stock', '*', '*', '*', 'on_tool_mount'),
('data-io', 'print_history', '*', '*', '*', 'on_tool_mount'),
('data-io', 'print_history_positions', '*', '*', '*', 'on_tool_mount'),
('data-io', 'print_history_images', '*', '*', '*', 'on_tool_mount'),
('data-io', 'ink_manufacturers', '*', '*', '*', 'on_tool_mount'),
('data-io', 'ink_series', '*', '*', '*', 'on_tool_mount'),
('data-io', 'ink_products', '*', '*', '*', 'on_tool_mount'),
('data-io', 'ink_recipes', '*', '*', '*', 'on_tool_mount'),
('data-io', 'ink_recipe_components', '*', '*', '*', 'on_tool_mount'),
('data-io', 'ink_recipe_usage', '*', '*', '*', 'on_tool_mount'),
('data-io', 'pantone_colors', '*', '*', '*', 'on_tool_mount'),
('data-io', 'dic_colors', '*', '*', '*', 'on_tool_mount'),
('data-io', 'users', '*', '*', '*', 'on_tool_mount'),
('data-io', 'roles', '*', '*', '*', 'on_tool_mount'),
('data-io', 'role_permissions', '*', '*', '*', 'on_tool_mount'),
('data-io', 'id_formats', '*', '*', '*', 'on_tool_mount'),
('data-io', 'dtf_consumables', '*', '*', '*', 'on_tool_mount'),
('data-io', 'dtf_equipment', '*', '*', '*', 'on_tool_mount'),
('data-io', 'dtf_labor_costs', '*', '*', '*', 'on_tool_mount'),
('data-io', 'dtf_press_time_costs', '*', '*', '*', 'on_tool_mount'),
('data-io', 'dtf_electricity_rates', '*', '*', '*', 'on_tool_mount'),
('data-io', 'pdf_templates', '*', '*', '*', 'on_tool_mount'),
('data-io', 'additional_options', '*', '*', '*', 'on_tool_mount'),
('data-io', 'app_logs', '*', '*', '*', 'on_tool_mount'),
('data-io', 'task_master', '*', '*', '*', 'on_tool_mount'),
('data-io', 'quote_tasks', '*', '*', '*', 'on_tool_mount'),
('data-io', 'task_generation_rules', '*', '*', '*', 'on_tool_mount'),
('data-io', 'pdf_preview_zoom_configs', '*', '*', '*', 'on_tool_mount'),
-- メーカー依存テーブル（在庫インポートで使用）
('data-io', 'stock', '*', '*', '*', 'on_tool_mount'),
('data-io', 'products_master', '*', '*', '*', 'on_tool_mount'),
('data-io', 'product_details', '*', '*', '*', 'on_tool_mount'),
('data-io', 'colors', '*', '*', '*', 'on_tool_mount'),
('data-io', 'sizes', '*', '*', '*', 'on_tool_mount'),
('data-io', 'incoming_stock', '*', '*', '*', 'on_tool_mount'),

-- image-converter
('image-converter', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('image-converter', 'language_settings_image_file_name_converter', '*', '*', '*', 'on_tool_mount'),

-- image-batch-linker
('image-batch-linker', 'products_master', '*', '*', '*', 'on_tool_mount'),
('image-batch-linker', 'product_details', '*', '*', '*', 'on_tool_mount'),
('image-batch-linker', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('image-batch-linker', 'language_settings_image_batch_linker', '*', '*', '*', 'on_tool_mount'),

-- pdf-template-manager
('pdf-template-manager', 'pdf_templates', '*', '*', '*', 'on_tool_mount'),
('pdf-template-manager', 'pdf_item_display_configs', '*', '*', '*', 'on_tool_mount'),
('pdf-template-manager', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('pdf-template-manager', 'language_settings_pdf_template_manager', '*', '*', '*', 'on_tool_mount'),

-- pdf-item-group-manager
('pdf-item-group-manager', 'pdf_item_display_configs', '*', '*', '*', 'on_tool_mount'),
('pdf-item-group-manager', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('pdf-item-group-manager', 'language_settings_pdf_item_group_manager', '*', '*', '*', 'on_tool_mount'),

-- user-manager
('user-manager', 'users', '*', '*', '*', 'on_tool_mount'),
('user-manager', 'roles', '*', '*', '*', 'on_tool_mount'),
('user-manager', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('user-manager', 'language_settings_user_manager', '*', '*', '*', 'on_tool_mount'),

-- permission-manager
('permission-manager', 'roles', '*', '*', '*', 'on_tool_mount'),
('permission-manager', 'role_permissions', '*', '*', '*', 'on_tool_mount'),

-- id-manager
('id-manager', 'id_formats', '*', '*', '*', 'on_tool_mount'),

-- google-api-settings
('google-api-settings', 'google_api_settings', '*', '*', '*', 'on_tool_mount'),
('google-api-settings', 'email_accounts', '*', '*', '*', 'on_tool_mount'),
('google-api-settings', 'ai_settings', '*', '*', '*', 'on_tool_mount'),
('google-api-settings', 'gemini_models', '*', '*', '*', 'on_tool_mount'),
('google-api-settings', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('google-api-settings', 'language_settings_google_api_settings', '*', '*', '*', 'on_tool_mount'),

-- display-settings
('display-settings', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('display-settings', 'language_settings_display_settings', '*', '*', '*', 'on_tool_mount'),

-- email-settings
('email-settings', 'settings', '*', '*', '*', 'on_tool_mount'),
('email-settings', 'email_settings', '*', '*', '*', 'on_tool_mount'),
('email-settings', 'ai_settings', '*', '*', '*', 'on_tool_mount'),
('email-settings', 'email_accounts', '*', '*', '*', 'on_tool_mount'),
('email-settings', 'email_templates', '*', '*', '*', 'on_tool_mount'),
('email-settings', 'languages', '*', '*', '*', 'on_tool_mount'),
('email-settings', 'email_labels', '*', '*', '*', 'on_tool_mount'),
('email-settings', 'email_label_ai_rules', '*', '*', '*', 'on_tool_mount'),
('email-settings', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('email-settings', 'language_settings_email_settings', '*', '*', '*', 'on_tool_mount'),

-- estimator-settings
('estimator-settings', 'settings', '*', '*', '*', 'on_tool_mount'),
('estimator-settings', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('estimator-settings', 'language_settings_estimator_settings', '*', '*', '*', 'on_tool_mount'),

-- pdf-preview-settings
('pdf-preview-settings', 'pdf_preview_zoom_configs', '*', '*', '*', 'on_tool_mount'),
('pdf-preview-settings', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('pdf-preview-settings', 'language_settings_pdf_preview_settings', '*', '*', '*', 'on_tool_mount'),

-- backup-manager
('backup-manager', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('backup-manager', 'language_settings_backup_manager', '*', '*', '*', 'on_tool_mount'),

-- system-logs
('system-logs', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('system-logs', 'language_settings_system_logs', '*', '*', '*', 'on_tool_mount'),

-- dev-management
('dev-management', 'dev_roadmap', '*', '*', '*', 'on_tool_mount'),
('dev-management', 'dev_constitution', '*', '*', '*', 'on_tool_mount'),
('dev-management', 'dev_guidelines_recommended', '*', '*', '*', 'on_tool_mount'),
('dev-management', 'dev_guidelines_prohibited', '*', '*', '*', 'on_tool_mount'),
('dev-management', 'modules_core', '*', '*', '*', 'on_tool_mount'),
('dev-management', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('dev-management', 'language_settings_dev_management', '*', '*', '*', 'on_tool_mount'),

-- dev-tools
('dev-tools', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('dev-tools', 'language_settings_dev_tools', '*', '*', '*', 'on_tool_mount'),

-- dev-lock-manager
('dev-lock-manager', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('dev-lock-manager', 'language_settings_dev_lock_manager', '*', '*', '*', 'on_tool_mount'),

-- app-manager
('app-manager', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('app-manager', 'language_settings_app_management', '*', '*', '*', 'on_tool_mount'),

-- tool-exporter
('tool-exporter', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('tool-exporter', 'language_settings_tool_exporter', '*', '*', '*', 'on_tool_mount'),

-- tool-porting-manager
('tool-porting-manager', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('tool-porting-manager', 'language_settings_tool_porting_manager', '*', '*', '*', 'on_tool_mount'),

-- tool-guide
('tool-guide', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('tool-guide', 'language_settings_tool_guide', '*', '*', '*', 'on_tool_mount'),

-- tool-dependency-manager
('tool-dependency-manager', 'tool_dependencies', '*', '*', '*', 'on_tool_mount'),
('tool-dependency-manager', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('tool-dependency-manager', 'language_settings_tool_dependency_manager', '*', '*', '*', 'on_tool_mount'),

-- calculation-logic-manager
('calculation-logic-manager', 'settings', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'color_settings', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'layout_settings', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'behavior_settings', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'brands', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'customer_groups', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'colors', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'sizes', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'tags', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'categories', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'manufacturers', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'payment_methods', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'free_input_item_types', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'plate_costs', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'special_ink_costs', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'additional_print_costs_by_size', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'additional_print_costs_by_location', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'additional_print_costs_by_tag', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'print_pricing_tiers', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'shipping_costs', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'print_cost_combination', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'plate_cost_combination', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'category_print_locations', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'print_size_constraints', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'print_locations', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'company_info', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'partner_codes', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'prefectures', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'pricing_rules', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'pricing_assignments', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'volume_discount_schedules', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'additional_options', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'dtf_consumables', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'dtf_equipment', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'dtf_labor_costs', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'dtf_electricity_rates', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'dtf_printers', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'dtf_print_speeds', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'dtf_press_time_costs', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'pdf_templates', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'pdf_item_display_configs', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'product_price_groups', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'product_price_group_items', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'products_master', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'product_details', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'product_prices', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'product_colors', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'product_tags', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'customers', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'language_settings_estimator_settings', '*', '*', '*', 'on_tool_mount'),
('calculation-logic-manager', 'language_settings_calculation_logic_manager', '*', '*', '*', 'on_tool_mount'),

-- tool-dependency-scanner
('tool-dependency-scanner', 'app_logs', '*', '*', '*', 'on_tool_mount'),
('tool-dependency-scanner', 'tool_dependencies', '*', '*', '*', 'on_tool_mount'),
('tool-dependency-scanner', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('tool-dependency-scanner', 'language_settings_tool_dependency_scanner', '*', '*', '*', 'on_tool_mount'),

-- database-schema-manager
('database-schema-manager', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('database-schema-manager', 'language_settings_database_schema_manager', '*', '*', '*', 'on_tool_mount'),
('database-schema-manager', 'settings', '*', '*', '*', 'on_tool_mount'),
('database-schema-manager', 'tool_dependencies', '*', '*', '*', 'on_tool_mount'),
('database-schema-manager', 'tool_migrations', '*', '*', '*', 'on_tool_mount'),
('database-schema-manager', 'app_logs', '*', '*', '*', 'on_tool_mount'),

-- unregistered-module-tool
('unregistered-module-tool', 'modules_core', '*', '*', '*', 'on_tool_mount'),
('unregistered-module-tool', 'modules_page_tool', '*', '*', '*', 'on_tool_mount'),
('unregistered-module-tool', 'modules_service', '*', '*', '*', 'on_tool_mount'),
('unregistered-module-tool', 'modules_other', '*', '*', '*', 'on_tool_mount'),
('unregistered-module-tool', 'modules_ui_atoms', '*', '*', '*', 'on_tool_mount'),
('unregistered-module-tool', 'modules_ui_molecules', '*', '*', '*', 'on_tool_mount'),
('unregistered-module-tool', 'modules_ui_organisms', '*', '*', '*', 'on_tool_mount'),
('unregistered-module-tool', 'modules_ui_modals', '*', '*', '*', 'on_tool_mount'),
('unregistered-module-tool', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('unregistered-module-tool', 'language_settings_unregistered_module_tool', '*', '*', '*', 'on_tool_mount'),

-- architecture-designer
('architecture-designer', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('architecture-designer', 'language_settings_architecture', '*', '*', '*', 'on_tool_mount'),

-- php-info-viewer
('php-info-viewer', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('php-info-viewer', 'language_settings_php_info_viewer', '*', '*', '*', 'on_tool_mount'),

-- system-diagnostics
('system-diagnostics', 'settings', '*', '*', '*', 'on_tool_mount'),
('system-diagnostics', 'language_settings_common', '*', '*', '*', 'on_tool_mount'),
('system-diagnostics', 'language_settings_system_diagnostics', '*', '*', '*', 'on_tool_mount')
ON DUPLICATE KEY UPDATE 
    `read_fields` = '*',
    `write_fields` = '*',
    `allowed_operations` = '*',
    `load_strategy` = VALUES(`load_strategy`);

-- 4. 既存のレコードでwrite_fieldsがNULLまたは空の場合は'*'に更新
UPDATE `tool_dependencies` 
SET `write_fields` = '*' 
WHERE `write_fields` IS NULL OR `write_fields` = '';

-- 5. 既存のレコードでallowed_operationsがNULLまたは空の場合は'*'に更新
UPDATE `tool_dependencies` 
SET `allowed_operations` = '*' 
WHERE `allowed_operations` IS NULL OR `allowed_operations` = '';

-- 完了メッセージ
SELECT 'Tool dependencies write access setup completed successfully!' AS message;


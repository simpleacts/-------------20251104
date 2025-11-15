-- ============================================
-- 全ツール・全テーブルへの完全アクセス権限設定スクリプト
-- ============================================
-- このスクリプトは、データベース内の全てのテーブルに対して
-- 全てのツールが読み込み・書き込み権限（INSERT, UPDATE, DELETE）を持つように設定します。
-- load_strategyは'on_demand'（データ取得時に読み込む）に設定されます。
--
-- 実行方法:
-- 1. データベースに接続
-- 2. このSQLファイルを実行
-- ============================================

-- 1. allowed_operationsカラムが存在しない場合は追加
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
INSERT INTO `tool_dependencies` (`tool_name`, `table_name`, `read_fields`, `write_fields`, `allowed_operations`, `load_strategy`)
VALUES ('tool-dependency-manager', 'tool_dependencies', '*', '*', '*', 'on_tool_mount')
ON DUPLICATE KEY UPDATE 
    `read_fields` = '*',
    `write_fields` = '*',
    `allowed_operations` = '*';

-- 3. 一時テーブルを作成して全てのテーブル名を格納
DROP TEMPORARY TABLE IF EXISTS temp_all_tables;
CREATE TEMPORARY TABLE temp_all_tables (
    table_name VARCHAR(255) PRIMARY KEY
);

-- データベース内の全てのテーブルを取得（tool_dependenciesは除外）
INSERT INTO temp_all_tables (table_name)
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_TYPE = 'BASE TABLE'
  AND TABLE_NAME != 'tool_dependencies';

-- 4. 一時テーブルを作成して全てのツール名を格納
DROP TEMPORARY TABLE IF EXISTS temp_all_tools;
CREATE TEMPORARY TABLE temp_all_tools (
    tool_name VARCHAR(255) PRIMARY KEY
);

-- 全てのツール名を挿入（src/core/config/Routes.tsxのALL_TOOLSと同期）
INSERT INTO temp_all_tools (tool_name) VALUES
('hub'),
('order-management'),
('ai-task-management'),
('production-scheduler'),
('customer-management'),
('email-tool'),
('estimator'),
('estimator-v2'),
('proofing'),
('worksheet'),
('accounts-receivable'),
('accounts-payable'),
('work-record'),
('cash-flow-analysis'),
('task-analysis'),
('product-management'),
('product-definition-tool'),
('product-definition-manufacturer-tool'),
('inventory-management'),
('pricing-manager'),
('pricing-assistant'),
('production-settings'),
('task-settings'),
('print-history'),
('ink-mixing'),
('ink-series-management'),
('ink-product-management'),
('color-library-manager'),
('dtf-cost-calculator'),
('data-io'),
('image-converter'),
('image-batch-linker'),
('pdf-template-manager'),
('pdf-item-group-manager'),
('user-manager'),
('permission-manager'),
('id-manager'),
('google-api-settings'),
('display-settings'),
('email-settings'),
('estimator-settings'),
('pdf-preview-settings'),
('backup-manager'),
('system-logs'),
('dev-management'),
('dev-tools'),
('dev-lock-manager'),
('app-manager'),
('tool-exporter'),
('tool-porting-manager'),
('tool-guide'),
('tool-dependency-manager'),
('calculation-logic-manager'),
('tool-dependency-scanner'),
('unregistered-module-tool'),
('architecture-designer'),
('php-info-viewer'),
('system-diagnostics'),
('database-schema-manager');

-- 5. 全てのツールと全てのテーブルの組み合わせに対してアクセス権限を設定
-- CROSS JOINを使用して全ての組み合わせを生成
INSERT INTO `tool_dependencies` 
    (`tool_name`, `table_name`, `read_fields`, `write_fields`, `allowed_operations`, `load_strategy`)
SELECT 
    t.tool_name,
    tab.table_name,
    '*',
    '*',
    '*',
    'on_demand'
FROM temp_all_tools t
CROSS JOIN temp_all_tables tab
ON DUPLICATE KEY UPDATE 
    `read_fields` = '*',
    `write_fields` = '*',
    `allowed_operations` = '*',
    `load_strategy` = 'on_demand';

-- 6. 一時テーブルを削除
DROP TEMPORARY TABLE IF EXISTS temp_all_tables;
DROP TEMPORARY TABLE IF EXISTS temp_all_tools;

-- 9. 既存のレコードでwrite_fieldsがNULLまたは空の場合は'*'に更新
UPDATE `tool_dependencies` 
SET `write_fields` = '*' 
WHERE `write_fields` IS NULL OR `write_fields` = '';

-- 10. 既存のレコードでallowed_operationsがNULLまたは空の場合は'*'に更新
UPDATE `tool_dependencies` 
SET `allowed_operations` = '*' 
WHERE `allowed_operations` IS NULL OR `allowed_operations` = '';

-- 11. 既存のレコードでread_fieldsがNULLまたは空の場合は'*'に更新
UPDATE `tool_dependencies` 
SET `read_fields` = '*' 
WHERE `read_fields` IS NULL OR `read_fields` = '';

-- 12. 統計情報を表示
SELECT 
    COUNT(*) AS total_dependencies,
    COUNT(DISTINCT tool_name) AS total_tools,
    COUNT(DISTINCT table_name) AS total_tables,
    SUM(CASE WHEN read_fields = '*' THEN 1 ELSE 0 END) AS full_read_access,
    SUM(CASE WHEN write_fields = '*' THEN 1 ELSE 0 END) AS full_write_access,
    SUM(CASE WHEN allowed_operations = '*' THEN 1 ELSE 0 END) AS full_operation_access,
    SUM(CASE WHEN load_strategy = 'on_demand' THEN 1 ELSE 0 END) AS on_demand_count
FROM `tool_dependencies`;

-- 完了メッセージ
SELECT 'All tool dependencies full access setup completed successfully!' AS message;


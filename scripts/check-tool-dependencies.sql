-- ============================================
-- tool_dependenciesテーブルの状態確認スクリプト
-- ============================================
-- このスクリプトを実行して、tool_dependenciesテーブルの状態を確認してください

-- 1. allowed_operationsカラムが存在するか確認
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'tool_dependencies'
  AND COLUMN_NAME = 'allowed_operations';

-- 2. tool_dependenciesテーブルの構造を確認
DESCRIBE tool_dependencies;

-- 3. レコード数を確認
SELECT COUNT(*) as total_records FROM tool_dependencies;

-- 4. allowed_operationsがNULLまたは空のレコード数を確認
SELECT COUNT(*) as null_or_empty_allowed_ops
FROM tool_dependencies
WHERE allowed_operations IS NULL OR allowed_operations = '';

-- 5. サンプルレコードを確認（最初の10件）
SELECT 
    tool_name,
    table_name,
    read_fields,
    write_fields,
    allowed_operations,
    load_strategy
FROM tool_dependencies
LIMIT 10;

-- 6. 特定のツールの設定を確認（例: customer-management）
SELECT 
    tool_name,
    table_name,
    read_fields,
    write_fields,
    allowed_operations,
    load_strategy
FROM tool_dependencies
WHERE tool_name = 'customer-management'
ORDER BY table_name;

-- 7. allowed_operationsが'*'に設定されているレコード数を確認
SELECT COUNT(*) as all_operations_allowed
FROM tool_dependencies
WHERE allowed_operations = '*';


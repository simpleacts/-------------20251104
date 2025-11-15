-- ============================================
-- 不足しているテーブルの確認スクリプト
-- ============================================
-- このスクリプトは、必須テーブルが存在するか確認します

-- メーカー一覧を確認
SELECT '=== Manufacturers ===' AS info;
SELECT id, name FROM manufacturers;

-- メーカー依存テーブルの確認
SELECT '=== Colors Tables (Manufacturer Dependent) ===' AS info;
SHOW TABLES LIKE 'colors_%';

SELECT '=== Sizes Tables (Manufacturer Dependent) ===' AS info;
SHOW TABLES LIKE 'sizes_%';

SELECT '=== Brands Tables (Manufacturer Dependent) ===' AS info;
SHOW TABLES LIKE 'brands_%';

-- payment_methodsテーブルの確認（メーカー非依存）
SELECT '=== Payment Methods Table ===' AS info;
SHOW TABLES LIKE 'payment_methods';

-- 必須テーブルの存在確認
SELECT '=== Essential Tables Check ===' AS info;
SELECT 
    'brands' AS table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'brands') 
        THEN 'EXISTS (direct)'
        WHEN EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'brands_%')
        THEN 'EXISTS (manufacturer dependent)'
        ELSE 'MISSING'
    END AS status
UNION ALL
SELECT 
    'colors' AS table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'colors') 
        THEN 'EXISTS (direct)'
        WHEN EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'colors_%')
        THEN 'EXISTS (manufacturer dependent)'
        ELSE 'MISSING'
    END AS status
UNION ALL
SELECT 
    'sizes' AS table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sizes') 
        THEN 'EXISTS (direct)'
        WHEN EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'sizes_%')
        THEN 'EXISTS (manufacturer dependent)'
        ELSE 'MISSING'
    END AS status
UNION ALL
SELECT 
    'payment_methods' AS table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_methods') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END AS status;

-- メーカー依存テーブルの詳細確認
SELECT '=== Manufacturer Dependent Tables Details ===' AS info;
SELECT 
    TABLE_NAME,
    TABLE_ROWS
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
    AND (
        TABLE_NAME LIKE 'colors_%'
        OR TABLE_NAME LIKE 'sizes_%'
        OR TABLE_NAME LIKE 'brands_%'
    )
ORDER BY TABLE_NAME;


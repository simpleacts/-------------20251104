-- =====================================================
-- メーカー依存データテーブル クリーンアップスクリプト
-- =====================================================
-- 
-- このスクリプトは、すべてのメーカー依存テーブルのデータを削除します。
-- 
-- 【注意】
-- - このスクリプトはデータを完全に削除します。実行前に必ずバックアップを取得してください。
-- - 本番環境で実行する場合は、十分に注意してください。
-- 
-- 【対象テーブル】
-- - products_master_{manufacturer_id}
-- - product_details_{manufacturer_id}
-- - stock_{manufacturer_id}
-- - colors_{manufacturer_id}
-- - sizes_{manufacturer_id}
-- - incoming_stock_{manufacturer_id}
-- - skus_{manufacturer_id} (存在する場合)
-- - brands_{manufacturer_id} (存在する場合)
-- 
-- =====================================================

-- メーカー依存テーブルのベース名リスト
SET @base_tables = 'products_master,product_details,stock,colors,sizes,incoming_stock,skus,brands';

-- 一時テーブルを作成して、クリーンアップ対象のテーブル名を格納
DROP TEMPORARY TABLE IF EXISTS cleanup_target_tables;
CREATE TEMPORARY TABLE cleanup_target_tables (
    table_name VARCHAR(255) NOT NULL,
    manufacturer_id VARCHAR(255) NOT NULL,
    base_table_name VARCHAR(255) NOT NULL,
    PRIMARY KEY (table_name)
);

-- すべてのメーカーIDを取得
SET @manufacturer_ids = NULL;
SELECT GROUP_CONCAT(id SEPARATOR ',') INTO @manufacturer_ids
FROM manufacturers
WHERE id IS NOT NULL AND id != '' AND id != 'undefined';

-- デバッグ: メーカーIDを表示
SELECT CONCAT('Found manufacturers: ', @manufacturer_ids) AS info;

-- メーカー依存テーブルを検索して一時テーブルに格納
-- INFORMATION_SCHEMAを使用して、{base_table}_{manufacturer_id}形式のテーブルを検索
INSERT INTO cleanup_target_tables (table_name, manufacturer_id, base_table_name)
SELECT 
    t.TABLE_NAME AS table_name,
    SUBSTRING_INDEX(t.TABLE_NAME, '_', -1) AS manufacturer_id,
    SUBSTRING_INDEX(t.TABLE_NAME, '_', -2) AS base_table_name
FROM INFORMATION_SCHEMA.TABLES t
WHERE t.TABLE_SCHEMA = DATABASE()
    AND (
        t.TABLE_NAME LIKE 'products_master_%'
        OR t.TABLE_NAME LIKE 'product_details_%'
        OR t.TABLE_NAME LIKE 'stock_%'
        OR t.TABLE_NAME LIKE 'colors_%'
        OR t.TABLE_NAME LIKE 'sizes_%'
        OR t.TABLE_NAME LIKE 'incoming_stock_%'
        OR t.TABLE_NAME LIKE 'skus_%'
        OR t.TABLE_NAME LIKE 'brands_%'
    )
    AND t.TABLE_NAME NOT LIKE '%\_%\_%'  -- 3つ以上のアンダースコアを含むテーブルは除外（誤検出を防ぐ）
    AND SUBSTRING_INDEX(t.TABLE_NAME, '_', -1) IN (
        SELECT id FROM manufacturers WHERE id IS NOT NULL AND id != '' AND id != 'undefined'
    )
ORDER BY t.TABLE_NAME;

-- クリーンアップ対象テーブルの一覧を表示（確認用）
SELECT 
    '=== クリーンアップ対象テーブル一覧 ===' AS info
UNION ALL
SELECT 
    CONCAT('  - ', table_name, ' (manufacturer: ', manufacturer_id, ', base: ', base_table_name, ')') AS info
FROM cleanup_target_tables
ORDER BY manufacturer_id, base_table_name;

-- テーブルごとのレコード数を表示（削除前の確認用）
SELECT 
    '=== 削除前のレコード数 ===' AS info
UNION ALL
SELECT 
    CONCAT('  - ', table_name, ': ', 
        (SELECT COUNT(*) FROM information_schema.tables t2 
         WHERE t2.table_schema = DATABASE() 
         AND t2.table_name = cleanup_target_tables.table_name
         LIMIT 1), ' rows') AS info
FROM cleanup_target_tables;

-- =====================================================
-- 【重要】以下のコメントを外すと、実際にデータが削除されます
-- =====================================================

-- トランザクションを開始（安全のため）
-- START TRANSACTION;

-- 各テーブルのデータを削除
-- SET @sql = '';
-- SELECT GROUP_CONCAT(
--     CONCAT('TRUNCATE TABLE `', table_name, '`;')
--     SEPARATOR '\n'
-- ) INTO @sql
-- FROM cleanup_target_tables;

-- 動的SQLを実行（注意：この部分は手動で実行してください）
-- PREPARE stmt FROM @sql;
-- EXECUTE stmt;
-- DEALLOCATE PREPARE stmt;

-- または、個別に実行する場合：
-- TRUNCATE TABLE `products_master_manu_0001`;
-- TRUNCATE TABLE `product_details_manu_0001`;
-- TRUNCATE TABLE `stock_manu_0001`;
-- TRUNCATE TABLE `colors_manu_0001`;
-- TRUNCATE TABLE `sizes_manu_0001`;
-- TRUNCATE TABLE `incoming_stock_manu_0001`;
-- ... (他のメーカーIDとテーブルも同様)

-- コミット（トランザクションを開始した場合）
-- COMMIT;

-- =====================================================
-- 個別実行用のSQL文を生成
-- =====================================================

-- クリーンアップ用のSQL文を生成（コピー&ペースト用）
SELECT 
    CONCAT('TRUNCATE TABLE `', table_name, '`;') AS cleanup_sql
FROM cleanup_target_tables
ORDER BY manufacturer_id, base_table_name;

-- または、DELETE文を使用する場合（TRUNCATEの代わり）
-- SELECT 
--     CONCAT('DELETE FROM `', table_name, '`;') AS cleanup_sql
-- FROM cleanup_target_tables
-- ORDER BY manufacturer_id, base_table_name;

-- 一時テーブルを削除
DROP TEMPORARY TABLE IF EXISTS cleanup_target_tables;

-- =====================================================
-- 完了メッセージ
-- =====================================================
SELECT '=== クリーンアップスクリプト完了 ===' AS info;
SELECT '上記のSQL文を確認し、必要に応じて実行してください。' AS note;


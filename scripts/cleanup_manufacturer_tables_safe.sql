-- =====================================================
-- メーカー依存データテーブル クリーンアップスクリプト（安全版）
-- =====================================================
-- 
-- このスクリプトは、指定したメーカーIDのメーカー依存テーブルのデータを削除します。
-- 
-- 【使用方法】
-- 1. 以下の@target_manufacturer_idを削除したいメーカーIDに変更してください
-- 2. スクリプトを実行して、対象テーブルとレコード数を確認してください
-- 3. 問題がなければ、最後のTRUNCATE文のコメントを外して実行してください
-- 
-- 【注意】
-- - このスクリプトはデータを完全に削除します。実行前に必ずバックアップを取得してください。
-- - 本番環境で実行する場合は、十分に注意してください。
-- 
-- =====================================================

-- 削除対象のメーカーIDを指定（例：'manu_0001', 'manu_0002'）
-- すべてのメーカーを対象にする場合は、この行をコメントアウトして、下のループ処理を使用してください
SET @target_manufacturer_id = 'manu_0001';  -- ここを変更してください

-- または、すべてのメーカーを対象にする場合：
-- SET @target_manufacturer_id = NULL;

-- メーカー依存テーブルのベース名リスト
SET @base_tables = 'products_master,product_details,stock,colors,sizes,incoming_stock,skus,brands';

-- =====================================================
-- 対象テーブルの確認
-- =====================================================

-- 対象となるメーカーIDの一覧を表示
SELECT 
    '=== 対象メーカー ===' AS info
UNION ALL
SELECT 
    CONCAT('  - ', id, ' (', COALESCE(name, '名称なし'), ')') AS info
FROM manufacturers
WHERE (@target_manufacturer_id IS NULL OR id = @target_manufacturer_id)
    AND id IS NOT NULL AND id != '' AND id != 'undefined';

-- 対象となるメーカー依存テーブルの一覧を表示
SELECT 
    '=== 対象テーブル一覧 ===' AS info
UNION ALL
SELECT 
    CONCAT('  - ', TABLE_NAME) AS info
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
    AND (
        (@target_manufacturer_id IS NULL AND (
            TABLE_NAME LIKE 'products_master_%'
            OR TABLE_NAME LIKE 'product_details_%'
            OR TABLE_NAME LIKE 'stock_%'
            OR TABLE_NAME LIKE 'colors_%'
            OR TABLE_NAME LIKE 'sizes_%'
            OR TABLE_NAME LIKE 'incoming_stock_%'
            OR TABLE_NAME LIKE 'skus_%'
            OR TABLE_NAME LIKE 'brands_%'
        ))
        OR (
            TABLE_NAME LIKE CONCAT('products_master_', @target_manufacturer_id)
            OR TABLE_NAME LIKE CONCAT('product_details_', @target_manufacturer_id)
            OR TABLE_NAME LIKE CONCAT('stock_', @target_manufacturer_id)
            OR TABLE_NAME LIKE CONCAT('colors_', @target_manufacturer_id)
            OR TABLE_NAME LIKE CONCAT('sizes_', @target_manufacturer_id)
            OR TABLE_NAME LIKE CONCAT('incoming_stock_', @target_manufacturer_id)
            OR TABLE_NAME LIKE CONCAT('skus_', @target_manufacturer_id)
            OR TABLE_NAME LIKE CONCAT('brands_', @target_manufacturer_id)
        )
    )
    AND TABLE_NAME NOT IN ('stock', 'colors', 'sizes')  -- ベーステーブル名自体は除外
ORDER BY TABLE_NAME;

-- =====================================================
-- 削除前のレコード数確認
-- =====================================================

-- 各テーブルのレコード数を表示
-- 注意：動的SQLを使用するため、個別に実行する必要があります

-- 例：products_master_manu_0001のレコード数を確認
-- SELECT 'products_master_manu_0001' AS table_name, COUNT(*) AS record_count 
-- FROM products_master_manu_0001;

-- =====================================================
-- 【重要】以下のコメントを外すと、実際にデータが削除されます
-- =====================================================

-- トランザクションを開始（安全のため）
-- START TRANSACTION;

-- 指定したメーカーIDのテーブルをクリーンアップ
-- 注意：以下のSQL文は、@target_manufacturer_idの値に応じて手動で変更してください

-- 例：manu_0001のデータを削除する場合
/*
TRUNCATE TABLE `products_master_manu_0001`;
TRUNCATE TABLE `product_details_manu_0001`;
TRUNCATE TABLE `stock_manu_0001`;
TRUNCATE TABLE `colors_manu_0001`;
TRUNCATE TABLE `sizes_manu_0001`;
TRUNCATE TABLE `incoming_stock_manu_0001`;
-- skus_manu_0001が存在する場合
-- TRUNCATE TABLE `skus_manu_0001`;
-- brands_manu_0001が存在する場合
-- TRUNCATE TABLE `brands_manu_0001`;
*/

-- コミット（トランザクションを開始した場合）
-- COMMIT;

-- =====================================================
-- 動的SQLを使用した一括削除（上級者向け）
-- =====================================================

-- 注意：この方法は危険です。十分にテストしてから使用してください。

/*
SET @sql = '';
SELECT GROUP_CONCAT(
    CONCAT('TRUNCATE TABLE `', TABLE_NAME, '`;')
    SEPARATOR '\n'
) INTO @sql
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
    AND (
        (@target_manufacturer_id IS NULL AND (
            TABLE_NAME LIKE 'products_master_%'
            OR TABLE_NAME LIKE 'product_details_%'
            OR TABLE_NAME LIKE 'stock_%'
            OR TABLE_NAME LIKE 'colors_%'
            OR TABLE_NAME LIKE 'sizes_%'
            OR TABLE_NAME LIKE 'incoming_stock_%'
            OR TABLE_NAME LIKE 'skus_%'
            OR TABLE_NAME LIKE 'brands_%'
        ))
        OR (
            TABLE_NAME LIKE CONCAT('products_master_', @target_manufacturer_id)
            OR TABLE_NAME LIKE CONCAT('product_details_', @target_manufacturer_id)
            OR TABLE_NAME LIKE CONCAT('stock_', @target_manufacturer_id)
            OR TABLE_NAME LIKE CONCAT('colors_', @target_manufacturer_id)
            OR TABLE_NAME LIKE CONCAT('sizes_', @target_manufacturer_id)
            OR TABLE_NAME LIKE CONCAT('incoming_stock_', @target_manufacturer_id)
            OR TABLE_NAME LIKE CONCAT('skus_', @target_manufacturer_id)
            OR TABLE_NAME LIKE CONCAT('brands_', @target_manufacturer_id)
        )
    )
    AND TABLE_NAME NOT IN ('stock', 'colors', 'sizes');

-- 生成されたSQL文を確認（実行前に必ず確認してください）
SELECT @sql AS generated_sql;

-- SQL文を実行（コメントを外すと実行されます）
-- PREPARE stmt FROM @sql;
-- EXECUTE stmt;
-- DEALLOCATE PREPARE stmt;
*/

-- =====================================================
-- 完了メッセージ
-- =====================================================
SELECT '=== クリーンアップスクリプト完了 ===' AS info;
SELECT '上記のSQL文を確認し、必要に応じて実行してください。' AS note;
SELECT '実行前に必ずバックアップを取得してください。' AS warning;


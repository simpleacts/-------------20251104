-- incoming_stockテーブルにmanufacturer_idカラムを追加するマイグレーション
-- 実行方法: MySQLでこのSQLを実行してください

-- 1. manufacturer_idカラムを追加
ALTER TABLE `incoming_stock` 
ADD COLUMN `manufacturer_id` VARCHAR(255) AFTER `sku_id`;

-- 2. インデックスを追加（パフォーマンス向上のため）
ALTER TABLE `incoming_stock` 
ADD INDEX `idx_manufacturer` (`manufacturer_id`);

-- 3. 既存データのmanufacturer_idを更新（sku_idから抽出）
-- 形式: {manufacturer_id}_{product_code}_{color_code}_{size_code}
UPDATE `incoming_stock` 
SET `manufacturer_id` = SUBSTRING_INDEX(`sku_id`, '_', 1)
WHERE `sku_id` IS NOT NULL 
  AND `sku_id` NOT LIKE 'sku_%'
  AND `manufacturer_id` IS NULL;

-- 4. 旧形式のsku_id（sku_00000001など）の場合は、stock_itemsテーブルから取得
-- 注意: この部分は手動で確認・更新が必要な場合があります
-- UPDATE `incoming_stock` ic
-- INNER JOIN (
--     SELECT DISTINCT 
--         si.manufacturer_id,
--         CONCAT(si.manufacturer_id, '_', si.product_code, '_', si.color_code, '_', si.size_code) as sku_id
--     FROM stock_items_manu_0001 si
--     UNION
--     SELECT DISTINCT 
--         si.manufacturer_id,
--         CONCAT(si.manufacturer_id, '_', si.product_code, '_', si.color_code, '_', si.size_code) as sku_id
--     FROM stock_items_manu_0002 si
--     -- 他のメーカーのテーブルも追加
-- ) stock ON stock.sku_id = ic.sku_id
-- SET ic.manufacturer_id = stock.manufacturer_id
-- WHERE ic.manufacturer_id IS NULL;


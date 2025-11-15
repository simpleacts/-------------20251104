-- --------------------------------------------------------
-- プリント単価表テーブルのスキーマ修正
-- --------------------------------------------------------
-- 
-- 問題: print_pricing_schedules と print_pricing_tiers のIDフィールドが
-- INT型だが、JavaScriptコードは文字列IDを使用している
--
-- 解決策: IDフィールドをVARCHAR(255)に変更
-- --------------------------------------------------------

-- 外部キー制約を一時的に無効化
SET FOREIGN_KEY_CHECKS=0;

-- print_pricing_tiers テーブルの修正
-- 既存データがある場合は、一時テーブルを作成してデータを移行
DROP TABLE IF EXISTS `print_pricing_tiers_backup`;
CREATE TABLE `print_pricing_tiers_backup` AS SELECT * FROM `print_pricing_tiers`;

DROP TABLE IF EXISTS `print_pricing_tiers`;
CREATE TABLE `print_pricing_tiers` (
  `id` VARCHAR(255) NOT NULL,
  `min` INT,
  `max` INT,
  `firstColor` INT,
  `additionalColor` INT,
  `schedule_id` VARCHAR(255),
  `user_id` VARCHAR(255),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- print_pricing_schedules テーブルの修正
DROP TABLE IF EXISTS `print_pricing_schedules_backup`;
CREATE TABLE `print_pricing_schedules_backup` AS SELECT * FROM `print_pricing_schedules`;

DROP TABLE IF EXISTS `print_pricing_schedules`;
CREATE TABLE `print_pricing_schedules` (
  `id` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255),
  `owner_user_id` VARCHAR(255),
  `sort_order` INT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- category_pricing_schedules テーブルの修正
DROP TABLE IF EXISTS `category_pricing_schedules_backup`;
CREATE TABLE `category_pricing_schedules_backup` AS SELECT * FROM `category_pricing_schedules`;

DROP TABLE IF EXISTS `category_pricing_schedules`;
CREATE TABLE `category_pricing_schedules` (
  `category_id` VARCHAR(255) NOT NULL,
  `schedule_id` VARCHAR(255) NOT NULL,
  `customer_group_id` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`category_id`, `schedule_id`, `customer_group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 外部キー制約を再度有効化
SET FOREIGN_KEY_CHECKS=1;

-- 注意: バックアップテーブル (_backup) は手動で削除してください
-- 既存データを移行する場合は、以下のようなINSERT文を実行してください：
-- 
-- INSERT INTO `print_pricing_schedules` (`id`, `name`, `owner_user_id`, `sort_order`)
-- SELECT CONCAT('ppsc_', `id`), `name`, `owner_user_id`, `sort_order`
-- FROM `print_pricing_schedules_backup`;
--
-- INSERT INTO `print_pricing_tiers` (`id`, `min`, `max`, `firstColor`, `additionalColor`, `schedule_id`, `user_id`)
-- SELECT CONCAT('pptr_', `id`), `min`, `max`, `firstColor`, `additionalColor`, CONCAT('ppsc_', `schedule_id`), `user_id`
-- FROM `print_pricing_tiers_backup`;








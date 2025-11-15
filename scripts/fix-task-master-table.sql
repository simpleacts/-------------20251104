-- --------------------------------------------------------
-- タスク関連テーブルの修正スクリプト
-- --------------------------------------------------------
-- 
-- 問題: task_masterテーブルがHTMLデータで壊れている
-- 解決策: テーブルを再作成して正しいデータを投入
-- --------------------------------------------------------

-- 外部キー制約を一時的に無効化
SET FOREIGN_KEY_CHECKS=0;

-- 既存の壊れたテーブルを削除
DROP TABLE IF EXISTS `task_master`;
DROP TABLE IF EXISTS `task_generation_rules`;
DROP TABLE IF EXISTS `task_time_settings`;
DROP TABLE IF EXISTS `calculation_logic_types`;
DROP TABLE IF EXISTS `time_units`;

-- 正しいテーブル構造を作成
CREATE TABLE `task_master` (
  `id` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255),
  `category` VARCHAR(255),
  `unit` VARCHAR(255),
  `default_value` INT,
  `calculation_logic` VARCHAR(255),
  `days_required` INT,
  `sort_order` INT,
  `daily_capacity` INT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `task_generation_rules` (
  `id` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255),
  `condition_json` TEXT,
  `task_ids_json` TEXT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `task_time_settings` (
  `id` VARCHAR(255) NOT NULL,
  `key` VARCHAR(255),
  `value` VARCHAR(255),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `calculation_logic_types` (
  `id` VARCHAR(255) NOT NULL,
  `code` VARCHAR(255),
  `name` VARCHAR(255),
  `description` TEXT,
  `sort_order` INT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `time_units` (
  `id` VARCHAR(255) NOT NULL,
  `code` VARCHAR(255),
  `name` VARCHAR(255),
  `sort_order` INT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 初期データの投入

-- calculation_logic_types
INSERT INTO `calculation_logic_types` (`id`, `code`, `name`, `description`, `sort_order`) VALUES
  ('calc_0001', 'per_quote', '見積単位', '見積ごとに計算', 1),
  ('calc_0002', 'per_item', '商品単位', '商品ごとに計算', 2),
  ('calc_0003', 'per_plate', '版単位', '版ごとに計算', 3),
  ('calc_0004', 'per_color', '色数単位', '色数ごとに計算', 4);

-- time_units
INSERT INTO `time_units` (`id`, `code`, `name`, `sort_order`) VALUES
  ('tu_001', 'day', '日', 1),
  ('tu_002', 'hour', '時間', 2),
  ('tu_003', 'minute', '分', 3),
  ('tu_004', 'second', '秒', 4);

-- task_master (サンプルデータ)
INSERT INTO `task_master` (`id`, `name`, `category`, `unit`, `default_value`, `calculation_logic`, `days_required`, `sort_order`, `daily_capacity`) VALUES
  ('task_001', 'デザイン確認', '制作', 'minute', 30, 'per_quote', 1, 10, NULL),
  ('task_002', '製版作成', '制作', 'hour', 2, 'per_plate', 2, 20, NULL),
  ('task_003', 'プリント', '制作', 'minute', 5, 'per_item', 1, 30, NULL),
  ('task_004', '検品', '制作', 'minute', 2, 'per_item', 1, 40, NULL),
  ('task_005', '梱包', '制作', 'minute', 5, 'per_quote', 1, 50, NULL),
  ('task_006', '発送手配', '事務', 'minute', 15, 'per_quote', 1, 60, NULL);

-- 外部キー制約を再度有効化
SET FOREIGN_KEY_CHECKS=1;

SELECT '✅ タスク関連テーブルの修正が完了しました。' AS Status;








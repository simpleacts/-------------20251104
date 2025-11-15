-- ============================================
-- データベースとユーザーのセットアップスクリプト
-- ============================================
-- このスクリプトは、データベースとユーザーを作成し、権限を付与します
-- rootユーザーで実行してください

-- データベースを作成（存在しない場合）
CREATE DATABASE IF NOT EXISTS simpleacts_quotenassen CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ユーザーを作成（存在しない場合）
-- パスワードは server_config.csv の DB_PASSWORD に合わせてください
CREATE USER IF NOT EXISTS 'simpleacts_quote'@'localhost' IDENTIFIED BY 'cj708d';

-- データベースへの全権限を付与
GRANT ALL PRIVILEGES ON simpleacts_quotenassen.* TO 'simpleacts_quote'@'localhost';

-- 権限を反映
FLUSH PRIVILEGES;

-- 確認
SELECT 'Database and user setup completed!' AS message;
SHOW DATABASES LIKE 'simpleacts_quotenassen';
SHOW GRANTS FOR 'simpleacts_quote'@'localhost';


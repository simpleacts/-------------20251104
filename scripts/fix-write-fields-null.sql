-- ============================================
-- tool_dependenciesテーブルのwrite_fieldsを修正
-- ============================================
-- write_fieldsがNULLのレコードを'*'に更新します

-- 1. write_fieldsがNULLのレコード数を確認
SELECT COUNT(*) as null_write_fields_count
FROM tool_dependencies
WHERE write_fields IS NULL;

-- 2. write_fieldsがNULLのレコードを'*'に更新
UPDATE tool_dependencies 
SET write_fields = '*'
WHERE write_fields IS NULL;

-- 3. 更新後の確認（NULLが0件になることを確認）
SELECT COUNT(*) as remaining_null_write_fields
FROM tool_dependencies
WHERE write_fields IS NULL;

-- 4. 完了メッセージ
SELECT 'Write fields update completed! All NULL write_fields have been set to "*".' AS message;

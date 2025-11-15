<?php
/**
 * スキーマ取得ユーティリティ
 * すべてのPHP APIで共通使用
 */

/**
 * MySQLの型をフロントエンドの型に変換
 * @param string $dbType MySQLのデータ型（例: VARCHAR(255), INT, TINYINT(1)）
 * @return string フロントエンドの型（TEXT, NUMBER）
 */
function mapDbTypeToFrontendType($dbType) {
    $dbType = strtoupper(trim($dbType));
    
    // VARCHAR, CHAR, TEXT系
    if (preg_match('/^(VARCHAR|CHAR|TEXT|TINYTEXT|MEDIUMTEXT|LONGTEXT)/', $dbType)) {
        return 'TEXT';
    }
    
    // 数値型
    if (preg_match('/^(INT|TINYINT|SMALLINT|MEDIUMINT|BIGINT|DECIMAL|FLOAT|DOUBLE|NUMERIC)/', $dbType)) {
        return 'NUMBER';
    }
    
    // 日時型
    if (preg_match('/^(DATE|TIME|DATETIME|TIMESTAMP|YEAR)/', $dbType)) {
        return 'TEXT'; // フロントエンドではTEXTとして扱う
    }
    
    // ブール型（TINYINT(1)）
    if ($dbType === 'TINYINT(1)' || $dbType === 'BOOLEAN') {
        return 'NUMBER'; // フロントエンドではNUMBERとして扱う
    }
    
    // デフォルトはTEXT
    return 'TEXT';
}

/**
 * すべてのテーブル一覧を取得
 * @param PDO $pdo データベース接続
 * @return array テーブル名の配列
 */
function getAllTableNames($pdo) {
    try {
        $stmt = $pdo->query("SHOW TABLES");
        $tables = [];
        while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
            $tables[] = $row[0];
        }
        return $tables;
    } catch (PDOException $e) {
        error_log("[schema_utils.php] Error fetching table list: " . $e->getMessage());
        return [];
    }
}

/**
 * テーブルが存在するか確認
 * @param PDO $pdo データベース接続
 * @param string $tableName テーブル名
 * @return bool 存在する場合true
 */
function tableExists($pdo, $tableName) {
    try {
        // INFORMATION_SCHEMAを使用して正確にテーブルの存在を確認
        // LIKE句を使わないため、アンダースコアなどの特殊文字がワイルドカードとして解釈されない
        $databaseName = $pdo->query("SELECT DATABASE()")->fetchColumn();
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?");
        $stmt->execute([$databaseName, $tableName]);
        $count = $stmt->fetchColumn();
        return $count > 0;
    } catch (PDOException $e) {
        error_log("[schema_utils.php] Error checking table existence for '{$tableName}': " . $e->getMessage());
        // フォールバック: SHOW TABLESを使用（全テーブルを取得してPHPでフィルタリング）
        try {
            $allTables = getAllTableNames($pdo);
            return in_array($tableName, $allTables, true);
        } catch (Exception $fallbackError) {
            error_log("[schema_utils.php] Fallback method also failed for '{$tableName}': " . $fallbackError->getMessage());
            return false;
        }
    }
}

/**
 * テーブルのスキーマ情報を取得
 * @param PDO $pdo データベース接続
 * @param string $tableName テーブル名（検証済みであることを前提）
 * @return array スキーマ配列 [{id, name, type}, ...]
 */
function fetchTableSchema($pdo, $tableName) {
    try {
        // テーブル名の検証（セキュリティ）
        if (empty($tableName) || !is_string($tableName)) {
            error_log("[schema_utils.php] Invalid table name provided: " . var_export($tableName, true));
            return [];
        }
        
        // テーブル名に不正な文字が含まれていないか確認
        if (!preg_match('/^[a-zA-Z0-9_-]+$/', $tableName)) {
            error_log("[schema_utils.php] Table name contains invalid characters: '{$tableName}'");
            return [];
        }
        
        // テーブルの存在確認
        if (!tableExists($pdo, $tableName)) {
            error_log("[schema_utils.php] Table '{$tableName}' does not exist");
            return [];
        }
        
        // カラム情報を取得（テーブル名は検証済みなので安全）
        $stmt = $pdo->query("SHOW COLUMNS FROM `{$tableName}`");
        if ($stmt === false) {
            error_log("[schema_utils.php] Failed to execute SHOW COLUMNS for table '{$tableName}'");
            return [];
        }
        
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($columns)) {
            error_log("[schema_utils.php] No columns found for table '{$tableName}'");
            return [];
        }
        
        $schema = [];
        foreach ($columns as $col) {
            if (!isset($col['Field']) || !isset($col['Type'])) {
                error_log("[schema_utils.php] Invalid column data structure for table '{$tableName}': " . json_encode($col));
                continue;
            }
            
            $schema[] = [
                'id' => $col['Field'],
                'name' => $col['Field'],
                'type' => mapDbTypeToFrontendType($col['Type'])
            ];
        }
        
        return $schema;
    } catch (PDOException $e) {
        $errorCode = $e->getCode();
        $errorMessage = $e->getMessage();
        error_log("[schema_utils.php] PDOException fetching schema for table '{$tableName}': Code {$errorCode}, Message: {$errorMessage}");
        
        // テーブルが存在しないエラーの場合
        if ($errorCode == '42S02') {
            error_log("[schema_utils.php] Table '{$tableName}' not found (42S02)");
        }
        
        return [];
    } catch (Exception $e) {
        error_log("[schema_utils.php] Exception fetching schema for table '{$tableName}': " . $e->getMessage());
        return [];
    }
}
?>


<?php
/**
 * データ検証用ユーティリティ関数
 * CSVインポートやデータ操作時の検証を行う
 */

/**
 * CSVデータの検証結果を返す
 * 
 * @param array $csv_data CSVデータ（連想配列の配列）
 * @param array $mapping フィールドマッピング
 * @param array $required_fields 必須フィールドのリスト
 * @param array $field_rules フィールドごとの検証ルール
 * @return array 検証結果 ['valid' => bool, 'errors' => array, 'warnings' => array, 'statistics' => array]
 */
function validateCsvData($csv_data, $mapping, $required_fields = [], $field_rules = []) {
    $result = [
        'valid' => true,
        'errors' => [],
        'warnings' => [],
        'statistics' => [
            'total_rows' => count($csv_data),
            'valid_rows' => 0,
            'invalid_rows' => 0,
            'empty_rows' => 0,
            'field_statistics' => []
        ],
        'row_errors' => [] // 行ごとのエラー
    ];
    
    if (empty($csv_data)) {
        $result['valid'] = false;
        $result['errors'][] = 'CSVデータが空です';
        return $result;
    }
    
    // マッピングの検証
    $first_row = $csv_data[0];
    $csv_columns = array_keys($first_row);
    
    // 必須フィールドのマッピング確認
    foreach ($required_fields as $field) {
        if (empty($mapping[$field])) {
            $result['valid'] = false;
            $result['errors'][] = "必須フィールド '{$field}' のマッピングが設定されていません";
        } elseif (!in_array($mapping[$field], $csv_columns)) {
            $result['valid'] = false;
            $result['errors'][] = "フィールド '{$field}' にマッピングされた列 '{$mapping[$field]}' がCSVに存在しません";
        }
    }
    
    // マッピングされた列名がCSVに存在するか確認
    foreach ($mapping as $field => $column_name) {
        if (!empty($column_name) && !in_array($column_name, $csv_columns)) {
            $result['warnings'][] = "フィールド '{$field}' にマッピングされた列 '{$column_name}' がCSVに存在しません";
        }
    }
    
    // 初期エラーがある場合は、行ごとの検証をスキップ
    if (!$result['valid']) {
        return $result;
    }
    
    // 各行の検証
    foreach ($csv_data as $index => $row) {
        $row_num = $index + 2; // ヘッダー行を考慮して+2
        $row_errors = [];
        $row_warnings = [];
        
        // 空行チェック
        $isEmpty = true;
        foreach ($row as $value) {
            if ($value !== null && $value !== '' && trim((string)$value) !== '') {
                $isEmpty = false;
                break;
            }
        }
        if ($isEmpty) {
            $result['statistics']['empty_rows']++;
            continue;
        }
        
        // 必須フィールドの検証
        foreach ($required_fields as $field) {
            $column_name = $mapping[$field] ?? '';
            $value = !empty($column_name) ? ($row[$column_name] ?? '') : '';
            
            // フィールドの型を確認（数値型の場合は0を有効な値として扱う）
            $field_type = $field_rules[$field]['type'] ?? null;
            $is_numeric_field = in_array($field_type, ['numeric', 'integer', 'int', 'float']);
            
            // コード系フィールド（color_code, size_code, product_code）は常に文字列として扱う
            $is_code_field = in_array($field, ['color_code', 'size_code', 'product_code']);
            
            if ($is_numeric_field && !$is_code_field) {
                // 数値型の場合は、空文字列やnullのみをエラーとする（0は有効）
                $value_trimmed = trim((string)$value);
                if ($value_trimmed === '' || $value === null) {
                    $row_errors[] = "必須フィールド '{$field}' (列: '{$column_name}') が空です";
                }
                // 数値でない場合は型チェックで後で検証されるため、ここでは空チェックのみ
            } else {
                // 文字列型やコード系フィールドの場合は、文字列として扱う
                // 000や00のような文字列も有効な値として扱う（数値として解釈されないように）
                $value_str = (string)$value;
                $value_trimmed = trim($value_str);
                
                // 空文字列やnullのみをエラーとする（0や000、00などは有効）
                if ($value_trimmed === '' || $value === null) {
                    $row_errors[] = "必須フィールド '{$field}' (列: '{$column_name}') が空です";
                }
            }
        }
        
        // フィールドごとの検証ルール
        foreach ($field_rules as $field => $rules) {
            $column_name = $mapping[$field] ?? '';
            if (empty($column_name)) {
                continue; // マッピングされていない場合はスキップ
            }
            
            $value = $row[$column_name] ?? null;
            
            // 型チェック
            if (isset($rules['type'])) {
                // 特殊な値が許可されている場合は、警告として扱う
                $allow_special = $rules['allow_special_values'] ?? false;
                $type_error = validateFieldType($value, $rules['type'], $field, $column_name, $allow_special);
                if ($type_error) {
                    // 特殊な値が許可されている場合、警告として扱う
                    if ($allow_special && isSpecialNumericValue($value)) {
                        $row_warnings[] = "フィールド '{$field}' (列: '{$column_name}') に特殊な値が設定されています: " . substr((string)$value, 0, 50) . " (NULLとして扱われます)";
                    } else {
                        $row_errors[] = $type_error;
                    }
                }
            }
            
            // パターンチェック（正規表現）
            if (isset($rules['pattern']) && !empty($value)) {
                if (!preg_match($rules['pattern'], (string)$value)) {
                    $row_errors[] = "フィールド '{$field}' (列: '{$column_name}') の値が不正です: " . substr((string)$value, 0, 50);
                }
            }
            
            // 最小値/最大値チェック（数値）
            // カンマを除去してから数値判定
            $value_for_numeric_check = is_string($value) ? str_replace(',', '', $value) : $value;
            if (isset($rules['min']) && is_numeric($value_for_numeric_check)) {
                $num_value = floatval($value_for_numeric_check);
                if ($num_value < $rules['min']) {
                    $row_errors[] = "フィールド '{$field}' (列: '{$column_name}') の値が最小値 ({$rules['min']}) を下回っています: {$num_value}";
                }
            }
            if (isset($rules['max']) && is_numeric($value_for_numeric_check)) {
                $num_value = floatval($value_for_numeric_check);
                if ($num_value > $rules['max']) {
                    $row_errors[] = "フィールド '{$field}' (列: '{$column_name}') の値が最大値 ({$rules['max']}) を超えています: {$num_value}";
                }
            }
            
            // カスタム検証関数
            if (isset($rules['validator']) && is_callable($rules['validator'])) {
                $validation_result = $rules['validator']($value, $row, $field);
                if ($validation_result !== true) {
                    $row_errors[] = "フィールド '{$field}' (列: '{$column_name}'): " . ($validation_result ?: '検証に失敗しました');
                }
            }
        }
        
        // 統計情報の更新
        foreach ($mapping as $field => $column_name) {
            if (!empty($column_name) && isset($row[$column_name])) {
                if (!isset($result['statistics']['field_statistics'][$field])) {
                    $result['statistics']['field_statistics'][$field] = [
                        'filled_count' => 0,
                        'empty_count' => 0,
                        'sample_values' => []
                    ];
                }
                $value = $row[$column_name];
                if ($value !== null && $value !== '' && trim((string)$value) !== '') {
                    $result['statistics']['field_statistics'][$field]['filled_count']++;
                    if (count($result['statistics']['field_statistics'][$field]['sample_values']) < 5) {
                        $result['statistics']['field_statistics'][$field]['sample_values'][] = substr((string)$value, 0, 50);
                    }
                } else {
                    $result['statistics']['field_statistics'][$field]['empty_count']++;
                }
            }
        }
        
        // 行のエラーを記録
        if (!empty($row_errors)) {
            $result['valid'] = false;
            $result['statistics']['invalid_rows']++;
            $result['row_errors'][$row_num] = $row_errors;
            foreach ($row_errors as $error) {
                $result['errors'][] = "[行 {$row_num}] {$error}";
            }
        } else {
            $result['statistics']['valid_rows']++;
        }
        
        if (!empty($row_warnings)) {
            foreach ($row_warnings as $warning) {
                $result['warnings'][] = "[行 {$row_num}] {$warning}";
            }
        }
    }
    
    return $result;
}

/**
 * 特殊な数値値（上代なし、Open Priceなど）をチェック
 * 
 * @param mixed $value チェックする値
 * @return bool 特殊な値の場合true
 */
function isSpecialNumericValue($value) {
    if ($value === null || $value === '') {
        return false;
    }
    
    $normalized_value = mb_strtolower(trim((string)$value));
    $special_values = [
        '上代なし', '上代無し', '上代無', 'なし', '無し',
        'open price', 'open', 'price', '未定', '未設定', '設定なし',
        'セール対象商品につき上代なし', 'ｾｰﾙ対象商品につき上代なし',
        'n/a', 'na', '-', 'ー', '—', '―'
    ];
    
    foreach ($special_values as $special) {
        $special_lower = mb_strtolower($special);
        $pos = mb_strpos($normalized_value, $special_lower);
        if ($pos !== false) {
            return true;
        }
    }
    
    return false;
}

/**
 * フィールドの型を検証
 * 
 * @param mixed $value 検証する値
 * @param string $type 期待する型（'string', 'integer', 'float', 'numeric', 'date', 'email'など）
 * @param string $field_name フィールド名（エラーメッセージ用）
 * @param string $column_name 列名（エラーメッセージ用）
 * @param bool $allow_special_values 特殊な値を許可するか（警告として扱う）
 * @return string|null エラーメッセージ（検証成功時はnull）
 */
function validateFieldType($value, $type, $field_name = '', $column_name = '', $allow_special_values = false) {
    if ($value === null || $value === '') {
        return null; // 空の値は型チェックをスキップ（必須チェックは別途）
    }
    
    $value_str = trim((string)$value);
    // ハイフン（-）を空値として扱う
    if ($value_str === '' || $value_str === '-') {
        return null; // 空の値は型チェックをスキップ
    }
    
    switch ($type) {
        case 'string':
            // 文字列は常に有効
            return null;
            
        case 'integer':
        case 'int':
            // カンマを除去してから数値チェック
            $numeric_str = str_replace(',', '', $value_str);
            $numeric_str = trim($numeric_str);
            // ハイフン（-）を空値として扱う
            if ($numeric_str === '' || $numeric_str === '-') {
                return null; // 空の値は型チェックをスキップ
            }
            if (!is_numeric($numeric_str) || intval($numeric_str) != floatval($numeric_str)) {
                return "フィールド '{$field_name}' (列: '{$column_name}') は整数である必要があります";
            }
            return null;
            
        case 'float':
        case 'numeric':
            // より堅牢な数値検証
            $numeric_value = normalizeNumericValue($value_str);
            if ($numeric_value === null) {
                // 特殊な値（上代なし、オープンプライスなど）をチェック
                $normalized_value = mb_strtolower(trim($value_str));
                $special_values = [
                    '上代なし', '上代なし', '上代無し', '上代無', 'なし', '無し',
                    'open price', 'open', 'price', '未定', '未設定', '設定なし',
                    'セール対象商品につき上代なし', 'ｾｰﾙ対象商品につき上代なし',
                    'n/a', 'na', '-', 'ー', '—', '―'
                ];
                
                // 全角・半角を考慮した比較
                $is_special_value = false;
                foreach ($special_values as $special) {
                    $special_lower = mb_strtolower($special);
                    $pos = mb_strpos($normalized_value, $special_lower);
                    if ($pos !== false) {
                        $is_special_value = true;
                        break;
                    }
                }
                
                if ($is_special_value) {
                    // 特殊な値が許可されている場合は検証をスキップ（警告として扱う）
                    if ($allow_special_values) {
                        return null; // 検証をスキップ（呼び出し側で警告として扱う）
                    }
                    // 許可されていない場合はエラーとして扱う
                }
                
                // デバッグ情報を含むエラーメッセージ
                $debug_info = mb_strlen($value_str) > 50 ? mb_substr($value_str, 0, 50) . '...' : $value_str;
                $hex_debug = '';
                if (mb_strlen($value_str) <= 20) {
                    $hex_debug = ' (hex: ' . bin2hex($value_str) . ')';
                }
                return "フィールド '{$field_name}' (列: '{$column_name}') は数値である必要があります。値: '{$debug_info}'{$hex_debug}";
            }
            return null;
            
        case 'date':
            $date = normalizeDate($value_str);
            if ($date === null) {
                return "フィールド '{$field_name}' (列: '{$column_name}') は有効な日付である必要があります: " . substr($value_str, 0, 50);
            }
            return null;
            
        case 'email':
            if (!filter_var($value_str, FILTER_VALIDATE_EMAIL)) {
                return "フィールド '{$field_name}' (列: '{$column_name}') は有効なメールアドレスである必要があります: " . substr($value_str, 0, 50);
            }
            return null;
            
        case 'boolean':
        case 'bool':
            $lower = strtolower(trim($value_str));
            if (!in_array($lower, ['0', '1', 'true', 'false', 'yes', 'no', 'on', 'off', ''])) {
                return "フィールド '{$field_name}' (列: '{$column_name}') は真偽値である必要があります: " . substr($value_str, 0, 50);
            }
            return null;
            
        default:
            return null; // 不明な型はスキップ
    }
}

/**
 * 在庫データ用の検証ルールを取得
 * 
 * @return array 検証ルール
 */
function getStockValidationRules() {
    return [
        'product_code' => [
            'type' => 'string',
            'pattern' => '/^.+$/' // 空でない文字列
        ],
        'color_code' => [
            'type' => 'string',
            'pattern' => '/^.+$/'
        ],
        'size_code' => [
            'type' => 'string',
            'pattern' => '/^.+$/'
        ],
        'stock_quantity' => [
            'type' => 'numeric',
            'min' => 0
        ],
        'incoming_quantity_1' => [
            'type' => 'numeric',
            'min' => 0
        ],
        'incoming_quantity_2' => [
            'type' => 'numeric',
            'min' => 0
        ],
        'incoming_quantity_3' => [
            'type' => 'numeric',
            'min' => 0
        ],
        'incoming_date_1' => [
            'type' => 'date'
        ],
        'incoming_date_2' => [
            'type' => 'date'
        ],
        'incoming_date_3' => [
            'type' => 'date'
        ],
        'list_price' => [
            'type' => 'numeric',
            'min' => 0,
            'allow_empty' => true, // 空値や特殊な値を許可
            'allow_special_values' => true // 特殊な値（上代なし、Open Priceなど）を許可
        ],
        'cost_price' => [
            'type' => 'numeric',
            'min' => 0
        ]
    ];
}

/**
 * 数値を正規化（全角数字、カンマ、空白などを処理）
 * 
 * @param mixed $value 正規化する値
 * @return float|int|null 正規化された数値、またはnull（無効な場合）
 */
if (!function_exists('normalizeNumericValue')) {
    function normalizeNumericValue($value) {
        if ($value === null || $value === '') {
            return null;
        }
        
        // 文字列に変換
        $value = (string)$value;
        
        // 全角数字を半角に変換
        $value = mb_convert_kana($value, 'n', 'UTF-8');
        
        // 全角スペースを半角に変換
        $value = str_replace('　', ' ', $value);
        
        // 特殊な値（上代なし、Open Priceなど）をチェック（空白除去前）
        $normalized_value_for_check = mb_strtolower(trim($value));
        $special_values = [
            '上代なし', '上代無し', '上代無', 'なし', '無し',
            'open price', 'open', 'price', '未定', '未設定', '設定なし',
            'セール対象商品につき上代なし', 'ｾｰﾙ対象商品につき上代なし',
            'n/a', 'na', '-', 'ー', '—', '―'
        ];
        
        foreach ($special_values as $special) {
            $special_lower = mb_strtolower($special);
            $pos = mb_strpos($normalized_value_for_check, $special_lower);
            if ($pos !== false) {
                return null; // 特殊な値の場合はNULLを返す
            }
        }
        
        // カンマを除去（数値区切りとして使用される）
        $value = str_replace(',', '', $value);
        
        // 空白を除去（前後の空白、全角・半角スペース）
        $value = trim($value);
        $value = preg_replace('/\s+/', '', $value); // 内部の空白も除去
        
        // 空の場合はnullを返す
        if ($value === '') {
            return null;
        }
        
        // 数値以外の文字を除去（小数点とマイナス記号は許可）
        // ただし、最初の文字がマイナス記号の場合のみ許可
        $cleaned = '';
        $has_decimal = false;
        $has_minus = false;
        for ($i = 0; $i < mb_strlen($value); $i++) {
            $char = mb_substr($value, $i, 1);
            if ($char === '-' && $i === 0) {
                $cleaned .= $char;
                $has_minus = true;
            } elseif ($char === '.' && !$has_decimal) {
                $cleaned .= $char;
                $has_decimal = true;
            } elseif (ctype_digit($char)) {
                $cleaned .= $char;
            }
        }
        
        if ($cleaned === '' || $cleaned === '-') {
            return null;
        }
        
        // 数値に変換
        $numeric_value = floatval($cleaned);
        
        // 無限大やNaNの場合はnullを返す
        if (!is_finite($numeric_value)) {
            return null;
        }
        
        // 整数に変換（import-stock.phpとの互換性のため）
        return intval($numeric_value);
    }
}

/**
 * 日付形式を正規化（validation_utils.php用のコピー）
 * normalizeDate関数が既にimport-stock.phpにある場合は、それを参照する
 */
if (!function_exists('normalizeDate')) {
    function normalizeDate($date_string) {
        if (empty($date_string)) {
            return null;
        }
        
        $date_string = trim((string)$date_string);
        // ハイフン（-）を空値として扱う
        if ($date_string === '' || $date_string === '-') {
            return null;
        }
        
        // スラッシュ区切りの日付を処理
        if (preg_match('/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/', $date_string, $matches)) {
            $month = intval($matches[1]);
            $day = intval($matches[2]);
            $year = isset($matches[3]) ? intval($matches[3]) : null;
            
            if ($year === null) {
                $year = intval(date('Y'));
            } else if ($year < 100) {
                $year = 2000 + $year;
            }
            
            if (checkdate($month, $day, $year)) {
                return sprintf('%04d-%02d-%02d', $year, $month, $day);
            }
        }
        
        // ハイフン区切りの日付を処理
        if (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/', $date_string, $matches)) {
            $year = intval($matches[1]);
            $month = intval($matches[2]);
            $day = intval($matches[3]);
            
            if (checkdate($month, $day, $year)) {
                return sprintf('%04d-%02d-%02d', $year, $month, $day);
            }
        }
        
        // strtotimeで解析を試みる
        $timestamp = strtotime($date_string);
        if ($timestamp !== false) {
            $parsed_date = date('Y-m-d', $timestamp);
            if ($parsed_date !== '1970-01-01') {
                return $parsed_date;
            }
        }
        
        return null;
    }
}

?>


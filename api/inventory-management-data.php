<?php
/**
 * Inventory Management Tool - Direct Database Access API
 * 商品在庫管理ツール専用API
 * ツール名: inventory-management
 */

header('Content-Type: application/json; charset=utf-8');
// CORS: Restrict in production
$allowed_origins = [
    'http://localhost', 'http://localhost:3000', 'http://127.0.0.1', 'http://127.0.0.1:3000',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: {$origin}");
} else {
    header('Access-Control-Allow-Origin: *'); // Development only
}
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'db_connect.php';
require_once 'schema_utils.php';

$tool_name = 'inventory-management';
error_log("[{$tool_name}-data.php] Request received");

/**
 * Validates and sanitizes table name to prevent SQL injection
 * Only allows alphanumeric characters, underscores, and hyphens
 */
function validateTableName($tableName) {
    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $tableName)) {
        throw new InvalidArgumentException("Invalid table name: '{$tableName}' contains invalid characters");
    }
    return $tableName;
}

/**
 * Fetches table data directly from database
 * @param PDO $pdo Database connection
 * @param string $tableName Table name (validated)
 * @param bool $lightweight If true, fetch only essential columns for large tables
 * @return array Array of rows from the table
 */
function fetchDirectTable($pdo, $tableName, $lightweight = false) {
    try {
        $safeTableName = validateTableName($tableName);
        
        // Check if table exists using schema_utils function (more reliable)
        if (!tableExists($pdo, $safeTableName)) {
            error_log("[inventory-management-data.php] Table '{$safeTableName}' does not exist in database");
            return [];
        }
        
        // Full data fetch - table name is validated and whitelisted, so safe to use
        $stmt = $pdo->query("SELECT * FROM `{$safeTableName}`");
        
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        error_log("[inventory-management-data.php] Fetched " . count($rows) . " rows from table '{$safeTableName}'");
        
        // Filter out completely empty rows (all values are null, undefined, or empty strings)
        $filteredRows = array_filter($rows, function($row) {
            if (!$row || !is_array($row)) {
                return false;
            }
            
            // Check if at least one field has a meaningful value
            $hasValidValue = false;
            foreach ($row as $value) {
                if ($value === null || $value === '') {
                    continue;
                }
                if (is_string($value) && trim($value) !== '') {
                    $hasValidValue = true;
                    break;
                }
                if (is_bool($value) || is_numeric($value)) {
                    $hasValidValue = true;
                    break;
                }
            }
            
            return $hasValidValue;
        });
        
        $filteredCount = count($filteredRows);
        if ($filteredCount !== count($rows)) {
            error_log("[inventory-management-data.php] Filtered " . (count($rows) - $filteredCount) . " empty rows from table '{$safeTableName}'");
        }
        
        return array_values($filteredRows);
    } catch (InvalidArgumentException $e) {
        error_log("[inventory-management-data.php] Invalid table name error: " . $e->getMessage());
        throw $e;
    } catch (PDOException $e) {
        error_log("[inventory-management-data.php] Error fetching table '{$tableName}': " . $e->getMessage());
        throw $e;
    }
}

/**
 * メーカー依存テーブルのリスト
 */
function isManufacturerDependentTable($tableName) {
    $manufacturerDependentTables = [
        'product_sizes', 'product_color_sizes',
        // 注意: products_masterは削除済み（stockテーブルから取得）
        // 注意: product_tags_manu_xxxxは削除（manu_xxxx_detailsのtagsフィールドで管理）
        // 注意: product_colors, product_prices, skusは非推奨（stockテーブルから取得）
        // 注意: colors, sizes, incoming_stockは削除（stockテーブルから直接取得）
        'product_details', 'stock', 'importer_mappings', 'brands', 'tags'
    ];
    return in_array($tableName, $manufacturerDependentTables);
}

/**
 * メーカー別テーブル名からベーステーブル名を抽出
 * @param string $tableName テーブル名（例: 'stock_manu_0001'）
 * @return array ['baseTableName' => string, 'manufacturerId' => string|null]
 */
// 新しい命名規則: {manufacturerId}_{tableName} (例: manu_0001_brands)
function parseManufacturerTableName($tableName) {
    $manufacturerDependentTables = [
        'product_sizes', 'product_color_sizes',
        // 注意: products_masterは削除済み（stockテーブルから取得）
        // 注意: product_tags_manu_xxxxは削除（manu_xxxx_detailsのtagsフィールドで管理）
        // 注意: product_colors, product_prices, skusは非推奨（stockテーブルから取得）
        // 注意: colors, sizes, incoming_stockは削除（stockテーブルから直接取得）
        'product_details', 'stock', 'importer_mappings', 'brands', 'tags'
    ];
    
    // まず、manu_で始まる形式をチェック（新しい命名規則）
    if (strpos($tableName, 'manu_') === 0) {
        // manu_0001_brands 形式から brands と manu_0001 を抽出
        foreach ($manufacturerDependentTables as $baseTableName) {
            // ファイル名の変換を考慮
            $fileName = $baseTableName;
            if ($baseTableName === 'product_details') {
                $fileName = 'details';
            } else if ($baseTableName === 'stock') {
                $fileName = 'stock';
            } else if ($baseTableName === 'tags') {
                $fileName = 'tags';
            }
            // 注意: brandsは削除（共通テーブルに変更）
            
            $suffix = '_' . $fileName;
            if (substr($tableName, -strlen($suffix)) === $suffix) {
                $manufacturerId = substr($tableName, 0, strlen($tableName) - strlen($suffix));
                return ['baseTableName' => $baseTableName, 'manufacturerId' => $manufacturerId];
            }
        }
    } else {
        // 後方互換性のため、古い命名規則（{tableName}_{manufacturerId}）もサポート
        foreach ($manufacturerDependentTables as $baseTableName) {
            $prefix = $baseTableName . '_';
            if (strpos($tableName, $prefix) === 0) {
                $manufacturerId = substr($tableName, strlen($prefix));
                // manufacturerIdに`manu_`プレフィックスが含まれている場合は除去
                if (strpos($manufacturerId, 'manu_') === 0) {
                    $manufacturerId = substr($manufacturerId, 5); // 'manu_'の長さは5
                }
                return ['baseTableName' => $baseTableName, 'manufacturerId' => $manufacturerId];
            }
        }
    }
    
    return ['baseTableName' => $tableName, 'manufacturerId' => null];
}

/**
 * Resolves actual table name for manufacturer-dependent data, supporting multiple naming conventions.
 * @param PDO $pdo
 * @param string $manufacturerId e.g. manu_0001
 * @param string $baseName e.g. 'details', 'stock'
 * @return string|null
 */
function resolveManufacturerTable(PDO $pdo, string $manufacturerId, string $baseName): ?string {
    $normalizedId = strtolower(trim($manufacturerId));
    if ($normalizedId === '') {
        return null;
    }

    $base = strtolower(trim($baseName));
    $shortId = preg_replace('/^manu_/i', '', $normalizedId);

    $candidates = [];
    $append = function (string $candidate) use (&$candidates) {
        if ($candidate !== '') {
            $candidates[] = $candidate;
        }
    };

    switch ($base) {
        case 'details':
            $append("{$normalizedId}_details");
            $append("details_{$normalizedId}");
            $append("{$normalizedId}_product_details");
            $append("product_details_{$normalizedId}");
            if ($shortId !== '') {
                $append("product_details_manu_{$shortId}");
                $append("manu_{$shortId}_details");
                $append("details_manu_{$shortId}");
            }
            break;
        case 'stock':
            $append("{$normalizedId}_stock");
            $append("stock_{$normalizedId}");
            if ($shortId !== '') {
                $append("stock_manu_{$shortId}");
                $append("manu_{$shortId}_stock");
            }
            break;
        default:
            $append("{$normalizedId}_{$base}");
            $append("{$base}_{$normalizedId}");
            if ($shortId !== '') {
                $append("{$base}_manu_{$shortId}");
                $append("manu_{$shortId}_{$base}");
            }
            break;
    }

    $checked = [];
    foreach ($candidates as $candidate) {
        if (isset($checked[$candidate])) {
            continue;
        }
        $checked[$candidate] = true;
        if (tableExists($pdo, $candidate)) {
            return $candidate;
        }
    }

    error_log("[inventory-management-data.php] No table found for '{$manufacturerId}' ({$baseName}). Candidates tried: " . implode(', ', array_keys($checked)));
    return null;
}

function getManufacturerTemplateDirectories(): array {
    static $dirs = null;
    if ($dirs !== null) {
        return $dirs;
    }
    $root = realpath(__DIR__ . '/..');
    $dirs = [];
    if ($root !== false) {
        $dist = $root . '/dist/templates/manufacturers';
        if (is_dir($dist)) {
            $dirs[] = $dist;
        }
        $templates = $root . '/templates/manufacturers';
        if (is_dir($templates)) {
            $dirs[] = $templates;
        }
    }
    return $dirs;
}

function buildManufacturerCsvCandidates(string $manufacturerId, string $baseName): array {
    $normalizedId = strtolower(trim($manufacturerId));
    $shortId = preg_replace('/^manu_/i', '', $normalizedId);
    $base = strtolower(trim($baseName));

    $filenames = [
        "{$normalizedId}_{$base}.csv",
        "{$base}_{$normalizedId}.csv",
    ];

    if ($base === 'details') {
        $filenames[] = "{$normalizedId}_product_details.csv";
        $filenames[] = "product_details_{$normalizedId}.csv";
        if ($shortId !== '') {
            $filenames[] = "product_details_manu_{$shortId}.csv";
            $filenames[] = "manu_{$shortId}_details.csv";
            $filenames[] = "details_manu_{$shortId}.csv";
        }
    } elseif ($base === 'stock') {
        if ($shortId !== '') {
            $filenames[] = "stock_manu_{$shortId}.csv";
            $filenames[] = "manu_{$shortId}_stock.csv";
        }
    }

    return array_unique(array_filter($filenames));
}

function readCsvAssoc($filePath): array {
    if (!is_readable($filePath)) {
        return [];
    }

    $handle = fopen($filePath, 'r');
    if ($handle === false) {
        return [];
    }

    $rows = [];
    $header = fgetcsv($handle, 0, ',', '"', '\\');
    if (!$header) {
        fclose($handle);
        return [];
    }

    while (($data = fgetcsv($handle, 0, ',', '"', '\\')) !== false) {
        if ($data === [null] || (count($data) === 1 && trim((string)$data[0]) === '')) {
            continue;
        }
        $row = [];
        foreach ($header as $idx => $key) {
            $keyName = trim((string)$key);
            if ($keyName === '') {
                $keyName = "column_{$idx}";
            }
            $row[$keyName] = $data[$idx] ?? '';
        }
        $rows[] = $row;
    }

    fclose($handle);
    return $rows;
}

function loadManufacturerCsvData(string $manufacturerId, string $baseName): array {
    $dirs = getManufacturerTemplateDirectories();
    if (empty($dirs)) {
        return [];
    }
    $filenames = buildManufacturerCsvCandidates($manufacturerId, $baseName);
    foreach ($dirs as $dir) {
        $manuDir = rtrim($dir, '/\\') . '/' . $manufacturerId;
        if (!is_dir($manuDir)) {
            continue;
        }
        foreach ($filenames as $filename) {
            $path = $manuDir . '/' . $filename;
            if (is_readable($path)) {
                $rows = readCsvAssoc($path);
                if (!empty($rows)) {
                    error_log("[inventory-management-data.php] Loaded " . count($rows) . " rows from CSV '{$path}'");
                    return $rows;
                }
            }
        }
    }
    return [];
}

/**
 * メーカー一覧を取得
 * @param PDO $pdo Database connection
 * @return array Array of manufacturers
 */
function fetchManufacturers($pdo) {
    try {
        $stmt = $pdo->query("SELECT * FROM `manufacturers`");
        $manufacturers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        // メーカーIDが有効なもののみをフィルタ
        $manufacturers = array_filter($manufacturers, function($m) {
            return isset($m['id']) && $m['id'] !== 'undefined' && trim($m['id']) !== '';
        });
        return array_values($manufacturers);
    } catch (PDOException $e) {
        error_log("[inventory-management-data.php] Error fetching manufacturers: " . $e->getMessage());
        return [];
    }
}

function getRequestInput(): array {
    $input = [];
    if (!empty($_SERVER['CONTENT_TYPE']) && stripos($_SERVER['CONTENT_TYPE'], 'application/json') !== false) {
        $raw = file_get_contents('php://input');
        if ($raw !== false && $raw !== '') {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $input = $decoded;
            }
        }
    }
    // Merge precedence: JSON body > POST > GET
    return array_merge($_GET ?? [], $_POST ?? [], $input);
}

function parseListParam(array $input, string $key): array {
    if (!isset($input[$key])) {
        return [];
    }
    $value = $input[$key];
    if (is_array($value)) {
        $items = $value;
    } else {
        $items = preg_split('/[\s,]+/u', (string)$value);
    }
    $items = array_map(function ($item) {
        return trim((string)$item);
    }, $items ?: []);
    return array_values(array_filter($items, fn($item) => $item !== ''));
}

function normalizePageSize(int $pageSize): int {
    $allowed = [25, 50, 100, 200];
    if (!in_array($pageSize, $allowed, true)) {
        return 50;
    }
    return $pageSize;
}

function passesDetailFilters(array $row, array $filters): bool {
    $productCode = strtolower((string)($row['product_code'] ?? ''));
    if ($filters['productCodes']) {
        $matched = false;
        foreach ($filters['productCodes'] as $code) {
            $token = strtolower($code);
            if ($token !== '' && strpos($productCode, $token) !== false) {
                $matched = true;
                break;
            }
        }
        if (!$matched) {
            return false;
        }
    }

    if ($filters['searchTerms']) {
        $haystack = strtolower(
            (($row['productName'] ?? '') . ' ' . ($row['product_name'] ?? '') . ' ' . ($row['description'] ?? ''))
        );
        $matched = true;
        foreach ($filters['searchTerms'] as $term) {
            $token = strtolower($term);
            if ($token !== '' && strpos($haystack, $token) === false) {
                $matched = false;
                break;
            }
        }
        if (!$matched) {
            return false;
        }
    }

    if ($filters['brands']) {
        $brandValue = strtolower((string)($row['brand'] ?? $row['brand_id'] ?? ''));
        if ($brandValue === '') return false;
        $matched = in_array($brandValue, array_map('strtolower', $filters['brands']), true);
        if (!$matched) return false;
    }

    if ($filters['categoryIds']) {
        $categoryId = strtolower((string)($row['category_id'] ?? ''));
        if ($categoryId === '' || !in_array($categoryId, array_map('strtolower', $filters['categoryIds']), true)) {
            return false;
        }
    }

    if ($filters['tags']) {
        $rowTags = [];
        if (!empty($row['tags'])) {
            $decoded = json_decode((string)$row['tags'], true);
            if (is_array($decoded)) {
                $rowTags = array_map('strval', $decoded);
            } else {
                $rowTags = array_map('trim', explode(',', (string)$row['tags']));
            }
        }
        if (empty($rowTags)) {
            return false;
        }
        $matched = false;
        foreach ($rowTags as $tag) {
            if ($tag !== '' && in_array($tag, $filters['tags'], true)) {
                $matched = true;
                break;
            }
        }
        if (!$matched) {
            return false;
        }
    }

    return true;
}

function buildStockFilterWhereClause(array $filters): array {
    $conditions = [];
    $params = [];

    if (!empty($filters['colorNames'])) {
        $sub = [];
        foreach ($filters['colorNames'] as $value) {
            $sub[] = 'color_name LIKE ?';
            $params[] = '%' . $value . '%';
        }
        $conditions[] = '(' . implode(' OR ', $sub) . ')';
    }

    if (!empty($filters['colorCodes'])) {
        $placeholders = implode(',', array_fill(0, count($filters['colorCodes']), '?'));
        $conditions[] = "color_code IN ({$placeholders})";
        $params = array_merge($params, $filters['colorCodes']);
    }

    if (!empty($filters['sizeNames'])) {
        $sub = [];
        foreach ($filters['sizeNames'] as $value) {
            $sub[] = 'size_name LIKE ?';
            $params[] = '%' . $value . '%';
        }
        $conditions[] = '(' . implode(' OR ', $sub) . ')';
    }

    if (!empty($filters['sizeCodes'])) {
        $placeholders = implode(',', array_fill(0, count($filters['sizeCodes']), '?'));
        $conditions[] = "size_code IN ({$placeholders})";
        $params = array_merge($params, $filters['sizeCodes']);
    }

    if (!empty($filters['colorNames']) || !empty($filters['colorCodes']) || !empty($filters['sizeNames']) || !empty($filters['sizeCodes'])) {
        // keep OR/AND grouping as assembled
    }

    return [
        implode(' AND ', $conditions),
        $params
    ];
}

function getStockSummaryForFilters(PDO $pdo, string $manufacturerId, array $filters): array {
    $tableName = resolveManufacturerTable($pdo, $manufacturerId, 'stock');
    $summary = [];
    $rows = [];

    if ($tableName) {
        try {
            $stmt = $pdo->query("SELECT product_code, SUM(quantity) as total_qty FROM `{$tableName}` GROUP BY product_code");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as $row) {
                $summary[$row['product_code']] = [
                    'total_quantity' => (int)($row['total_qty'] ?? 0),
                    'matches_color_size' => true,
                ];
            }
        } catch (PDOException $e) {
            error_log("[inventory-management-data.php] Failed to aggregate stock for {$tableName}: " . $e->getMessage());
        }
    }

    if (empty($summary)) {
        $rows = loadManufacturerCsvData($manufacturerId, 'stock');
        foreach ($rows as $row) {
            $code = (string)($row['product_code'] ?? '');
            if ($code === '') {
                continue;
            }
            $quantity = (int)($row['quantity'] ?? 0);
            if (!isset($summary[$code])) {
                $summary[$code] = [
                    'total_quantity' => 0,
                    'matches_color_size' => true,
                ];
            }
            $summary[$code]['total_quantity'] += $quantity;
        }
    }

    $colorOrSizeFilterActive = !empty($filters['colorNames']) || !empty($filters['colorCodes']) || !empty($filters['sizeNames']) || !empty($filters['sizeCodes']);

    if ($colorOrSizeFilterActive) {
        $matchedCodes = [];
        if ($tableName) {
            [$whereClause, $params] = buildStockFilterWhereClause($filters);
            if ($whereClause === '') {
                $matchedCodes = array_keys($summary);
            } else {
                $sql = "SELECT DISTINCT product_code FROM `{$tableName}` WHERE {$whereClause}";
                try {
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($params);
                    $matchedCodes = $stmt->fetchAll(PDO::FETCH_COLUMN);
                    $matchedCodes = $matchedCodes ? array_map('strval', $matchedCodes) : [];
                } catch (PDOException $e) {
                    error_log("[inventory-management-data.php] Failed to filter stock by color/size for {$tableName}: " . $e->getMessage());
                }
            }
        }

        if (empty($matchedCodes)) {
            if (empty($rows)) {
                $rows = loadManufacturerCsvData($manufacturerId, 'stock');
            }
            foreach ($rows as $row) {
                $code = (string)($row['product_code'] ?? '');
                if ($code === '') {
                    continue;
                }
                $colorName = strtolower((string)($row['color_name'] ?? ''));
                $colorCode = strtolower((string)($row['color_code'] ?? ''));
                $sizeName = strtolower((string)($row['size_name'] ?? ''));
                $sizeCode = strtolower((string)($row['size_code'] ?? ''));

                $matchesColor = true;
                if (!empty($filters['colorNames'])) {
                    $matchesColor = false;
                    foreach ($filters['colorNames'] as $needle) {
                        if ($needle === '' || ($colorName !== '' && strpos($colorName, strtolower($needle)) !== false)) {
                            $matchesColor = true;
                            break;
                        }
                    }
                }
                if ($matchesColor && !empty($filters['colorCodes'])) {
                    $matchesColor = in_array($colorCode, array_map('strtolower', $filters['colorCodes']), true);
                }

                $matchesSize = true;
                if (!empty($filters['sizeNames'])) {
                    $matchesSize = false;
                    foreach ($filters['sizeNames'] as $needle) {
                        if ($needle === '' || ($sizeName !== '' && strpos($sizeName, strtolower($needle)) !== false)) {
                            $matchesSize = true;
                            break;
                        }
                    }
                }
                if ($matchesSize && !empty($filters['sizeCodes'])) {
                    $matchesSize = in_array($sizeCode, array_map('strtolower', $filters['sizeCodes']), true);
                }

                if ($matchesColor && $matchesSize) {
                    $matchedCodes[$code] = true;
                }
            }
            $matchedCodes = array_keys($matchedCodes);
        }

        if (empty($matchedCodes) && !empty($summary)) {
            foreach ($summary as &$info) {
                $info['matches_color_size'] = false;
            }
        } else {
            $matchedLookup = array_flip($matchedCodes);
            foreach ($summary as $code => &$info) {
                $info['matches_color_size'] = isset($matchedLookup[$code]);
            }
            foreach ($matchedCodes as $code) {
                if (!isset($summary[$code])) {
                    $summary[$code] = [
                        'total_quantity' => 0,
                        'matches_color_size' => true,
                    ];
                }
            }
        }
    } else {
        foreach ($summary as &$info) {
            $info['matches_color_size'] = true;
        }
    }

    return $summary;
}

function filterDetailsByStockAttributes(PDO $pdo, array $items, array $filters): array {
    $requiresStockFilter = !empty($filters['colorNames']) || !empty($filters['colorCodes']) || !empty($filters['sizeNames']) || !empty($filters['sizeCodes']) || $filters['stockStatus'] !== 'any';
    if (!$requiresStockFilter) {
        return $items;
    }

    $grouped = [];
    foreach ($items as $item) {
        $manufacturerId = $item['manufacturer_id'];
        if (!isset($grouped[$manufacturerId])) {
            $grouped[$manufacturerId] = [];
        }
        $grouped[$manufacturerId][] = $item;
    }

    $filtered = [];
    foreach ($grouped as $manufacturerId => $rows) {
        $summary = getStockSummaryForFilters($pdo, $manufacturerId, $filters);
        foreach ($rows as $row) {
            $productCode = $row['product_code'];
            $info = $summary[$productCode] ?? [
                'total_quantity' => 0,
                'matches_color_size' => empty($filters['colorNames']) && empty($filters['colorCodes']) && empty($filters['sizeNames']) && empty($filters['sizeCodes'])
            ];

            if (!empty($filters['colorNames']) || !empty($filters['colorCodes']) || !empty($filters['sizeNames']) || !empty($filters['sizeCodes'])) {
                if (empty($info['matches_color_size'])) {
                    continue;
                }
            }

            if ($filters['stockStatus'] === 'in_stock' && ($info['total_quantity'] ?? 0) <= 0) {
                continue;
            }
            if ($filters['stockStatus'] === 'out_of_stock' && ($info['total_quantity'] ?? 0) > 0) {
                continue;
            }

            $row['stock_summary'] = [
                'total_quantity' => (int)($info['total_quantity'] ?? 0),
            ];
            $filtered[] = $row;
        }
    }

    return $filtered;
}

function handleInventoryDetailsSearch(PDO $pdo) {
    $input = getRequestInput();
    $page = max(1, (int)($input['page'] ?? 1));
    $pageSize = normalizePageSize((int)($input['pageSize'] ?? 50));

    $filters = [
        'productCodes' => parseListParam($input, 'productCodes'),
        'searchTerms' => parseListParam($input, 'searchTerms'),
        'brands' => parseListParam($input, 'brands'),
        'categoryIds' => parseListParam($input, 'categoryIds'),
        'tags' => parseListParam($input, 'tagIds'),
        'colorNames' => parseListParam($input, 'colorNames'),
        'colorCodes' => parseListParam($input, 'colorCodes'),
        'sizeNames' => parseListParam($input, 'sizeNames'),
        'sizeCodes' => parseListParam($input, 'sizeCodes'),
        'stockStatus' => in_array(strtolower((string)($input['stockStatus'] ?? 'any')), ['in_stock', 'out_of_stock'], true)
            ? strtolower((string)$input['stockStatus'])
            : 'any',
    ];

    if (isset($input['searchTerm']) && trim((string)$input['searchTerm']) !== '') {
        $filters['searchTerms'][] = trim((string)$input['searchTerm']);
    }

    $manufacturerIds = parseListParam($input, 'manufacturerIds');
    if (empty($manufacturerIds)) {
        $manufacturerIds = array_map(
            fn($m) => $m['id'],
            fetchManufacturers($pdo)
        );
    }
    $manufacturerIds = array_values(array_filter(array_unique($manufacturerIds)));

    $matchedItems = [];
    foreach ($manufacturerIds as $manufacturerId) {
        $tableName = resolveManufacturerTable($pdo, $manufacturerId, 'details');
        $details = [];
        if ($tableName) {
            try {
                $details = fetchDirectTable($pdo, $tableName, true);
            } catch (Exception $e) {
                error_log("[inventory-management-data.php] Failed to load {$tableName}: " . $e->getMessage());
            }
        }
        if (empty($details)) {
            $details = loadManufacturerCsvData($manufacturerId, 'details');
        }
        if (empty($details)) {
            continue;
        }

        foreach ($details as $row) {
            $row['manufacturer_id'] = $manufacturerId;
            if (!passesDetailFilters($row, $filters)) {
                continue;
            }
            $matchedItems[] = $row;
        }
    }

    $matchedItems = filterDetailsByStockAttributes($pdo, $matchedItems, $filters);

    $totalCount = count($matchedItems);
    $startIndex = ($page - 1) * $pageSize;
    $items = array_slice($matchedItems, $startIndex, $pageSize);

    $response = [
        'items' => array_values($items),
        'pagination' => [
            'page' => $page,
            'pageSize' => $pageSize,
            'totalCount' => $totalCount,
            'totalPages' => $pageSize > 0 ? (int)max(1, ceil($totalCount / $pageSize)) : 1,
            'hasNextPage' => $startIndex + $pageSize < $totalCount,
            'hasPrevPage' => $page > 1,
        ],
    ];

    echo json_encode($response, JSON_UNESCAPED_UNICODE);
}

function handleInventoryStockMatrix(PDO $pdo) {
    $input = getRequestInput();
    $manufacturerId = $input['manufacturerId'] ?? $input['manufacturer_id'] ?? null;
    $productCode = $input['productCode'] ?? $input['product_code'] ?? null;

    if (!$manufacturerId || !$productCode) {
        http_response_code(400);
        echo json_encode(['error' => 'manufacturerId and productCode are required.']);
        return;
    }

    $detailsTable = resolveManufacturerTable($pdo, $manufacturerId, 'details');
    $product = null;

    if ($detailsTable) {
        try {
            $stmt = $pdo->prepare("SELECT * FROM `{$detailsTable}` WHERE product_code = ? LIMIT 1");
            $stmt->execute([$productCode]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("[inventory-management-data.php] Failed to load product details from {$detailsTable}: " . $e->getMessage());
        }
    }

    if (!$product) {
        $detailsRows = loadManufacturerCsvData($manufacturerId, 'details');
        foreach ($detailsRows as $row) {
            if (isset($row['product_code']) && (string)$row['product_code'] === (string)$productCode) {
                $product = $row;
                break;
            }
        }
    }

    if (!$product) {
        http_response_code(404);
        echo json_encode(['error' => 'Product not found.']);
        return;
    }

    $stockTable = resolveManufacturerTable($pdo, $manufacturerId, 'stock');
    $matrixRows = [];
    if ($stockTable) {
        try {
            $stmt = $pdo->prepare("SELECT color_code, color_name, size_code, size_name, quantity,
                                           incoming_quantity_1, incoming_date_1,
                                           incoming_quantity_2, incoming_date_2,
                                           incoming_quantity_3, incoming_date_3
                                    FROM `{$stockTable}`
                                    WHERE product_code = ?
                                    ORDER BY color_name, size_name");
            $stmt->execute([$productCode]);
            $matrixRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("[inventory-management-data.php] Failed to load stock matrix: " . $e->getMessage());
        }
    }

    if (empty($matrixRows)) {
        $stockRows = loadManufacturerCsvData($manufacturerId, 'stock');
        foreach ($stockRows as $row) {
            if ((string)($row['product_code'] ?? '') === (string)$productCode) {
                $matrixRows[] = [
                    'color_code' => $row['color_code'] ?? null,
                    'color_name' => $row['color_name'] ?? null,
                    'size_code' => $row['size_code'] ?? null,
                    'size_name' => $row['size_name'] ?? null,
                    'quantity' => is_numeric($row['quantity'] ?? null) ? (int)$row['quantity'] : 0,
                    'incoming_quantity_1' => is_numeric($row['incoming_quantity_1'] ?? null) ? (int)$row['incoming_quantity_1'] : null,
                    'incoming_date_1' => $row['incoming_date_1'] ?? null,
                    'incoming_quantity_2' => is_numeric($row['incoming_quantity_2'] ?? null) ? (int)$row['incoming_quantity_2'] : null,
                    'incoming_date_2' => $row['incoming_date_2'] ?? null,
                    'incoming_quantity_3' => is_numeric($row['incoming_quantity_3'] ?? null) ? (int)$row['incoming_quantity_3'] : null,
                    'incoming_date_3' => $row['incoming_date_3'] ?? null,
                ];
            }
        }
    }

    $colors = [];
    $sizes = [];
    foreach ($matrixRows as $row) {
        $colorKey = $row['color_code'] ?? $row['color_name'];
        $sizeKey = $row['size_code'] ?? $row['size_name'];
        if ($colorKey !== null && !in_array($colorKey, $colors, true)) {
            $colors[] = $colorKey;
        }
        if ($sizeKey !== null && !in_array($sizeKey, $sizes, true)) {
            $sizes[] = $sizeKey;
        }
    }

    $response = [
        'product' => $product,
        'stockMatrix' => [
            'rows' => $matrixRows,
            'colorKeys' => $colors,
            'sizeKeys' => $sizes,
        ],
    ];

    echo json_encode($response, JSON_UNESCAPED_UNICODE);
}

// --- API Routing ---
$action = $_GET['action'] ?? $_POST['action'] ?? null;

if ($action) {
    try {
        switch ($action) {
            case 'search_details':
                handleInventoryDetailsSearch($pdo);
                break;
            case 'get_stock_matrix':
                handleInventoryStockMatrix($pdo);
                break;
            default:
                http_response_code(400);
                echo json_encode(['error' => 'Unknown action.']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Unexpected error: ' . $e->getMessage()]);
    }
    exit();
}

$table_names_req = $_GET['tables'] ?? null;
$lightweight = isset($_GET['lightweight']) && $_GET['lightweight'] === 'true';

if (!$table_names_req) {
    http_response_code(400);
    echo json_encode(['error' => 'Request parameter "tables" not specified.']);
    exit();
}

// Whitelist of tables for Inventory Management Tool
$all_tables_whitelist = [
    // 在庫関連
    'stock', 'stock_history',
    // 注意: incoming_stockは削除（入荷情報はstockテーブルに直接保存）
    // 商品関連
    // 注意: products_masterは削除（stockテーブルに統合）
    'product_details',
    // 注意: product_tags_manu_xxxxは削除（product_details_manu_xxxxのtagsフィールドで管理）
    // 注意: product_prices, product_colors, skusは非推奨（stockテーブルから取得）
    'product_sizes', 'product_color_sizes',
    // マスタデータ
    'brands', 'manufacturers', 'categories', 'tags',
    // 注意: colors, sizesは削除（stockテーブルから直接取得）
    // 言語設定
    'language_settings_inventory_management', 'language_settings_common'
];

try {
    $requested_tables_raw = explode(',', $table_names_req);
    $db = [];
    $tables_to_fetch = in_array('all', $requested_tables_raw) ? $all_tables_whitelist : $requested_tables_raw;
    
    // メーカー一覧を取得（メーカー別テーブルを取得するために必要）
    $manufacturers = [];
    if (in_array('manufacturers', $tables_to_fetch) || in_array('all', $requested_tables_raw)) {
        $manufacturers = fetchManufacturers($pdo);
    } else {
        // manufacturersテーブルがリクエストされていなくても、メーカー依存テーブルがある場合は取得
        $hasManufacturerDependentTable = false;
        foreach ($tables_to_fetch as $table) {
            $parsed = parseManufacturerTableName($table);
            if (isManufacturerDependentTable($parsed['baseTableName'])) {
                $hasManufacturerDependentTable = true;
                break;
            }
        }
        if ($hasManufacturerDependentTable) {
            $manufacturers = fetchManufacturers($pdo);
        }
    }

    // Direct database queries - no intermediate layer
    // Security: All table names are validated against whitelist before use
    foreach($tables_to_fetch as $table) {
        $table = trim($table);
        
        // メーカー別テーブル名が直接リクエストされた場合の処理
        $parsed = parseManufacturerTableName($table);
        $baseTableName = $parsed['baseTableName'];
        $isManufacturerTableName = $parsed['manufacturerId'] !== null;
        
        // Security: Whitelist check - ベーステーブル名またはメーカー別テーブル名をチェック
        if (!in_array($baseTableName, $all_tables_whitelist)) {
            error_log("[inventory-management-data.php] SECURITY: Attempted access to non-whitelisted table: '{$table}' (base: '{$baseTableName}')");
            continue;
        }
        
        try {
            // Additional validation: Ensure table name contains only safe characters
            if (!preg_match('/^[a-zA-Z0-9_-]+$/', $table)) {
                error_log("[inventory-management-data.php] SECURITY: Invalid characters in table name: '{$table}'");
                continue;
            }
            
            // テーブルの存在確認（データベースから直接確認）
            if (!tableExists($pdo, $table)) {
                error_log("[inventory-management-data.php] Table '{$table}' does not exist in database");
                $db[$table] = ['schema' => [], 'data' => []];
                continue;
            }
            
            // メーカー別テーブル名が直接リクエストされた場合
            if ($isManufacturerTableName) {
                // 直接取得
                try {
                    $rawRows = fetchDirectTable($pdo, $table, $lightweight);
                    $schema = fetchTableSchema($pdo, $table);
                    $db[$table] = [
                        'schema' => $schema,
                        'data' => $rawRows
                    ];
                    error_log("[inventory-management-data.php] Fetched manufacturer table '{$table}' with " . count($rawRows) . " rows, " . count($schema) . " columns");
                } catch (PDOException $e) {
                    // メーカー別テーブルが存在しない場合は空配列を返す
                    $db[$table] = ['schema' => [], 'data' => []];
                    error_log("[inventory-management-data.php] Manufacturer table '{$table}' does not exist, returning empty array");
                }
            } elseif (isManufacturerDependentTable($baseTableName)) {
                // ベーステーブル名がリクエストされた場合、すべてのメーカー別テーブルを取得
                // manufacturersが空の場合でも、データベースから直接メーカー別テーブルを検索
                if (!empty($manufacturers)) {
                    // 方法1: manufacturersテーブルからメーカーIDを取得
                    foreach ($manufacturers as $manufacturer) {
                        $manufacturerId = $manufacturer['id'] ?? null;
                        if (!$manufacturerId || $manufacturerId === 'undefined' || trim($manufacturerId) === '') {
                            continue;
                        }
                        
                        // 新しい命名規則: {manufacturerId}_{tableName} (例: manu_0001_stock, manu_0001_details)
                        $suffix = $baseTableName;
                        if ($baseTableName === 'product_details') {
                            $suffix = 'details';
                        }
                        $manufacturerTableName = "{$manufacturerId}_{$suffix}";
                        // テーブルの存在確認
                        if (!tableExists($pdo, $manufacturerTableName)) {
                            error_log("[inventory-management-data.php] Manufacturer table '{$manufacturerTableName}' does not exist in database, skipping");
                            continue;
                        }
                        
                        try {
                            $manufacturerRows = fetchDirectTable($pdo, $manufacturerTableName, $lightweight);
                            $schema = fetchTableSchema($pdo, $manufacturerTableName);
                            $db[$manufacturerTableName] = [
                                'schema' => $schema,
                                'data' => $manufacturerRows
                            ];
                            error_log("[inventory-management-data.php] Fetched manufacturer table '{$manufacturerTableName}' with " . count($manufacturerRows) . " rows, " . count($schema) . " columns");
                        } catch (PDOException $e) {
                            // メーカー別テーブルが存在しない場合は空配列を返す
                            $db[$manufacturerTableName] = ['schema' => [], 'data' => []];
                            error_log("[inventory-management-data.php] Manufacturer table '{$manufacturerTableName}' error: " . $e->getMessage());
                        }
                    }
                } else {
                    // 方法2: manufacturersテーブルが空の場合、データベースから直接メーカー別テーブルを検索
                    // INFORMATION_SCHEMAを使用して、manu_で始まり_{suffix}で終わるテーブルを検索
                    try {
                        $databaseName = $pdo->query("SELECT DATABASE()")->fetchColumn();
                        // 新しい命名規則: manu_xxxx_{suffix} (例: manu_0001_stock, manu_0001_details)
                        $suffix = $baseTableName;
                        if ($baseTableName === 'product_details') {
                            $suffix = 'details';
                        }
                        $stmt = $pdo->prepare("
                            SELECT TABLE_NAME 
                            FROM INFORMATION_SCHEMA.TABLES 
                            WHERE TABLE_SCHEMA = ? 
                            AND TABLE_NAME LIKE ?
                            ORDER BY TABLE_NAME
                        ");
                        $likePattern = "manu_%_{$suffix}";
                        $stmt->execute([$databaseName, $likePattern]);
                        $manufacturerTables = $stmt->fetchAll(PDO::FETCH_COLUMN);
                        
                        foreach ($manufacturerTables as $manufacturerTableName) {
                            try {
                                $manufacturerRows = fetchDirectTable($pdo, $manufacturerTableName, $lightweight);
                                $schema = fetchTableSchema($pdo, $manufacturerTableName);
                                $db[$manufacturerTableName] = [
                                    'schema' => $schema,
                                    'data' => $manufacturerRows
                                ];
                                error_log("[inventory-management-data.php] Fetched manufacturer table '{$manufacturerTableName}' with " . count($manufacturerRows) . " rows, " . count($schema) . " columns");
                            } catch (PDOException $e) {
                                $db[$manufacturerTableName] = ['schema' => [], 'data' => []];
                                error_log("[inventory-management-data.php] Manufacturer table '{$manufacturerTableName}' error: " . $e->getMessage());
                            }
                        }
                    } catch (PDOException $e) {
                        error_log("[inventory-management-data.php] Error searching for manufacturer tables: " . $e->getMessage());
                    }
                }
            } else {
                // メーカー非依存テーブルはそのまま取得
                // テーブルの存在確認（既に上で確認済みだが、念のため）
                if (!tableExists($pdo, $table)) {
                    error_log("[inventory-management-data.php] Table '{$table}' does not exist in database");
                    $db[$table] = ['schema' => [], 'data' => []];
                    continue;
                }
                
                $rawRows = fetchDirectTable($pdo, $table, $lightweight);
                $schema = fetchTableSchema($pdo, $table);
                $db[$table] = [
                    'schema' => $schema,
                    'data' => $rawRows
                ];
                
                // Debug: Log loading results
                if (empty($rawRows)) {
                    error_log("[inventory-management-data.php] Table '{$table}' returned empty array (no rows or all rows filtered), but schema has " . count($schema) . " columns");
                } else {
                    error_log("[inventory-management-data.php] Successfully loaded " . count($rawRows) . " rows from table '{$table}' with " . count($schema) . " columns");
                }
            }
        } catch (InvalidArgumentException $e) {
            error_log("[inventory-management-data.php] Error loading table '{$table}': " . $e->getMessage());
            $db[$table] = ['schema' => [], 'data' => []]; // Return empty array on invalid table name
        } catch (PDOException $e) {
            // If a table doesn't exist or has other errors, log and return empty array
            $errorCode = $e->getCode();
            $errorMessage = $e->getMessage();
            
            error_log("[inventory-management-data.php] Error loading table '{$table}': Code {$errorCode}, Message: {$errorMessage}");
            
            if ($e->getCode() == '42S02') { // SQLSTATE[42S02]: Base table or view not found
                $db[$table] = ['schema' => [], 'data' => []];
                error_log("[inventory-management-data.php] Table '{$table}' not found, returning empty array");
            } else {
                $db[$table] = ['schema' => [], 'data' => []];
                error_log("[inventory-management-data.php] Table '{$table}' error (not 42S02), returning empty array");
            }
        } catch (Exception $e) {
            error_log("[inventory-management-data.php] Unexpected error loading table '{$table}': " . $e->getMessage());
            $db[$table] = ['schema' => [], 'data' => []];
        }
    }
    
    echo json_encode($db, JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database query failed: ' . $e->getMessage()]);
    exit();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
    exit();
}
?>


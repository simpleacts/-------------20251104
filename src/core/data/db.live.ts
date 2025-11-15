import { Column, Database, Row, Table } from '../../shared/types';
import { parseCSV } from '../../shared/utils/csv';
import { getManufacturerTableName, isManufacturerDependentTable, parseManufacturerTableName } from '../config/tableNames';
import { getCsvPath } from '../utils/csvPathResolver';

// CSVテキストからヘッダー行を抽出する関数
function extractHeadersFromCSV(csvText: string): string[] {
  // Remove BOM (Byte Order Mark) if present
  let text = csvText;
  if (text.length > 0 && text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.trim() === '') continue;
    
    // 簡単なCSVパース（引用符対応）
    const headers: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"' && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // Skip the second quote
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          headers.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
    }
    headers.push(current.trim());
    
    if (headers.length > 0 && headers.some(h => h !== '')) {
      return headers.filter(h => h !== '');
    }
  }
  
  return [];
}

// ヘッダー行からスキーマを推論する関数
function inferSchemaFromHeaders(headers: string[], tableName?: string): Column[] {
  if (headers.length === 0) return [];
  
  // 先頭0を保持する必要があるカラム名（コード系のカラム）
  const codeColumns = ['code', 'sizeCode', 'colorCode', 'size_code', 'color_code', 'product_code', 'productCode', 'jan_code'];
  
  // ブール値として扱う可能性が高いカラム名
  const booleanColumns = ['is_published', 'is_active', 'is_deleted', 'is_visible', 'is_enabled'];
  
  // 数値として扱う可能性が高いカラム名
  const numberColumns = ['quantity', 'price', 'cost', 'weight', 'height', 'width', 'depth', 'order', 'sort_order'];
  
  return headers.map(name => {
    const id = name;
    
    // コード系のカラムは常にTEXT型として扱う（頭の0を保持するため）
    if (codeColumns.includes(name)) {
      return { id, name, type: 'TEXT' as const };
    }
    
    // ブール値として扱う可能性が高いカラム
    if (booleanColumns.includes(name)) {
      return { id, name, type: 'NUMBER' as const }; // TINYINT(1)はNUMBERとして扱う
    }
    
    // 数値として扱う可能性が高いカラム
    if (numberColumns.some(col => name.toLowerCase().includes(col))) {
      return { id, name, type: 'NUMBER' as const };
    }
    
    // デフォルトはTEXT型
    return { id, name, type: 'TEXT' as const };
  });
}

// This function is needed to create the schema from the fetched data
export function inferSchema(rows: Row[], tableName?: string): Column[] {
  if (rows.length === 0) return [];
  
  const firstRowWithData = rows.find(row => row && Object.keys(row).length > 0);
  if (!firstRowWithData) return [];

  const columnNames = Object.keys(firstRowWithData);
  
  // 先頭0を保持する必要があるカラム名（コード系のカラム）
  const codeColumns = ['code', 'sizeCode', 'colorCode', 'size_code', 'color_code', 'product_code', 'productCode', 'jan_code'];
  
  return columnNames.map(name => {
    const id = name;
    
    // コード系のカラムは常にTEXT型として扱う（頭の0を保持するため）
    if (codeColumns.includes(name)) {
      return { id, name, type: 'TEXT' as const };
    }
    
    let hasNumber = false;
    let hasString = false;
    let hasBoolean = false;

    // Check a sample of rows for performance, or all for accuracy.
    // For this app's scale, checking all is fine.
    for (const row of rows) {
      const value = row[name];
      if (value === null || value === undefined) continue;

      const type = typeof value;
      if (type === 'number') {
        hasNumber = true;
      } else if (type === 'string' && value.trim() !== '') {
        hasString = true;
      } else if (type === 'boolean') {
        hasBoolean = true;
      }
      // If we have mixed types, we can default to TEXT
      if (hasNumber && hasString) break;
    }

    let finalType: Column['type'] = 'TEXT';
    if (hasNumber && !hasString && !hasBoolean) {
        finalType = 'NUMBER';
    } else if (hasBoolean && !hasString && !hasNumber) {
        finalType = 'BOOLEAN';
    } else { // hasString, or mixed types
        finalType = 'TEXT';
    }
    
    return { id, name, type: finalType };
  });
}

export const getInitialTables = (): string[] => [
    'settings', 'color_settings', 'layout_settings', 'behavior_settings',
    // pagination_settingsは必要なページでのみ読み込む（パフォーマンス向上のため）
    'users', 'roles', 'role_permissions', 'dev_locks', 'google_api_settings', 'email_accounts', 'tool_migrations',
    'app_logs', 'tool_visibility_settings', 'mobile_tool_mappings', 'tool_dependencies', 'icons', 'ai_settings', 'google_fonts',
    'modules_page_tool', 'modules_core',
    // 共通の言語設定テーブル（全ページで使用）
    'language_settings_common',
    // 後方互換性のため
    'language_settings',
    // サイズの並び順マスタ（全メーカー共通）
    'size_order_master',
];


import { AppMode } from '../types/appMode';
import { getStoredAppMode, setStoredAppMode } from '../utils/appMode';

export const fetchTables = async (tableNames: string[], options?: { lightweight?: boolean; toolName?: string }): Promise<Partial<Database>> => {
    if (tableNames.length === 0) return {};

    const appMode = getStoredAppMode();

    try {
        if (appMode === 'live') {
            // liveモードでは、すべてのテーブルをPHP APIから取得
            const allTables = tableNames;
            const lightweightParam = options?.lightweight ? '&lightweight=true' : '';
            // Use tool-specific PHP file if toolName is provided, otherwise use app-initialization-data.php
            // This ensures all data access goes through tool-specific endpoints for better security
            const phpFile = options?.toolName ? `${options.toolName}-data.php` : 'app-initialization-data.php';
            const response = await fetch(`/api/${phpFile}?tables=${tableNames.join(',')}${lightweightParam}`);
            if (!response.ok) {
                // If 404, PHP file doesn't exist - fallback to csv-debug mode
                // Note: We don't change localStorage here to avoid interfering with build deployments
                if (response.status === 404) {
                    console.warn(`${phpFile} not found (404). Falling back to csv-debug mode.`);
                    // Get current appMode from localStorage, or default to csv-debug
                    const currentMode = getStoredAppMode();
                    if (currentMode === 'live') {
                        // Only auto-switch if explicitly in live mode and user hasn't set it otherwise
                        console.warn('Auto-switching to csv-debug mode due to 404 error. User can change mode manually.');
                    }
                    // This creates a new request in csv-debug mode by directly implementing the logic, avoiding recursion.
                    const db: Partial<Database> = {};
                    const encoding = localStorage.getItem('csvEncoding') || 'UTF-8';
                    
                    // テーブル名を分類する前に、メーカー依存テーブル名の形式（stock_manu_0001など）をパース
                    const processedTableNames404: string[] = [];
                    const specificManufacturerTables404: Map<string, { baseTableName: string; manufacturerId: string }> = new Map();
                    
                    for (const tableName of tableNames) {
                        const parsed = parseManufacturerTableName(tableName);
                        if (parsed.manufacturerId) {
                            // メーカー依存テーブル名の形式（stock_manu_0001など）の場合
                            let manufacturerId = parsed.manufacturerId;
                            // manufacturerIdに`manu_`プレフィックスが含まれている場合は除去
                            if (manufacturerId.startsWith('manu_')) {
                                manufacturerId = manufacturerId.substring(5);
                            }
                            specificManufacturerTables404.set(tableName, { baseTableName: parsed.baseTableName, manufacturerId });
                            // ベーステーブル名を追加（まだ追加されていない場合）
                            if (!processedTableNames404.includes(parsed.baseTableName)) {
                                processedTableNames404.push(parsed.baseTableName);
                            }
                        } else {
                            processedTableNames404.push(tableName);
                        }
                    }
                    
                    // メーカー非依存テーブルを読み込む
                    // colors, sizesはstockテーブルから取得されるため、CSVから読み込まない
                    // stockテーブル自体はCSVから読み込む（csv-debug/csv-writableモード）
                    const independentTables = processedTableNames404.filter(
                        t => !isManufacturerDependentTable(t) && 
                             t !== 'colors' && t !== 'sizes' &&
                             !t.startsWith('colors_') && !t.startsWith('sizes_')
                    );
                    const manufacturerDependentTables = processedTableNames404.filter(
                        t => isManufacturerDependentTable(t)
                    );

                    // 1. まずメーカー一覧を取得（メーカー依存テーブルがある場合のみ）
                    let manufacturers: Row[] = [];
                    if (manufacturerDependentTables.length > 0) {
                        try {
                            const manufacturersResponse = await fetch('templates/common/manufacturers.csv');
                            if (manufacturersResponse.ok) {
                                const arrayBuffer = await manufacturersResponse.arrayBuffer();
                                const decoder = new TextDecoder(encoding);
                                const csvText = decoder.decode(arrayBuffer);
                                manufacturers = parseCSV(csvText, 'templates/common/manufacturers.csv');
                                // メーカーIDが有効なもののみをフィルタ
                                manufacturers = manufacturers.filter(m => m.id && m.id !== 'undefined' && String(m.id).trim() !== '');
                            } else {
                                // フォールバック: 直下のmanufacturers.csvを試す
                                const fallbackResponse = await fetch('templates/manufacturers.csv');
                                if (fallbackResponse.ok) {
                                    const arrayBuffer = await fallbackResponse.arrayBuffer();
                                    const decoder = new TextDecoder(encoding);
                                    const csvText = decoder.decode(arrayBuffer);
                                    manufacturers = parseCSV(csvText, 'templates/manufacturers.csv');
                                    manufacturers = manufacturers.filter(m => m.id && m.id !== 'undefined' && String(m.id).trim() !== '');
                                }
                            }
                        } catch (e) {
                            const error = e instanceof Error ? e : new Error(String(e));
                            if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
                                console.error('サーバーに接続できません。PHPサーバーが起動しているか確認してください。');
                                console.error('サーバーを起動するには、プロジェクトルートで以下のコマンドを実行してください:');
                                console.error('  start-server.bat');
                                console.error('または手動で: php -S localhost:8080');
                            }
                            console.warn('Failed to load manufacturers.csv, skipping manufacturer-specific files.', e);
                        }
                    }

                    // 2. メーカー非依存テーブルを読み込む（ツールごとのフォルダから読み込む）
                    const independentPromises = independentTables.map(async (tableName) => {
                        const csvPaths = getCsvPath(tableName);
                        let lastError: Error | null = null;
                        
                        // 複数のパスを試す（ツールフォルダ → 直下）
                        for (const csvPath of csvPaths) {
                            try {
                                // 404エラーを抑制するため、エラーハンドリングを改善
                                const response = await fetch(csvPath).catch(() => null);
                                if (!response) {
                                    continue; // fetchが失敗した場合は次のパスを試す
                                }
                                if (response.status === 404) {
                                    continue; // 404エラーの場合は次のパスを試す（エラーを出さない）
                                }
                                if (response.ok) {
                                    const arrayBuffer = await response.arrayBuffer();
                                    const decoder = new TextDecoder(encoding);
                                    const csvText = decoder.decode(arrayBuffer);
                                    const data = parseCSV(csvText, csvPath);
                                    let schema = inferSchema(data, tableName);
                                    
                                    // データが空でもヘッダー行からスキーマを推論
                                    if (schema.length === 0) {
                                        const headers = extractHeadersFromCSV(csvText);
                                        if (headers.length > 0) {
                                            schema = inferSchemaFromHeaders(headers, tableName);
                                        }
                                    }
                                    
                                    return { tableName, table: { schema, data } };
                                }
                            } catch (e) {
                                lastError = e instanceof Error ? e : new Error(String(e));
                                // 次のパスを試す
                                continue;
                            }
                        }
                        
                        // すべてのパスで失敗した場合
                        if (csvPaths.length === 1 || lastError) {
                            console.warn(`CSV file not found for table: ${tableName}. Tried paths: ${csvPaths.join(', ')}. Creating empty table.`);
                            return { tableName, table: { data: [], schema: [] } };
                        }
                        
                        return { tableName, table: { data: [], schema: [] } };
                    });

                    // 3. tagsテーブルは全メーカー共通とメーカー固有の両方をマージ
                    if (tableNames.includes('tags')) {
                        const commonTagsPath = 'templates/common/tags.csv';
                        let commonTagsData: Row[] = [];
                        let commonTagsSchema: Column[] = [];
                        
                        try {
                            const commonResponse = await fetch(commonTagsPath);
                            if (commonResponse.ok) {
                                const arrayBuffer = await commonResponse.arrayBuffer();
                                const decoder = new TextDecoder(encoding);
                                const csvText = decoder.decode(arrayBuffer);
                                commonTagsData = parseCSV(csvText, commonTagsPath);
                                commonTagsSchema = inferSchema(commonTagsData, 'tags');
                                
                                // データが空でもヘッダー行からスキーマを推論
                                if (commonTagsSchema.length === 0) {
                                    const headers = extractHeadersFromCSV(csvText);
                                    if (headers.length > 0) {
                                        commonTagsSchema = inferSchemaFromHeaders(headers, 'tags');
                                    }
                                }
                            }
                        } catch (e) {
                            console.debug(`Common tags file not found: ${commonTagsPath}, skipping.`);
                        }
                        
                        // メーカー固有のタグを読み込んでマージ
                        const allTagsData = [...commonTagsData];
                        let allTagsSchema = commonTagsSchema.length > 0 ? commonTagsSchema : [];
                        
                        if (manufacturers.length > 0) {
                            for (const manufacturer of manufacturers) {
                                const manufacturerId = manufacturer.id as string;
                                if (!manufacturerId || manufacturerId === 'undefined') continue;
                                
                                // 新しいファイル名ルール: manu_{manufacturerId}_tags.csv (getCsvPathを使用)
                                const manufacturerTagsPaths = getCsvPath('tags', manufacturerId);
                                if (manufacturerTagsPaths.length === 0) continue;
                                const manufacturerTagsPath = manufacturerTagsPaths.find(p => p.includes(`manufacturers/manu_${manufacturerId}`)) || manufacturerTagsPaths[0];
                                try {
                                    const manufacturerResponse = await fetch(manufacturerTagsPath);
                                    if (manufacturerResponse.ok) {
                                        const arrayBuffer = await manufacturerResponse.arrayBuffer();
                                        const decoder = new TextDecoder(encoding);
                                        const csvText = decoder.decode(arrayBuffer);
                                        const manufacturerTagsData = parseCSV(csvText, manufacturerTagsPath);
                                        allTagsData.push(...manufacturerTagsData);
                                        if (allTagsSchema.length === 0) {
                                            if (manufacturerTagsData.length > 0) {
                                                allTagsSchema = inferSchema(manufacturerTagsData, 'tags');
                                            } else {
                                                // データが空でもヘッダー行からスキーマを推論
                                                const headers = extractHeadersFromCSV(csvText);
                                                if (headers.length > 0) {
                                                    allTagsSchema = inferSchemaFromHeaders(headers, 'tags');
                                                }
                                            }
                                        }
                                    }
                                } catch (e) {
                                    console.debug(`Manufacturer-specific tags file not found: ${manufacturerTagsPath}, skipping.`);
                                }
                            }
                        }
                        
                        db['tags'] = { schema: allTagsSchema, data: allTagsData };
                    }
                    
                    // 4. メーカー依存テーブルを読み込む（メーカーごとに分離）
                    const manufacturerDependentPromises: Promise<{ tableName: string; table: Table } | null>[] = [];
                    
                    // 特定のメーカーのテーブル（stock_manu_0001など）が直接リクエストされた場合の処理
                    for (const [requestedTableName, { baseTableName, manufacturerId: specificManufacturerId }] of specificManufacturerTables404.entries()) {
                        const csvPaths = getCsvPath(baseTableName, specificManufacturerId);
                        if (csvPaths.length === 0) {
                            console.debug(`No CSV path found for specific manufacturer table: ${requestedTableName}, skipping.`);
                            continue;
                        }
                        const csvPath = csvPaths[0];
                        
                        manufacturerDependentPromises.push(
                            (async () => {
                                try {
                                    // 404エラーを抑制するため、エラーハンドリングを改善
                                    const response = await fetch(csvPath).catch(() => null);
                                    if (!response) {
                                        // fetchが失敗した場合は空のテーブルを作成
                                        return { tableName: requestedTableName, table: { schema: [], data: [] } };
                                    }
                                    
                                    if (response.ok) {
                                        const arrayBuffer = await response.arrayBuffer();
                                        const decoder = new TextDecoder(encoding);
                                        const csvText = decoder.decode(arrayBuffer);
                                        const data = parseCSV(csvText, csvPath);
                                        let schema = inferSchema(data, baseTableName);
                                        
                                        // データが空でもヘッダー行からスキーマを推論
                                        if (schema.length === 0) {
                                            const headers = extractHeadersFromCSV(csvText);
                                            if (headers.length > 0) {
                                                schema = inferSchemaFromHeaders(headers, baseTableName);
                                            }
                                        }
                                        
                                        return { tableName: requestedTableName, table: { schema, data } };
                                    } else if (response.status === 404) {
                                        // 404エラーの場合は空のテーブルを作成（エラーを出さない、コンソールにも表示しない）
                                        return { tableName: requestedTableName, table: { schema: [], data: [] } };
                                    } else {
                                        // その他のHTTPエラーの場合も空のテーブルを作成（デバッグログのみ）
                                        console.debug(`Failed to fetch manufacturer-specific file (${response.status}): ${csvPath}, creating empty table.`);
                                        return { tableName: requestedTableName, table: { schema: [], data: [] } };
                                    }
                                } catch (e) {
                                    // ファイルが存在しない場合は空のテーブルを作成（エラーを出さない）
                                    return { tableName: requestedTableName, table: { schema: [], data: [] } };
                                }
                            })()
                        );
                    }
                        
                    for (const tableName of manufacturerDependentTables) {
                        // tagsは既に処理済みなのでスキップ
                        if (tableName === 'tags') continue;
                        if (manufacturers.length === 0) {
                            console.warn(`No manufacturers found. Cannot load manufacturer-dependent table: ${tableName}.`);
                            continue;
                        }
                        
                        // 各メーカーごとにテーブルを読み込む
                        for (const manufacturer of manufacturers) {
                            const manufacturerId = manufacturer.id as string;
                            if (!manufacturerId || manufacturerId === 'undefined') {
                                console.warn(`Invalid manufacturer ID found: ${manufacturerId}. Skipping.`);
                                continue;
                            }
                            
                            const manufacturerTableName = getManufacturerTableName(tableName, manufacturerId);
                            // 特定のメーカーのテーブルが既に処理されている場合はスキップ
                            if (specificManufacturerTables404.has(manufacturerTableName)) {
                                continue;
                            }
                            
                            // 新しいファイル名ルール: manu_{manufacturerId}_{tableName}.csv (getCsvPathを使用)
                            const csvPaths = getCsvPath(tableName, manufacturerId);
                            if (csvPaths.length === 0) {
                                console.debug(`No CSV path found for manufacturer-dependent table: ${tableName} (manufacturer: ${manufacturerId}), skipping.`);
                                continue;
                            }
                            const csvPath = csvPaths[0]; // 最初のパスを使用
                            
                            manufacturerDependentPromises.push(
                                (async () => {
                                    try {
                                        // 404エラーを抑制するため、エラーハンドリングを改善
                                        const response = await fetch(csvPath).catch(() => null);
                                        if (!response) {
                                            // fetchが失敗した場合は空のテーブルを作成
                                            return { tableName: manufacturerTableName, table: { schema: [], data: [] } };
                                        }
                                        
                                        if (response.ok) {
                                            const arrayBuffer = await response.arrayBuffer();
                                            const decoder = new TextDecoder(encoding);
                                            const csvText = decoder.decode(arrayBuffer);
                                            const data = parseCSV(csvText, csvPath);
                                            let schema = inferSchema(data, tableName);
                                            
                                            // データが空でもヘッダー行からスキーマを推論
                                            if (schema.length === 0) {
                                                const headers = extractHeadersFromCSV(csvText);
                                                if (headers.length > 0) {
                                                    schema = inferSchemaFromHeaders(headers, tableName);
                                                }
                                            }
                                            
                                            return { tableName: manufacturerTableName, table: { schema, data } };
                                        } else if (response.status === 404) {
                                            // 404エラーの場合は空のテーブルを作成（エラーを出さない、コンソールにも表示しない）
                                            return { tableName: manufacturerTableName, table: { schema: [], data: [] } };
                                        } else {
                                            // その他のHTTPエラーの場合も空のテーブルを作成（デバッグログのみ）
                                            console.debug(`Failed to fetch manufacturer-specific file (${response.status}): ${csvPath}, creating empty table.`);
                                            return { tableName: manufacturerTableName, table: { schema: [], data: [] } };
                                        }
                                    } catch (e) {
                                        // ファイルがない場合はスキップ（エラーを出さない）
                                        return { tableName: manufacturerTableName, table: { schema: [], data: [] } };
                                    }
                                })()
                            );
                        }
                    }

                    // すべてのプロミスを実行
                    const allPromises = [...independentPromises, ...manufacturerDependentPromises];
                    const results = await Promise.all(allPromises);
                    results.forEach(result => {
                        if (result) {
                            db[result.tableName] = result.table;
                        }
                    });
                    return db;
                }
                const errorText = await response.text();
                try {
                    const errorJson = JSON.parse(errorText);
                    if (errorJson.error) {
                        throw new Error(`PHP API Error while fetching tables (${tableNames.join(', ')}): ${errorJson.error}`);
                    }
                } catch (e) {
                     throw new Error(`API endpoint '${phpFile}' failed for tables (${tableNames.join(', ')}): ${response.status} ${response.statusText}\nResponse: ${errorText}`);
                }
                 throw new Error(`API endpoint '${phpFile}' failed for tables (${tableNames.join(', ')}): ${response.status} ${response.statusText}`);
            }
            
            // Check Content-Type header first
            const contentType = response.headers.get('content-type');
            
            // Read response as text first (we can only read the body once)
            const responseText = await response.text();
            
            // Check if response is actually JSON
            if (!contentType || !contentType.includes('application/json')) {
                console.error(`Expected JSON but got ${contentType}. Full response:`, responseText);
                // If we get HTML, it's likely a PHP error or 404 page
                // Show more of the response to help debug
                const preview = responseText.length > 2000 ? responseText.substring(0, 2000) + '...' : responseText;
                throw new Error(`API endpoint '${phpFile}' returned non-JSON response (${contentType}). This might indicate a PHP error or 404 page. Response preview: ${preview}`);
            }
            
            // Parse as JSON
            // APIレスポンスは {schema: [...], data: [...]} 形式で返される
            let rawData: Record<string, { schema: Column[]; data: Row[] }>;
            try {
                // Check if response is complete (ends with } or ])
                const trimmedText = responseText.trim();
                if (trimmedText.length === 0) {
                    throw new Error('Empty response received');
                }
                // Log response length for debugging
                if (trimmedText.length > 10000) {
                    console.log(`Large JSON response: ${trimmedText.length} characters`);
                }
                rawData = JSON.parse(responseText);
            } catch (parseError) {
                const preview = responseText.length > 1000 ? responseText.substring(0, 1000) + '...' : responseText;
                const endPreview = responseText.length > 200 ? responseText.substring(Math.max(0, responseText.length - 200)) : responseText;
                console.error(`Failed to parse JSON response. Content type: ${contentType}`);
                console.error(`Response length: ${responseText.length} characters`);
                console.error(`Response start (first 1000 chars):`, preview);
                console.error(`Response end (last 200 chars):`, endPreview);
                console.error(`Parse error:`, parseError);
                throw new Error(`API endpoint '${phpFile}' returned invalid JSON. Parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}. Response length: ${responseText.length} chars. Start: ${preview.substring(0, 200)}`);
            }
            const partialDb: Partial<Database> = {};
            
            // メーカー一覧を取得（デバッグ用）
            let manufacturers: Row[] = [];
            if (rawData['manufacturers']) {
                const manufacturersTable = rawData['manufacturers'];
                // 後方互換性: 配列形式の場合も対応
                if (Array.isArray(manufacturersTable)) {
                    manufacturers = manufacturersTable.filter((m: Row) => m.id && m.id !== 'undefined' && String(m.id).trim() !== '');
                } else if (manufacturersTable && manufacturersTable.data) {
                    manufacturers = manufacturersTable.data.filter((m: Row) => m.id && m.id !== 'undefined' && String(m.id).trim() !== '');
                }
            }
            
            // すべてのテーブル（メーカー別テーブル名）を処理
            for (const key in rawData) {
                if (!rawData.hasOwnProperty(key)) continue;
                
                const tableData = rawData[key];
                
                // 後方互換性: 配列形式の場合も対応（古いAPI形式）
                let schema: Column[] = [];
                let data: Row[] = [];
                
                if (Array.isArray(tableData)) {
                    // 古い形式: 配列のみ
                    data = tableData;
                    // スキーマを推論（後方互換性のため）
                    schema = inferSchema(data, key);
                } else if (tableData && typeof tableData === 'object' && 'schema' in tableData && 'data' in tableData) {
                    // 新しい形式: {schema: [...], data: [...]}
                    schema = tableData.schema || [];
                    data = tableData.data || [];
                } else {
                    // 不明な形式: スキップ
                    console.warn(`[db.live.ts] Unknown data format for table '${key}', skipping.`);
                    continue;
                }
                
                // Additional client-side filtering for null/empty rows (server should filter too, but this is a safeguard)
                data = data.filter(row => {
                    if (!row || typeof row !== 'object') return false;
                    
                    // より厳密なフィルタリング: すべての値がnull、undefined、または空文字列の行を除外
                    const values = Object.values(row);
                    const hasValidValue = values.some(value => {
                        // null または undefined は無効
                        if (value === null || value === undefined) return false;
                        
                        // 文字列の場合、空文字列や空白のみは無効
                        if (typeof value === 'string') {
                            return value.trim() !== '';
                        }
                        
                        // boolean と number は常に有効（false と 0 も有効な値）
                        if (typeof value === 'boolean' || typeof value === 'number') {
                            return true;
                        }
                        
                        // 配列やオブジェクトも有効（空配列や空オブジェクトも含む）
                        return true;
                    });
                    
                    return hasValidValue;
                });

                // APIからスキーマを取得した場合はそれを使用（推論不要）
                // スキーマが空の場合のみ推論（後方互換性のため）
                if (schema.length === 0 && data.length > 0) {
                    schema = inferSchema(data, key);
                }
                
                partialDb[key] = { schema, data };
            }
            
            return partialDb;
        } else if (appMode === 'csv-debug' || appMode === 'csv-writable') {
            const db: Partial<Database> = {};
            const encoding = localStorage.getItem('csvEncoding') || 'UTF-8';
            
                    // テーブル名を分類する前に、メーカー依存テーブル名の形式（stock_manu_0001など）をパース
                    const processedTableNames: string[] = [];
                    const specificManufacturerTables: Map<string, { baseTableName: string; manufacturerId: string }> = new Map();
                    
                    for (const tableName of tableNames) {
                        const parsed = parseManufacturerTableName(tableName);
                        if (parsed.manufacturerId) {
                            // メーカー依存テーブル名の形式（stock_manu_0001など）の場合
                            let manufacturerId = parsed.manufacturerId;
                            // manufacturerIdに`manu_`プレフィックスが含まれている場合は除去
                            if (manufacturerId.startsWith('manu_')) {
                                manufacturerId = manufacturerId.substring(5);
                            }
                            specificManufacturerTables.set(tableName, { baseTableName: parsed.baseTableName, manufacturerId });
                            // ベーステーブル名を追加（まだ追加されていない場合）
                            if (!processedTableNames.includes(parsed.baseTableName)) {
                                processedTableNames.push(parsed.baseTableName);
                            }
                        } else {
                            processedTableNames.push(tableName);
                        }
                    }
                    
                    // メーカー非依存テーブルを読み込む
                    // colors, sizesはstockテーブルから取得されるため、CSVから読み込まない
                    // stockテーブル自体はCSVから読み込む（csv-debug: 読み込みのみ、csv-writable: 読み込み+書き込み）
                    const independentTables = processedTableNames.filter(
                        t => !isManufacturerDependentTable(t) && 
                             t !== 'colors' && t !== 'sizes' &&
                             !t.startsWith('colors_') && !t.startsWith('sizes_')
                    );
                    const manufacturerDependentTables = processedTableNames.filter(
                        t => isManufacturerDependentTable(t)
                    );

            // 1. まずメーカー一覧を取得（メーカー依存テーブルがある場合のみ）
            let manufacturers: Row[] = [];
            if (manufacturerDependentTables.length > 0) {
                try {
                    const manufacturersResponse = await fetch('templates/common/manufacturers.csv');
                    if (manufacturersResponse.ok) {
                        const arrayBuffer = await manufacturersResponse.arrayBuffer();
                        const decoder = new TextDecoder(encoding);
                        const csvText = decoder.decode(arrayBuffer);
                        manufacturers = parseCSV(csvText, 'templates/common/manufacturers.csv');
                    } else {
                        // フォールバック: 直下のmanufacturers.csvを試す
                        const fallbackResponse = await fetch('templates/manufacturers.csv');
                        if (fallbackResponse.ok) {
                            const arrayBuffer = await fallbackResponse.arrayBuffer();
                            const decoder = new TextDecoder(encoding);
                            const csvText = decoder.decode(arrayBuffer);
                            manufacturers = parseCSV(csvText, 'templates/manufacturers.csv');
                        }
                    }
                } catch (e) {
                    const error = e instanceof Error ? e : new Error(String(e));
                    if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
                        console.error('サーバーに接続できません。PHPサーバーが起動しているか確認してください。');
                        console.error('サーバーを起動するには、プロジェクトルートで以下のコマンドを実行してください:');
                        console.error('  start-server.bat');
                        console.error('または手動で: php -S localhost:8080');
                    }
                    console.warn('Failed to load manufacturers.csv, skipping manufacturer-specific files.', e);
                }
            }

            // 2. メーカー非依存テーブルを読み込む（ツールごとのフォルダから読み込む）
            const independentPromises = independentTables.map(async (tableName) => {
                const csvPaths = getCsvPath(tableName);
                let lastError: Error | null = null;
                
                // 複数のパスを試す（ツールフォルダ → 直下）
                for (const csvPath of csvPaths) {
                    try {
                        // 404エラーを抑制するため、エラーハンドリングを改善
                        const response = await fetch(csvPath).catch(() => null);
                        if (!response) {
                            continue; // fetchが失敗した場合は次のパスを試す
                        }
                        if (response.status === 404) {
                            continue; // 404エラーの場合は次のパスを試す（エラーを出さない）
                        }
                        if (response.ok) {
                            const arrayBuffer = await response.arrayBuffer();
                            const decoder = new TextDecoder(encoding);
                            const csvText = decoder.decode(arrayBuffer);
                            const data = parseCSV(csvText, csvPath);
                            let schema = inferSchema(data, tableName);
                            
                            // データが空でもヘッダー行からスキーマを推論
                            if (schema.length === 0) {
                                const headers = extractHeadersFromCSV(csvText);
                                if (headers.length > 0) {
                                    schema = inferSchemaFromHeaders(headers, tableName);
                                }
                            }
                            
                            return { tableName, table: { schema, data } };
                        }
                    } catch (e) {
                        lastError = e instanceof Error ? e : new Error(String(e));
                        // 次のパスを試す
                        continue;
                    }
                }
                
                // すべてのパスで失敗した場合
                if (csvPaths.length === 1 || lastError) {
                    console.warn(`CSV file not found for table: ${tableName}. Tried paths: ${csvPaths.join(', ')}. Creating empty table.`);
                    return { tableName, table: { data: [], schema: [] } };
                }
                
                return { tableName, table: { data: [], schema: [] } };
            });

            // 3. tagsテーブルは全メーカー共通とメーカー固有の両方をマージ
            if (tableNames.includes('tags')) {
                const commonTagsPath = 'templates/common/tags.csv';
                let commonTagsData: Row[] = [];
                let commonTagsSchema: Column[] = [];
                
                try {
                    const commonResponse = await fetch(commonTagsPath);
                    if (commonResponse.ok) {
                        const arrayBuffer = await commonResponse.arrayBuffer();
                        const decoder = new TextDecoder(encoding);
                        const csvText = decoder.decode(arrayBuffer);
                        commonTagsData = parseCSV(csvText, commonTagsPath);
                        commonTagsSchema = inferSchema(commonTagsData, 'tags');
                        
                        // データが空でもヘッダー行からスキーマを推論
                        if (commonTagsSchema.length === 0) {
                            const headers = extractHeadersFromCSV(csvText);
                            if (headers.length > 0) {
                                commonTagsSchema = inferSchemaFromHeaders(headers, 'tags');
                            }
                        }
                    }
                } catch (e) {
                    console.debug(`Common tags file not found: ${commonTagsPath}, skipping.`);
                }
                
                // メーカー固有のタグを読み込んでマージ
                const allTagsData = [...commonTagsData];
                let allTagsSchema = commonTagsSchema.length > 0 ? commonTagsSchema : [];
                
                if (manufacturers.length > 0) {
                    for (const manufacturer of manufacturers) {
                        const manufacturerId = manufacturer.id as string;
                        if (!manufacturerId || manufacturerId === 'undefined') continue;
                        
                        // 新しいファイル名ルール: manu_{manufacturerId}_tags.csv (getCsvPathを使用)
                        const manufacturerTagsPaths = getCsvPath('tags', manufacturerId);
                        if (manufacturerTagsPaths.length === 0) continue;
                        const manufacturerTagsPath = manufacturerTagsPaths.find(p => p.includes(`manufacturers/manu_${manufacturerId}`)) || manufacturerTagsPaths[0];
                        try {
                            const manufacturerResponse = await fetch(manufacturerTagsPath);
                            if (manufacturerResponse.ok) {
                                const arrayBuffer = await manufacturerResponse.arrayBuffer();
                                const decoder = new TextDecoder(encoding);
                                const csvText = decoder.decode(arrayBuffer);
                                const manufacturerTagsData = parseCSV(csvText, manufacturerTagsPath);
                                allTagsData.push(...manufacturerTagsData);
                                if (allTagsSchema.length === 0) {
                                    if (manufacturerTagsData.length > 0) {
                                        allTagsSchema = inferSchema(manufacturerTagsData, 'tags');
                                    } else {
                                        // データが空でもヘッダー行からスキーマを推論
                                        const headers = extractHeadersFromCSV(csvText);
                                        if (headers.length > 0) {
                                            allTagsSchema = inferSchemaFromHeaders(headers, 'tags');
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            console.debug(`Manufacturer-specific tags file not found: ${manufacturerTagsPath}, skipping.`);
                        }
                    }
                }
                
                db['tags'] = { schema: allTagsSchema, data: allTagsData };
            }
            
            // 4. メーカー依存テーブルを読み込む（メーカーごとに分離）
            const manufacturerDependentPromises: Promise<{ tableName: string; table: Table } | null>[] = [];
            
            // 特定のメーカーのテーブル（manu_0001_stockなど）が直接リクエストされた場合の処理
            for (const [requestedTableName, { baseTableName, manufacturerId: specificManufacturerId }] of specificManufacturerTables.entries()) {
                const csvPaths = getCsvPath(baseTableName, specificManufacturerId);
                if (csvPaths.length === 0) {
                    console.debug(`No CSV path found for specific manufacturer table: ${requestedTableName}, skipping.`);
                    continue;
                }
                const csvPath = csvPaths[0];
                
                manufacturerDependentPromises.push(
                    (async () => {
                        try {
                            // 404エラーを抑制するため、エラーハンドリングを改善
                            const response = await fetch(csvPath).catch(() => null);
                            if (!response || response.status === 404) {
                                return { tableName: requestedTableName, table: { schema: [], data: [] } };
                            }
                            if (response.ok) {
                                const arrayBuffer = await response.arrayBuffer();
                                const decoder = new TextDecoder(encoding);
                                const csvText = decoder.decode(arrayBuffer);
                                const data = parseCSV(csvText, csvPath);
                                let schema = inferSchema(data, baseTableName);
                                
                                // データが空でもヘッダー行からスキーマを推論
                                if (schema.length === 0) {
                                    const headers = extractHeadersFromCSV(csvText);
                                    if (headers.length > 0) {
                                        schema = inferSchemaFromHeaders(headers, baseTableName);
                                    }
                                }
                                
                                return { tableName: requestedTableName, table: { schema, data } };
                            }
                        } catch (e) {
                            console.debug(`Manufacturer-specific file not found: ${csvPath}, skipping.`);
                        }
                        // ファイルが存在しない場合は空のテーブルを作成
                        return { tableName: requestedTableName, table: { schema: [], data: [] } };
                    })()
                );
            }
            
            // ベーステーブル名（stock, product_detailsなど）がリクエストされた場合のみ、すべてのメーカーのテーブルを読み込む
            // 特定のメーカーテーブル（manu_0001_stockなど）がリクエストされた場合は、上記の処理で既に読み込まれているためスキップ
            for (const tableName of manufacturerDependentTables) {
                // tagsは既に処理済みなのでスキップ
                if (tableName === 'tags') continue;
                
                // ベーステーブル名がリクエストされているかチェック（特定のメーカーテーブル名ではない場合のみ）
                const isBaseTableRequested = tableNames.includes(tableName) && 
                    !Array.from(specificManufacturerTables.keys()).some(tn => {
                        const parsed = parseManufacturerTableName(tn);
                        return parsed.baseTableName === tableName;
                    });
                
                // ベーステーブル名がリクエストされていない場合はスキップ
                if (!isBaseTableRequested) {
                    continue;
                }
                
                if (manufacturers.length === 0) {
                    console.warn(`No manufacturers found. Cannot load manufacturer-dependent table: ${tableName}.`);
                    continue;
                }
                
                // 各メーカーごとにテーブルを読み込む
                for (const manufacturer of manufacturers) {
                    const manufacturerId = manufacturer.id as string;
                    if (!manufacturerId || manufacturerId === 'undefined') {
                        console.warn(`Invalid manufacturer ID found: ${manufacturerId}. Skipping.`);
                        continue;
                    }
                    
                    const manufacturerTableName = getManufacturerTableName(tableName, manufacturerId);
                    // 特定のメーカーのテーブルが既に処理されている場合はスキップ
                    if (specificManufacturerTables.has(manufacturerTableName)) {
                        continue;
                    }
                    
                    // 新しいファイル名ルール: manu_{manufacturerId}_{tableName}.csv (getCsvPathを使用)
                    const csvPaths = getCsvPath(tableName, manufacturerId);
                    if (csvPaths.length === 0) {
                        console.debug(`No CSV path found for manufacturer-dependent table: ${tableName} (manufacturer: ${manufacturerId}), skipping.`);
                        continue;
                    }
                    const csvPath = csvPaths[0]; // 最初のパスを使用
                    
                    manufacturerDependentPromises.push(
                        (async () => {
                            try {
                                // 404エラーを抑制するため、エラーハンドリングを改善
                                const response = await fetch(csvPath).catch(() => null);
                                if (!response || response.status === 404) {
                                    return { tableName: manufacturerTableName, table: { schema: [], data: [] } };
                                }
                        if (response.ok) {
                            const arrayBuffer = await response.arrayBuffer();
                            const decoder = new TextDecoder(encoding);
                            const csvText = decoder.decode(arrayBuffer);
                                    const data = parseCSV(csvText, csvPath);
                                    let schema = inferSchema(data, tableName);
                                    
                                    // データが空でもヘッダー行からスキーマを推論
                                    if (schema.length === 0) {
                                        const headers = extractHeadersFromCSV(csvText);
                                        if (headers.length > 0) {
                                            schema = inferSchemaFromHeaders(headers, tableName);
                                        }
                                    }
                                    
                                    return { tableName: manufacturerTableName, table: { schema, data } };
                        }
                    } catch (e) {
                        // ファイルがない場合はスキップ（エラーを出さない）
                                console.debug(`Manufacturer-specific file not found: ${csvPath}, skipping.`);
                    }
                            // ファイルが存在しない場合は空のテーブルを作成
                            return { tableName: manufacturerTableName, table: { schema: [], data: [] } };
                        })()
                    );
                }
            }

            // すべてのプロミスを実行
            const allPromises = [...independentPromises, ...manufacturerDependentPromises];
            const results = await Promise.all(allPromises);
            results.forEach(result => {
                if (result) {
                    db[result.tableName] = result.table;
                }
            });
            return db;
        }
    } catch (error) {
        console.error(`Failed to fetch tables: ${tableNames.join(',')}`, error);
        throw error;
    }
};


/**
 * Loads the initial database from the live API or CSV files.
 * @param {'live' | 'csv-debug'} mode - The mode to load the database in.
 * @returns {Promise<Partial<Database>>} A promise that resolves to the database object.
 */
export const loadLiveOrMockDatabase = async (mode: AppMode): Promise<Partial<Database>> => {
    // This function will now be the authority on what mode is used for the initial fetch.
    setStoredAppMode(mode);
    
    try {
        const initialTables = getInitialTables();

        // 'live' or 'csv-debug' modes use fetchTables for consistency
        console.log(`[loadLiveOrMockDatabase] Fetching initial tables in ${mode} mode:`, initialTables);
        try {
            return await fetchTables(initialTables);
        } catch (fetchError) {
            console.error('[loadLiveOrMockDatabase] Error from fetchTables:', fetchError);
            throw fetchError;
        }

    } catch (error) {
        // Handle JSON parse errors
        if (error instanceof SyntaxError || (error instanceof Error && error.message.includes('JSON'))) {
            console.error('JSON parse error occurred');
            console.error('Error details:', error);
            
            // Check if the error is from fetchTables or from somewhere else
            if (error instanceof Error && error.message.includes('API endpoint')) {
                // This error is from fetchTables, it already has detailed info
                console.error('Error from fetchTables:', error.message);
            } else {
                // Try to fetch the actual response to see what was returned
                try {
                    const initialTables = getInitialTables();
                    const response = await fetch(`/api/app-initialization-data.php?tables=${initialTables.join(',')}`);
                    const responseText = await response.text();
                    const contentType = response.headers.get('content-type');
                    console.error('=== Response Details ===');
                    console.error(`Content-Type: ${contentType}`);
                    console.error(`Response Length: ${responseText.length} characters`);
                    console.error(`Response Preview (first 2000 chars):`, responseText.substring(0, 2000));
                    console.error(`Response End (last 500 chars):`, responseText.substring(Math.max(0, responseText.length - 500)));
                    console.error('=== End of Response Details ===');
                } catch (fetchError) {
                    console.error('Failed to fetch error details:', fetchError);
                }
            }
            
            // Auto-fallback to csv-debug mode if we get HTML instead of JSON
            const currentMode = getStoredAppMode();
            if (currentMode === 'live') {
                console.warn('Received invalid JSON response. Auto-switching to csv-debug mode.');
                setStoredAppMode('csv-debug');
                // Retry with csv-debug mode
                const initialTables = getInitialTables();
                return await fetchTables(initialTables, { toolName: undefined }); // Will use csv-debug
            }
        }
        
        // The fallback to CSV is handled inside fetchTables on a 404.
        // If an error reaches here, it's a genuine failure.
        throw error;
    }
};
import { Button, CheckIcon, Input, Select, SpinnerIcon, UploadIcon, XMarkIcon } from '@components/atoms';
import { getManufacturerTableName } from '@core/config/tableNames';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { useNavigation } from '@core/contexts/NavigationContext';
import { fetchTables } from '@core/data/db.live';
import { updateDatabase } from '@core/utils';
import { getStoredAppMode, isCsvWritableMode } from '@core/utils/appMode';
import { saveTableToCsv } from '@core/utils/csvSaveHelper';
import { Column, Row } from '@shared/types';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseCsvInWorker } from '../services/workerService';

interface ImportResult {
    success: boolean;
    message: string;
    summary: {
        totalRows: number;
        updatedStock: number;
        newItems?: number;
        skippedUnchanged?: number;  // 変更がなくスキップされたレコード数
        newProducts?: number;
        newColors?: number;
        newSizes?: number;
        errors: string[];
    }
}

const StockImporter: React.FC = () => {
    const { database, setDatabase } = useDatabase();
    const { currentPage } = useNavigation();
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [step, setStep] = useState(1);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvData, setCsvData] = useState<Row[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [encoding, setEncoding] = useState('Shift-JIS');
    const [selectedManufacturerId, setSelectedManufacturerId] = useState<string>('');
    const [presetName, setPresetName] = useState('');
    const [validationResult, setValidationResult] = useState<any>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [debugMode, setDebugMode] = useState(false);
    // インポート動作の設定
    const [skipValidationErrors, setSkipValidationErrors] = useState(false); // 検証エラーがあっても続行
    const [skipErrorRows, setSkipErrorRows] = useState(true); // エラー行を自動スキップ（デフォルト: true）
    const [updateProductName, setUpdateProductName] = useState(false); // 商品名を更新（既存のproduct_detailsも更新）
    const [updateStockQuantity, setUpdateStockQuantity] = useState(true); // 在庫数を更新（デフォルト: true）
    // 品番ごとの設定
    const [productSettings, setProductSettings] = useState<Record<string, { category_id?: string; is_published?: boolean; brand_id?: string }>>({});
    const [bulkCategoryId, setBulkCategoryId] = useState<string>('');
    const [bulkIsPublished, setBulkIsPublished] = useState<boolean>(false);
    const [expandedProductCodes, setExpandedProductCodes] = useState<Set<string>>(new Set());
    const loadingRef = useRef(false);
    const loadedTablesRef = useRef<Set<string>>(new Set());
    
    useEffect(() => {
        const loadRequiredData = async () => {
            if (!database) {
                setIsLoadingData(true);
                return;
            }
            
            // 既に読み込み中の場合はスキップ
            if (loadingRef.current) {
                return;
            }
            
            // まずmanufacturersを読み込む（importer_mappingsはメーカー依存テーブルのため）
            const requiredTables = ['manufacturers', 'categories'];
            const hasManufacturers = database.manufacturers?.data && Array.isArray(database.manufacturers.data) && database.manufacturers.data.length > 0;
            
            // 必要なテーブルが既にすべて読み込まれている場合はスキップ
            const allTablesLoaded = requiredTables.every(t => {
                if (loadedTablesRef.current.has(t)) return true;
                if (database[t]) {
                    loadedTablesRef.current.add(t);
                    return true;
                }
                return false;
            });
            
            if (!allTablesLoaded) {
                const missingTables = requiredTables.filter(t => !loadedTablesRef.current.has(t) && !database[t]);
                if (missingTables.length > 0) {
                    loadingRef.current = true;
                    setIsLoadingData(true);
                    try {
                        const fetchedData = await fetchTables(missingTables, { toolName: 'data-io' });
                        Object.keys(fetchedData || {}).forEach(table => {
                            loadedTablesRef.current.add(table);
                        });
                        setDatabase(prev => ({ ...(prev || {}), ...fetchedData }));
                    } catch (err) {
                        missingTables.forEach(t => loadedTablesRef.current.add(t));
                        setError(err instanceof Error ? err.message : '必要なデータの読み込みに失敗しました。');
                    } finally {
                        loadingRef.current = false;
                    }
                }
            }
            
            // manufacturersが読み込まれたら、全メーカーのimporter_mappingsを読み込む
            const currentManufacturers = database.manufacturers?.data || [];
            if (Array.isArray(currentManufacturers) && currentManufacturers.length > 0 && !loadedTablesRef.current.has('importer_mappings')) {
                loadingRef.current = true;
                setIsLoadingData(true);
                try {
                    // 全メーカーのimporter_mappingsテーブル名を構築
                    const importerMappingTables = currentManufacturers.map((m: Row) => {
                        const manufacturerId = String(m.id || '');
                        return getManufacturerTableName('importer_mappings', manufacturerId);
                    });
                    
                    // 全メーカーのimporter_mappingsを読み込む
                    const fetchedMappings = await fetchTables(importerMappingTables, { toolName: 'data-io' });
                    
                    // 全メーカーのデータを統合
                    const allMappings: Row[] = [];
                    let schema: Column[] = [];
                    
                    importerMappingTables.forEach(tableName => {
                        if (fetchedMappings?.[tableName]?.data) {
                            const tableData = fetchedMappings[tableName].data;
                            if (Array.isArray(tableData)) {
                                allMappings.push(...tableData);
                            }
                            if (!schema.length && fetchedMappings[tableName].schema) {
                                schema = fetchedMappings[tableName].schema;
                            }
                        }
                    });
                    
                    // importer_mappingsを統合テーブルとして保存
                    setDatabase(prev => ({
                        ...(prev || {}),
                        importer_mappings: {
                            schema: schema,
                            data: allMappings
                        }
                    }));
                    
                    loadedTablesRef.current.add('importer_mappings');
                } catch (err) {
                    // エラーが発生した場合は空テーブルとして作成（404エラーは正常な動作）
                    console.warn('[StockImporter] Failed to load importer_mappings, using empty table:', err);
                    setDatabase(prev => ({
                        ...(prev || {}),
                        importer_mappings: { schema: [], data: [] }
                    }));
                    loadedTablesRef.current.add('importer_mappings');
                } finally {
                    setIsLoadingData(false);
                    loadingRef.current = false;
                }
            } else if (loadedTablesRef.current.has('importer_mappings')) {
                setIsLoadingData(false);
            } else if (!hasManufacturers) {
                // manufacturersがまだ読み込まれていない場合は、読み込み完了を待つ
                setIsLoadingData(false);
            }
        };
        loadRequiredData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [database]);
    
    const brandsLoadingRef = useRef(false);
    const loadedBrandsRef = useRef<Set<string>>(new Set());
    
    // brandsテーブルを読み込む（共通テーブル）
    useEffect(() => {
        const loadBrands = async () => {
            if (!database) return;
            
            // 既に読み込み中の場合はスキップ
            if (brandsLoadingRef.current) {
                return;
            }
            
            // brandsは共通テーブル（templates/common/brands.csv）から取得
            if (database.brands) {
                return;
            }
            
            brandsLoadingRef.current = true;
            try {
                const fetchedData = await fetchTables(['brands'], { toolName: 'data-io' });
                setDatabase(prev => ({ ...(prev || {}), ...fetchedData }));
            } catch (err) {
                console.warn('ブランドデータの読み込みに失敗しました:', err);
            } finally {
                brandsLoadingRef.current = false;
            }
        };
        loadBrands();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [database]);

    const TARGET_FIELDS = [
        { id: 'product_code', name: '品番/商品コード', required: true },
        { id: 'product_name', name: '商品名', required: false },
        { id: 'color_code', name: 'カラーコード', required: true },
        { id: 'color_name', name: 'カラー名', required: false },
        { id: 'size_code', name: 'サイズコード', required: true },
        { id: 'size_name', name: 'サイズ名', required: false },
        { id: 'jan_code', name: 'JANコード', required: false },
        { id: 'stock_quantity', name: '在庫数', required: false },
        { id: 'incoming_quantity_1', name: '入荷予定数1', required: false },
        { id: 'incoming_date_1', name: '入荷予定日1', required: false },
        { id: 'incoming_quantity_2', name: '入荷予定数2', required: false },
        { id: 'incoming_date_2', name: '入荷予定日2', required: false },
        { id: 'incoming_quantity_3', name: '入荷予定数3', required: false },
        { id: 'incoming_date_3', name: '入荷予定日3', required: false },
        { id: 'list_price', name: '上代/リスト価格', required: false },
    ];
    
    const importerMappings = useMemo(() => database?.importer_mappings?.data || [], [database?.importer_mappings]);

    // CSV項目構造の自動検出
    const detectCsvStructure = useCallback((headers: string[]): Record<string, string> => {
        const detectedMapping: Record<string, string> = {};
        const headerLower = headers.map(h => h.toLowerCase());
        
        // よくある列名のパターンを検出
        const patterns: Record<string, string[]> = {
            'product_code': ['商品コード', '品番', 'product_code', 'productcode', 'code', '商品code'],
            'product_name': ['商品名', 'product_name', 'productname', 'name', '商品名'],
            'color_code': ['カラーコード', 'color_code', 'colorcode', '色コード', '色code'],
            'color_name': ['カラー名', 'color_name', 'colorname', '色名'],
            'size_code': ['サイズコード', 'size_code', 'sizecode', 'サイズcode'],
            'size_name': ['サイズ名', 'size_name', 'sizename', 'サイズ'],
            'stock_quantity': ['在庫数', 'stock_quantity', 'stockquantity', '在庫', 'quantity', '数量'],
            'incoming_quantity_1': ['入荷予定数1', 'incoming_quantity_1', 'incomingquantity1', '入荷予定数', '入荷数', 'incoming_quantity'],
            'incoming_date_1': ['入荷予定日1', 'incoming_date_1', 'incomingdate1', '入荷予定日', '入荷日', 'arrival_date', 'incoming_date'],
            'incoming_quantity_2': ['入荷予定数2', 'incoming_quantity_2', 'incomingquantity2'],
            'incoming_date_2': ['入荷予定日2', 'incoming_date_2', 'incomingdate2'],
            'incoming_quantity_3': ['入荷予定数3', 'incoming_quantity_3', 'incomingquantity3'],
            'incoming_date_3': ['入荷予定日3', 'incoming_date_3', 'incomingdate3'],
            'list_price': ['上代', 'list_price', 'listprice', '価格', 'price', 'retail_price'],
            'cost_price': ['仕入れ値', 'cost_price', 'costprice', '仕入価格', 'purchase_price', '仕入'],
            'jan_code': ['janコード', 'jan_code', 'jancode', 'jan', 'barcode'],
        };
        
        Object.entries(patterns).forEach(([fieldId, patterns]) => {
            for (const pattern of patterns) {
                const index = headerLower.findIndex(h => h.includes(pattern.toLowerCase()));
                if (index >= 0) {
                    detectedMapping[fieldId] = headers[index];
                    break;
                }
            }
        });
        
        return detectedMapping;
    }, []);

    // 品番ごとにグループ化
    const groupedByProductCode = useMemo(() => {
        if (!csvData.length || !mapping.product_code) return {};
        const grouped: Record<string, Row[]> = {};
        csvData.forEach((row, index) => {
            const productCode = row[mapping.product_code] as string;
            if (productCode) {
                if (!grouped[productCode]) {
                    grouped[productCode] = [];
                }
                grouped[productCode].push({ ...row, _rowIndex: index });
            }
        });
        return grouped;
    }, [csvData, mapping.product_code]);
    
    const productCodes = useMemo(() => Object.keys(groupedByProductCode).sort(), [groupedByProductCode]);
    
    // categoriesとbrandsのデータを取得
    const categories = useMemo(() => database?.categories?.data || [], [database?.categories]);
    const brands = useMemo(() => {
        if (!selectedManufacturerId || !database) return [];
        // brandsは共通テーブル（templates/common/brands.csv）から取得
        const allBrands = database.brands?.data || [];
        return allBrands.filter((b: Row) => String(b.manufacturer_id || '') === selectedManufacturerId);
    }, [database, selectedManufacturerId]);
    
    // 一括設定を適用
    const applyBulkSettings = useCallback(() => {
        const newSettings = { ...productSettings };
        productCodes.forEach(productCode => {
            if (!newSettings[productCode]) {
                newSettings[productCode] = {};
            }
            if (bulkCategoryId) {
                newSettings[productCode].category_id = bulkCategoryId;
            }
            newSettings[productCode].is_published = bulkIsPublished;
        });
        setProductSettings(newSettings);
    }, [productCodes, bulkCategoryId, bulkIsPublished, productSettings]);
    
    const toggleProductCode = useCallback((productCode: string) => {
        setExpandedProductCodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(productCode)) {
                newSet.delete(productCode);
            } else {
                newSet.add(productCode);
            }
            return newSet;
        });
    }, []);

    const resetState = () => {
        setStep(1); setCsvFile(null); setCsvHeaders([]); setCsvData([]); setMapping({});
        setError(null); setIsLoading(false); setImportResult(null); setSelectedManufacturerId('');
        setPresetName('');
        setProductSettings({});
        setBulkCategoryId('');
        setBulkIsPublished(false);
        setExpandedProductCodes(new Set());
    };
    
    const handleManufacturerChange = (manufacturerId: string) => {
        setSelectedManufacturerId(manufacturerId);
        const savedMapping = importerMappings.find(m => m.manufacturer_id === manufacturerId);
        if (savedMapping) {
            setMapping(JSON.parse(savedMapping.mapping_json as string));
            setPresetName(savedMapping.name as string);
        } else {
            setMapping({});
            setPresetName('');
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCsvFile(file); setError(null); setImportResult(null); setIsLoading(true);
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const arrayBuffer = event.target?.result as ArrayBuffer;
                    if (!arrayBuffer) throw new Error("ファイルの読み込みに失敗しました。");
                    const decoder = new TextDecoder(encoding);
                    const text = decoder.decode(arrayBuffer);
                    const data = await parseCsvInWorker(text, file.name);
                    if (data.length === 0) throw new Error('CSVファイルが空か、ヘッダー行しかありません。');
                    const headers = Object.keys(data[0]);
                    setCsvData(data); 
                    setCsvHeaders(headers);
                    
                    // CSV項目構造の自動検出
                    const detectedMapping = detectCsvStructure(headers);
                    setMapping(detectedMapping);
                    
                    setStep(2);
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'CSVの解析に失敗しました。');
                } finally { setIsLoading(false); }
            };
            reader.readAsArrayBuffer(file);
        }
    };
    
    const handleValidate = async () => {
        if (!selectedManufacturerId || !isMappingComplete) {
            alert('メーカーとマッピングを設定してください。');
            return;
        }
        
        setIsValidating(true); setError(null);
        try {
            const response = await fetch('/api/validate-stock-data.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    manufacturerId: selectedManufacturerId, 
                    mapping, 
                    data: csvData, 
                })
            });
            if (!response.ok) throw new Error(`サーバーエラー: ${response.statusText}`);
            const result = await response.json();
            setValidationResult(result);
            setShowPreview(true);
            if (!result.success) {
                setError('データ検証で問題が検出されました。詳細を確認してください。');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'データ検証に失敗しました。');
        } finally { setIsValidating(false); }
    };
    
    const handleImport = async () => {
        if (!csvFile) {
            setError('CSVファイルが選択されていません。');
            return;
        }
        
        setIsLoading(true); setError(null); setImportResult(null);
        try {
            // FormDataを使用してファイルを直接送信（ブラウザの干渉を避ける）
            const formData = new FormData();
            formData.append('csv_file', csvFile);
            formData.append('manufacturerId', selectedManufacturerId || '');
            formData.append('mapping', JSON.stringify(mapping));
            formData.append('encoding', encoding);
            formData.append('debug', debugMode ? 'true' : 'false');
            formData.append('skipValidationErrors', skipValidationErrors ? 'true' : 'false');
            formData.append('skipErrorRows', skipErrorRows ? 'true' : 'false');
            formData.append('updateProductName', updateProductName ? 'true' : 'false');
            formData.append('updateStockQuantity', updateStockQuantity ? 'true' : 'false');
            formData.append('productSettings', JSON.stringify(productSettings));
            // アプリケーションモードを追加（CSV書き込みモードの判定用）
            const appMode = getStoredAppMode();
            formData.append('appMode', appMode);
            
            // CSV書き込みモードの場合は専用のAPIエンドポイントを使用
            const apiEndpoint = isCsvWritableMode(appMode) 
                ? '/api/import-stock-csv.php' 
                : '/api/import-stock.php';
            
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                // エラーレスポンスの詳細を取得
                let errorMessage = `サーバーエラー: ${response.status} ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorData.error || errorMessage;
                } catch (e) {
                    // JSONパースに失敗した場合は、テキストとして取得を試みる
                    try {
                        const errorText = await response.text();
                        if (errorText) {
                            errorMessage = errorText;
                        }
                    } catch (e2) {
                        // テキスト取得にも失敗した場合は、デフォルトメッセージを使用
                    }
                }
                throw new Error(errorMessage);
            }
            const result: ImportResult = await response.json();
            setImportResult(result); setStep(3);
            if (result.success) {
                // 在庫テーブルと関連テーブルを再読み込み（メーカーごとのテーブル名を動的に生成）
                // 注意: colors_manu_*とsizes_manu_*は削除（stockテーブルから直接取得）
                // 注意: products_masterは削除（stockテーブルに統合）
                const tableNames = [
                    `stock_${selectedManufacturerId}`,
                    `product_details_${selectedManufacturerId}`
                ];
                try {
                    const updatedTables = await fetchTables(tableNames, { toolName: 'data-io' });
                    setDatabase(db => ({ ...(db || {}), ...updatedTables }));
                } catch (err) {
                    console.warn('テーブルの再読み込みに失敗しました:', err);
                }
            } else { 
                setError(result.message || 'インポート中にエラーが発生しました。'); 
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'インポート処理に失敗しました。');
            setStep(2);
        } finally { setIsLoading(false); }
    };

    const handleSaveMapping = async () => {
        if (!selectedManufacturerId || !presetName) {
            alert('メーカーとプリセット名を選択・入力してください。');
            return;
        }
        
        // CSV項目構造を保存（csv_structure_json）
        const csvStructure = {
            headers: csvHeaders,
            sampleRow: csvData[0] || {}
        };
        
        try {
            // データベースから最新のimporter_mappingsデータを再読み込み（重複チェックのため）
            const latestMappingsData = await fetchTables(['importer_mappings'], { toolName: 'data-io' });
            if (latestMappingsData?.importer_mappings?.data) {
                setDatabase(prev => ({ ...prev, ...latestMappingsData }));
            }
            
            // 最新のデータから既存のマッピングを検索
            const latestMappings = latestMappingsData?.importer_mappings?.data || database?.importer_mappings?.data || [];
            const existingMapping = latestMappings.find((m: Row) => 
                String(m.manufacturer_id) === String(selectedManufacturerId) && 
                String(m.name) === String(presetName)
            );
            
            const mappingData = {
                id: existingMapping?.id || `map_${Date.now()}`,
                manufacturer_id: selectedManufacturerId,
                name: presetName,
                mapping_json: JSON.stringify(mapping),
                csv_structure_json: JSON.stringify(csvStructure)
            };
            
            // 既存のマッピングがある場合はUPDATE、ない場合はINSERT
            const operation = existingMapping 
                ? [{ type: 'UPDATE' as const, data: mappingData, where: { id: existingMapping.id } }]
                : [{ type: 'INSERT' as const, data: mappingData }];
            
            // AppMode分岐: csv-writableモードの場合はCSVに直接保存
            const appMode = getStoredAppMode();
            let result;
            if (isCsvWritableMode(appMode)) {
                // CSVモード: setDatabaseで更新し、saveTableToCsvで保存
                const updatedMappings = existingMapping
                    ? (database?.importer_mappings?.data || []).map((m: Row) =>
                        m.id === existingMapping.id ? mappingData : m
                    )
                    : [...(database?.importer_mappings?.data || []), mappingData];
                
                setDatabase(prev => ({
                    ...prev,
                    importer_mappings: {
                        ...prev?.importer_mappings,
                        data: updatedMappings,
                        schema: prev?.importer_mappings?.schema || []
                    }
                }));
                
                const saved = await saveTableToCsv('importer_mappings', {
                    data: updatedMappings,
                    schema: database?.importer_mappings?.schema || []
                });
                
                result = { success: saved };
            } else {
                // Liveモード: 既存のAPIを使用
                result = await updateDatabase(currentPage, 'importer_mappings', operation, database);
            }
            
            if (!result.success) {
                // CSVモードの場合はエラーメッセージを表示して終了
                if (isCsvWritableMode(appMode)) {
                    throw new Error(result.error || 'マッピングの保存に失敗しました。');
                }
                
                // Liveモード: ユニークキー制約違反の場合は、UPDATE操作にフォールバック
                if (result.error?.includes('Duplicate entry') || result.error?.includes('unique_mapping')) {
                    // 既存のマッピングが見つからなかった場合でも、ユニークキー制約違反が発生したということは
                    // データベースに既に存在している可能性が高いため、再度検索してUPDATE操作を試行
                    if (!existingMapping) {
                        // データベースから最新のデータを再読み込み
                        const retryMappingsData = await fetchTables(['importer_mappings'], { toolName: 'data-io' });
                        const retryMappings = retryMappingsData?.importer_mappings?.data || [];
                        const retryExisting = retryMappings.find((m: Row) => 
                            String(m.manufacturer_id) === String(selectedManufacturerId) && 
                            String(m.name) === String(presetName)
                        );
                        
                        if (retryExisting) {
                            // UPDATE操作を再試行
                            const updateOperation = [{ 
                                type: 'UPDATE' as const, 
                                data: { ...mappingData, id: retryExisting.id }, 
                                where: { id: retryExisting.id } 
                            }];
                            const updateResult = await updateDatabase(currentPage, 'importer_mappings', updateOperation, database);
                            if (!updateResult.success) {
                                throw new Error(updateResult.error || 'マッピングの更新に失敗しました。');
                            }
                        } else {
                            throw new Error('既存のマッピングが見つかりませんでした。別の名前を試してください。');
                        }
                    } else {
                        throw new Error(result.error || 'マッピングの更新に失敗しました。');
                    }
                } else {
                    throw new Error(result.error || 'マッピングの保存に失敗しました。');
                }
            }
            
            // データベースから最新のデータを再読み込み
            const refreshedMappingsData = await fetchTables(['importer_mappings'], { toolName: 'data-io' });
            if (refreshedMappingsData?.importer_mappings) {
                setDatabase(prev => ({ ...prev, ...refreshedMappingsData }));
            }
            
            alert('マッピングを保存しました。');
        } catch (err) {
            console.error('マッピング保存エラー:', err);
            alert('マッピングの保存に失敗しました: ' + (err instanceof Error ? err.message : String(err)));
        }
    };

    const isMappingComplete = useMemo(() => {
        const requiredFields = TARGET_FIELDS.filter(f => f.required);
        return requiredFields.every(field => !!mapping[field.id]);
    }, [mapping, TARGET_FIELDS]);

    if (isLoadingData) {
        return <div className="flex justify-center items-center p-8"><SpinnerIcon className="w-8 h-8"/></div>
    }

    return (
        <div className="bg-container-bg dark:bg-container-bg-dark p-6 rounded-lg shadow-md">
            {error && <div className="mb-4 p-3 rounded-md text-sm bg-red-100 text-red-800"><XMarkIcon className="w-5 h-5 inline mr-2"/>{error}</div>}
            
            {step === 1 && (
                 <div className="space-y-4">
                    <div>
                        <label htmlFor="stock-import-manufacturer-select" className="block text-sm font-medium mb-1">1. メーカーを指定 (必須)</label>
                        <Select id="stock-import-manufacturer-select" name="manufacturer_id" value={selectedManufacturerId} onChange={e => handleManufacturerChange(e.target.value)}>
                            <option value="">メーカーを選択...</option>
                            {database?.manufacturers?.data?.map((m: Row) => (
                                <option key={m.id as string} value={m.id as string}>{m.name as string}</option>
                            ))}
                        </Select>
                         <p className="text-xs text-gray-500 mt-1">メーカーを指定すると、保存されたマッピング設定が自動で読み込まれます。</p>
                    </div>
                    <div>
                        <label htmlFor="stock-import-encoding-select" className="block text-sm font-medium mb-1">2. ファイルの文字コード</label>
                        <Select id="stock-import-encoding-select" name="encoding" value={encoding} onChange={e => setEncoding(e.target.value)}>
                            <option value="Shift-JIS">Shift_JIS (Windows標準)</option>
                            <option value="UTF-8">UTF-8</option>
                        </Select>
                    </div>
                    <div>
                        <label htmlFor="stock-import-file-input" className="block text-sm font-medium mb-1">3. 在庫リストCSVをアップロード</label>
                        <Input id="stock-import-file-input" name="stock_import_file" type="file" accept=".csv" onChange={handleFileChange} disabled={isLoading} />
                    </div>
                     {isLoading && <div className="text-center"><SpinnerIcon className="w-8 h-8 mx-auto" /><p>ファイルを解析中...</p></div>}
                </div>
            )}
            
            {step === 2 && (
                <div>
                    <h3 className="text-lg font-bold mb-4">ステップ2: CSVの列をマッピング</h3>
                    <p className="text-sm text-gray-600 mb-4">自動検出されたマッピングを確認・修正してください。</p>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {TARGET_FIELDS.map(field => {
                            const selectId = `stock-import-field-${field.id}`;
                            return (
                                <div key={field.id} className="grid grid-cols-2 gap-4 items-center">
                                    <label htmlFor={selectId} className="font-semibold text-sm">{field.name} {field.required && <span className="text-red-500">*</span>}</label>
                                    <Select id={selectId} name={field.id} onChange={e => setMapping(prev => ({ ...prev, [field.id]: e.target.value }))} value={mapping[field.id] || ''}>
                                        <option value="">CSV列を選択...</option>
                                        {csvHeaders.map(header => <option key={header} value={header}>{header}</option>)}
                                    </Select>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                        <h4 className="font-semibold mb-2">マッピング設定を保存</h4>
                        <div className="flex gap-2">
                            <label htmlFor="stock-import-preset-name-input" className="sr-only">プリセット名</label>
                            <Input id="stock-import-preset-name-input" name="preset_name" type="text" value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="プリセット名 (例: United Athle 在庫)" />
                            <Button onClick={handleSaveMapping} disabled={!selectedManufacturerId || !presetName}>保存</Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">保存すると、次回同じメーカーのCSVをインポートする際に自動でマッピングが読み込まれます。</p>
                    </div>
                    
                    {/* 品番ごとの設定 */}
                    {isMappingComplete && productCodes.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                            <h4 className="font-semibold mb-3">品番ごとの設定</h4>
                            
                            {/* 一括設定 */}
                            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <h5 className="text-sm font-semibold mb-2">一括設定</h5>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="bulk-category-select" className="block text-xs font-medium mb-1">カテゴリ（一括）</label>
                                        <Select 
                                            id="bulk-category-select" 
                                            value={bulkCategoryId} 
                                            onChange={e => setBulkCategoryId(e.target.value)}
                                        >
                                            <option value="">選択しない</option>
                                            {categories.map((cat: Row) => (
                                                <option key={cat.id} value={cat.id as string}>{cat.name as string}</option>
                                            ))}
                                        </Select>
                                    </div>
                                    <div>
                                        <label htmlFor="bulk-published-checkbox" className="block text-xs font-medium mb-1">公開状態（一括）</label>
                                        <label className="flex items-center gap-2 p-2 bg-white dark:bg-gray-700 rounded cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                id="bulk-published-checkbox"
                                                checked={bulkIsPublished} 
                                                onChange={e => setBulkIsPublished(e.target.checked)} 
                                                className="rounded w-4 h-4" 
                                            />
                                            <span className="text-sm">公開する</span>
                                        </label>
                                    </div>
                                </div>
                                <Button 
                                    onClick={applyBulkSettings} 
                                    variant="secondary" 
                                    className="mt-2 text-xs"
                                    disabled={!bulkCategoryId && !bulkIsPublished}
                                >
                                    一括設定を適用
                                </Button>
                            </div>
                            
                            {/* 品番ごとのリスト */}
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {productCodes.map(productCode => {
                                    const rows = groupedByProductCode[productCode];
                                    const isExpanded = expandedProductCodes.has(productCode);
                                    const settings = productSettings[productCode] || {};
                                    
                                    return (
                                        <div key={productCode} className="border rounded-lg">
                                            <button
                                                type="button"
                                                onClick={() => toggleProductCode(productCode)}
                                                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-semibold">{productCode}</span>
                                                    <span className="text-xs text-gray-500">({rows.length}行)</span>
                                                </div>
                                                <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                                            </button>
                                            
                                            {isExpanded && (
                                                <div className="p-3 space-y-3">
                                                    {/* 個別設定 */}
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div>
                                                            <label htmlFor={`category-${productCode}`} className="block text-xs font-medium mb-1">カテゴリ</label>
                                                            <Select 
                                                                id={`category-${productCode}`}
                                                                value={settings.category_id || ''} 
                                                                onChange={e => setProductSettings(prev => ({
                                                                    ...prev,
                                                                    [productCode]: { ...prev[productCode], category_id: e.target.value }
                                                                }))}
                                                            >
                                                                <option value="">選択しない</option>
                                                                {categories.map((cat: Row) => (
                                                                    <option key={cat.id} value={cat.id as string}>{cat.name as string}</option>
                                                                ))}
                                                            </Select>
                                                        </div>
                                                        <div>
                                                            <label htmlFor={`published-${productCode}`} className="block text-xs font-medium mb-1">公開状態</label>
                                                            <label className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded cursor-pointer">
                                                                <input 
                                                                    type="checkbox" 
                                                                    id={`published-${productCode}`}
                                                                    checked={settings.is_published || false} 
                                                                    onChange={e => setProductSettings(prev => ({
                                                                        ...prev,
                                                                        [productCode]: { ...prev[productCode], is_published: e.target.checked }
                                                                    }))} 
                                                                    className="rounded w-4 h-4" 
                                                                />
                                                                <span className="text-xs">公開</span>
                                                            </label>
                                                        </div>
                                                        <div>
                                                            <label htmlFor={`brand-${productCode}`} className="block text-xs font-medium mb-1">ブランド</label>
                                                            <Select 
                                                                id={`brand-${productCode}`}
                                                                value={settings.brand_id || ''} 
                                                                onChange={e => setProductSettings(prev => ({
                                                                    ...prev,
                                                                    [productCode]: { ...prev[productCode], brand_id: e.target.value }
                                                                }))}
                                                            >
                                                                <option value="">選択しない</option>
                                                                {brands.map(brand => (
                                                                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                                                                ))}
                                                            </Select>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* 行の詳細（折りたたみ可能） */}
                                                    <details className="text-xs">
                                                        <summary className="cursor-pointer text-gray-600 dark:text-gray-400">行の詳細を表示</summary>
                                                        <div className="mt-2 overflow-x-auto">
                                                            <table className="w-full text-xs border-collapse">
                                                                <thead>
                                                                    <tr className="bg-gray-100 dark:bg-gray-700">
                                                                        {csvHeaders.map(header => (
                                                                            <th key={header} className="border p-1 text-left">{header}</th>
                                                                        ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {rows.map((row, idx) => (
                                                                        <tr key={idx} className="border">
                                                                            {csvHeaders.map(header => (
                                                                                <td key={header} className="border p-1">{String(row[header] || '')}</td>
                                                                            ))}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </details>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    
                    {/* デバッグモード */}
                    <div className="mt-4 pt-4 border-t">
                        <h4 className="font-semibold mb-2 text-sm">🔧 デバッグ設定</h4>
                        <label className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                            <input 
                                type="checkbox" 
                                checked={debugMode} 
                                onChange={e => setDebugMode(e.target.checked)} 
                                className="rounded w-4 h-4" 
                            />
                            <div className="flex-1">
                                <span className="text-sm font-medium">デバッグモードを有効にする</span>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    インポート時に詳細なログを記録します。エラー原因を特定したい場合に有効化してください。
                                </p>
                            </div>
                        </label>
                    </div>
                    
                    {/* データ検証とプレビュー */}
                    {showPreview && validationResult && (
                        <div className="mt-4 pt-4 border-t">
                            <h4 className="font-semibold mb-2">データ検証結果</h4>
                            <div className={`p-3 rounded-md text-sm ${validationResult.success ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'}`}>
                                <p className="font-semibold mb-2">
                                    {validationResult.success ? '✓ 検証成功' : '⚠ 問題が検出されました'}
                                </p>
                                {validationResult.summary && (
                                    <ul className="list-disc list-inside text-xs space-y-1">
                                        <li>総行数: {validationResult.summary.total_rows}</li>
                                        <li>有効行: {validationResult.summary.valid_rows}</li>
                                        <li>無効行: {validationResult.summary.invalid_rows}</li>
                                        {validationResult.summary.duplicate_skus_count > 0 && (
                                            <li className="text-red-600">重複SKU: {validationResult.summary.duplicate_skus_count}件</li>
                                        )}
                                        {validationResult.summary.data_quality_issues_count > 0 && (
                                            <li className="text-orange-600">データ品質問題: {validationResult.summary.data_quality_issues_count}件</li>
                                        )}
                                    </ul>
                                )}
                                
                                {/* エラーがある場合のみインポート動作設定を表示 */}
                                {!validationResult.success && (
                                    <div className="mt-4 pt-3 border-t border-yellow-300 dark:border-yellow-700">
                                        <h5 className="text-xs font-semibold mb-2 text-yellow-700 dark:text-yellow-300">
                                            ⚙️ インポート動作設定
                                        </h5>
                                        <div className="space-y-2">
                                            <label className="flex items-start gap-2 p-2 bg-white dark:bg-gray-700 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600">
                                                <input 
                                                    type="checkbox" 
                                                    checked={skipValidationErrors} 
                                                    onChange={e => setSkipValidationErrors(e.target.checked)} 
                                                    className="rounded w-4 h-4 mt-0.5 flex-shrink-0" 
                                                />
                                                <div className="flex-1">
                                                    <span className="text-xs font-medium">検証エラーがあってもインポートを続行</span>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                                        検証でエラーが検出されても、エラー行をスキップして有効な行のみインポートします。
                                                    </p>
                                                </div>
                                            </label>
                                            
                                            <label className="flex items-start gap-2 p-2 bg-white dark:bg-gray-700 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600">
                                                <input 
                                                    type="checkbox" 
                                                    checked={skipErrorRows} 
                                                    onChange={e => setSkipErrorRows(e.target.checked)} 
                                                    className="rounded w-4 h-4 mt-0.5 flex-shrink-0" 
                                                />
                                                <div className="flex-1">
                                                    <span className="text-xs font-medium">エラー行を自動スキップ</span>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                                        インポート処理中にエラーが発生した行を自動的にスキップして続行します（推奨: 有効）。
                                                    </p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                )}
                                
                                {/* 更新オプション */}
                                <div className="mt-4 pt-3 border-t">
                                    <h5 className="text-xs font-semibold mb-2">
                                        ⚙️ 更新オプション
                                    </h5>
                                    <div className="space-y-2">
                                        <label className="flex items-start gap-2 p-2 bg-white dark:bg-gray-700 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600">
                                            <input
                                                type="checkbox"
                                                checked={updateStockQuantity}
                                                onChange={(e) => setUpdateStockQuantity(e.target.checked)}
                                                className="rounded w-4 h-4 mt-0.5 flex-shrink-0"
                                            />
                                            <div className="flex-1">
                                                <span className="text-xs font-medium">在庫数を更新</span>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                                    既存の在庫データの在庫数を更新します（推奨: 有効）。
                                                </p>
                                            </div>
                                        </label>
                                        <label className="flex items-start gap-2 p-2 bg-white dark:bg-gray-700 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600">
                                            <input
                                                type="checkbox"
                                                checked={updateProductName}
                                                onChange={(e) => setUpdateProductName(e.target.checked)}
                                                className="rounded w-4 h-4 mt-0.5 flex-shrink-0"
                                            />
                                            <div className="flex-1">
                                                <span className="text-xs font-medium">商品名を更新</span>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                                    既存の商品詳細データ（product_details）の商品名（productName, product_name）を更新します。サイズとカラーの表記は除去されます。
                                                </p>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                                
                                {validationResult.validation && validationResult.validation.errors.length > 0 && (
                                    <details className="mt-2">
                                        <summary className="cursor-pointer text-xs font-semibold">エラー詳細 ({validationResult.validation.errors.length}件)</summary>
                                        <ul className="list-disc list-inside pl-4 mt-1 text-xs max-h-40 overflow-y-auto">
                                            {validationResult.validation.errors.slice(0, 10).map((err: string, i: number) => (
                                                <li key={i} className="text-red-600">{err}</li>
                                            ))}
                                        </ul>
                                    </details>
                                )}
                                {validationResult.consistency_checks && (
                                    <details className="mt-2">
                                        <summary className="cursor-pointer text-xs font-semibold">整合性チェック結果</summary>
                                        <div className="pl-4 mt-1 text-xs space-y-1">
                                            {validationResult.consistency_checks.duplicate_skus && validationResult.consistency_checks.duplicate_skus.length > 0 ? (
                                                <div>
                                                    <p className="font-semibold text-red-600">重複SKU:</p>
                                                    <ul className="list-disc list-inside pl-4">
                                                        {validationResult.consistency_checks.duplicate_skus.slice(0, 5).map((dup: any, i: number) => (
                                                            <li key={i}>行{dup.row}: {dup.sku} (前回: 行{dup.previous_row})</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ) : (
                                                <p className="text-gray-600">問題なし</p>
                                            )}
                                            {validationResult.consistency_checks.data_quality_issues && validationResult.consistency_checks.data_quality_issues.length > 0 && (
                                                <div className="mt-2">
                                                    <p className="font-semibold text-orange-600">データ品質問題:</p>
                                                    <ul className="list-disc list-inside pl-4">
                                                        {validationResult.consistency_checks.data_quality_issues.slice(0, 5).map((issue: any, i: number) => (
                                                            <li key={i}>行{issue.row}: {issue.type} - {issue.sku}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </details>
                                )}
                            </div>
                        </div>
                    )}
                    
                     <div className="flex justify-between mt-6 gap-2">
                        <Button variant="secondary" onClick={() => { setStep(1); setShowPreview(false); setValidationResult(null); }}>戻る</Button>
                        <div className="flex gap-2">
                            <Button 
                                variant="secondary" 
                                onClick={handleValidate} 
                                disabled={!isMappingComplete || isValidating}
                                className="flex items-center gap-2"
                            >
                                {isValidating ? <SpinnerIcon /> : '🔍'} {isValidating ? '検証中...' : 'データ検証'}
                            </Button>
                            <Button onClick={handleImport} disabled={!isMappingComplete || isLoading} className="flex items-center gap-2">
                                {isLoading ? <SpinnerIcon /> : <UploadIcon />} {isLoading ? 'インポート中...' : 'インポート実行'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {step === 3 && importResult && (
                 <div>
                    <h3 className="text-lg font-bold mb-4">ステップ3: インポート結果</h3>
                    <div className={`p-4 rounded-md space-y-2 ${importResult.success ? 'bg-green-50 dark:bg-base-dark-300 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-base-dark-300 text-red-800 dark:text-red-300'}`}>
                       <p className="font-bold flex items-center gap-2">{importResult.success ? <CheckIcon className="text-green-600 dark:text-green-400 w-[113px] h-[113px]"/> : <XMarkIcon className="text-red-600 dark:text-red-400"/>} {importResult.message}</p>
                       <ul className="list-disc list-inside pl-4 text-xs dark:text-base-content">
                           <li>処理対象行数: {importResult.summary.totalRows}</li>
                           <li>在庫更新数: {importResult.summary.updatedStock}</li>
                           {importResult.summary.skippedUnchanged !== undefined && importResult.summary.skippedUnchanged > 0 && (
                               <li>変更なし（スキップ）: {importResult.summary.skippedUnchanged}</li>
                           )}
                           {importResult.summary.newItems !== undefined && importResult.summary.newItems > 0 && (
                               <li>新規在庫登録数: {importResult.summary.newItems}</li>
                           )}
                           {importResult.summary.newProducts !== undefined && importResult.summary.newProducts > 0 && (
                               <li>新規商品登録数: {importResult.summary.newProducts}</li>
                           )}
                           {importResult.summary.newColors !== undefined && importResult.summary.newColors > 0 && (
                               <li>新規カラー登録数: {importResult.summary.newColors}</li>
                           )}
                           {importResult.summary.newSizes !== undefined && importResult.summary.newSizes > 0 && (
                               <li>新規サイズ登録数: {importResult.summary.newSizes}</li>
                           )}
                       </ul>
                       {importResult.summary.errors.length > 0 && (
                           <div className="pt-2 mt-2 border-t border-gray-300 dark:border-gray-600">
                               <p className="font-semibold text-red-700 dark:text-red-400">エラー詳細:</p>
                               {/* エラーサマリー（集約されたエラー） */}
                               {importResult.summary.errorSummary && importResult.summary.errorSummary.length > 0 && (
                                   <div className="mb-3">
                                       <p className="text-xs font-semibold mb-1 dark:text-base-content">エラーサマリー（件数順）:</p>
                                       <ul className="list-disc list-inside pl-4 text-xs space-y-1">
                                           {importResult.summary.errorSummary.map((errorSummary: any, i: number) => (
                                               <li key={i} className="text-red-700 dark:text-red-400">
                                                   <span className="font-semibold">[{errorSummary.count}件]</span> {errorSummary.message}
                                                   <span className="text-gray-600 dark:text-gray-400 ml-2">(影響行: {errorSummary.affected_rows})</span>
                                                   {errorSummary.location && (
                                                       <span className="text-gray-500 dark:text-gray-500 ml-2">({errorSummary.location})</span>
                                                   )}
                                               </li>
                                           ))}
                                       </ul>
                                   </div>
                               )}
                               {/* 全エラーリスト（詳細） */}
                               <details className="text-xs">
                                   <summary className="cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">全エラーリストを表示 ({importResult.summary.errors.length}件)</summary>
                                   <ul className="list-disc list-inside pl-4 mt-2 max-h-40 overflow-y-auto">
                                       {importResult.summary.errors.map((err, i) => <li key={i} className="text-red-600 dark:text-red-400">{err}</li>)}
                                   </ul>
                               </details>
                           </div>
                       )}
                       {/* デバッグログ（デバッグモード時） */}
                       {(importResult as any).debug_log && (importResult as any).debug_log.length > 0 && (
                           <div className="pt-2 mt-2 border-t">
                               <details className="text-xs">
                                   <summary className="cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">デバッグログを表示 ({(importResult as any).debug_log.length}件)</summary>
                                   <div className="mt-2 max-h-60 overflow-y-auto bg-gray-50 dark:bg-base-dark-200 p-2 rounded font-mono text-xs">
                                       {(importResult as any).debug_log.map((log: any, i: number) => (
                                           <div key={i} className={`mb-1 ${log.level === 'error' ? 'text-red-600 dark:text-red-400' : log.level === 'warning' ? 'text-orange-600 dark:text-orange-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                               <span className="text-gray-500 dark:text-gray-400">[{log.timestamp}]</span> <span className="font-semibold">[{log.level}]</span> {log.message}
                                               {log.data && <pre className="ml-4 mt-1 text-xs whitespace-pre-wrap dark:text-gray-300">{typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}</pre>}
                                           </div>
                                       ))}
                                   </div>
                               </details>
                           </div>
                       )}
                    </div>
                    <Button onClick={resetState} className="mt-4">別のファイルをインポート</Button>
                </div>
            )}
        </div>
    );
};

export default StockImporter;

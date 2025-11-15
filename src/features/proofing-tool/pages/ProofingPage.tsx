import { ArrowPathIcon, ArrowUturnLeftIcon, DownloadIcon, EyeIcon, EyeSlashIcon, LockClosedIcon, LockOpenIcon, MagnifyingGlassIcon, PlusIcon, SpinnerIcon, TrashIcon, UploadIcon, XMarkIcon } from '@components/atoms';
import DebugPanel from '@components/organisms/DebugPanel';
import { getRequiredTablesForPage } from '@core/config/Routes';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { fetchTables } from '@core/data/db.live';
import { getManufacturerTable, getProductDetailsFromStock, getProductsMasterFromStock } from '@core/utils';
import { useDebugMode } from '@shared/hooks/useDebugMode';
import { CanvasState, Database, DesignElement, ProductImageLayer, Row, Table } from '@shared/types';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ExportPreviewModal from '../modals/ExportPreviewModal';
import OrderSearchModal from '../modals/OrderSearchModal';
import DraggableResizableImage from '../molecules/DraggableResizableImage';
import resizeImage from '../utils/imageUtils';
import { loadProductTransform, saveProductTransform } from '../utils/transformStore';


interface GeneratedImage {
    colorName: string;
    dataUrl: string;
    productId: string;
}

interface ProofingToolProps {
    setCanvases: React.Dispatch<React.SetStateAction<CanvasState[]>>;
    canvases: CanvasState[];
}


const ProofingTool: React.FC<ProofingToolProps> = ({ setCanvases, canvases }) => {
    const { database, setDatabase, logDataAccess } = useDatabase();
    const { debugMode, setDebugMode, logs, addLog, clearLogs, exportLogs } = useDebugMode('proofing');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string|null>(null);

    const [activeCanvasId, setActiveCanvasId] = useState<string>(canvases[0]?.id || '');
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    const [selectedQuote, setSelectedQuote] = useState<Row | null>(null);
    const [isQuoteModalOpen, setQuoteModalOpen] = useState(false);
    const [isExportModalOpen, setExportModalOpen] = useState(false);
    const [isAddingImage, setIsAddingImage] = useState(false);
    
    const [productTransforms, setProductTransforms] = useState<Record<string, Pick<DesignElement, 'x' | 'y' | 'width' | 'height' | 'rotation'>>>(
        {}
    );
    
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    
    const loadingRef = useRef(false);
    const loadedTablesRef = useRef<Set<string>>(new Set());
    
    // 必要なテーブルリストをメモ化（databaseの参照が変わっても内容が同じなら再計算しない）
    const requiredTables = useMemo(() => {
        if (!database) return [];
        return getRequiredTablesForPage('proofing', undefined, database);
    }, [database]);
    
    // データベースのテーブル存在キーを計算（テーブル名のソート済みリスト）
    const databaseTablesKey = useMemo(() => {
        if (!database) return '';
        return Object.keys(database).filter(k => database[k]).sort().join(',');
    }, [database]);
    
    useEffect(() => {
        const loadData = async () => {
            if (!database) {
                setIsLoading(true);
                addLog('info', 'data-loading', 'データベースが初期化されていません', null);
                return;
            }
            
            // 既に読み込み中の場合はスキップ
            if (loadingRef.current) {
                return;
            }
            
            // 必要なテーブルが既にすべて読み込まれている場合はスキップ
            const allTablesLoaded = requiredTables.every(t => {
                if (loadedTablesRef.current.has(t)) return true;
                if (database[t]) {
                    loadedTablesRef.current.add(t);
                    return true;
                }
                return false;
            });
            
            if (allTablesLoaded) {
                setIsLoading(false);
                return;
            }
            
            setIsLoading(true);
            setError(null);
            try {
                addLog('debug', 'data-loading', 'データ読み込み開始', { hasDatabase: !!database });
                addLog('debug', 'data-loading', '必要なテーブルを取得', { requiredTables, count: requiredTables.length });
                const missingTables = requiredTables.filter(t => !loadedTablesRef.current.has(t) && !database[t]);
                addLog('debug', 'data-loading', '不足しているテーブルを確認', { 
                    missingTables, 
                    count: missingTables.length,
                    existingTables: Object.keys(database || {}).filter(k => database[k])
                });
                if (missingTables.length > 0) {
                    loadingRef.current = true;
                    logDataAccess('proofing', missingTables);
                    addLog('info', 'data-loading', 'テーブル読み込み開始', { tables: missingTables });
                    const data = await fetchTables(missingTables, { toolName: 'proofing' });
                    addLog('info', 'data-loading', 'テーブル読み込み成功', { 
                        loadedTables: Object.keys(data || {}),
                        tableCounts: Object.keys(data || {}).reduce((acc, key) => {
                            acc[key] = data[key]?.data?.length || 0;
                            return acc;
                        }, {} as Record<string, number>)
                    });
                    // 読み込んだテーブルを記録
                    Object.keys(data || {}).forEach(table => {
                        loadedTablesRef.current.add(table);
                    });
                    setDatabase(prev => ({ ...(prev || {}), ...data }));
                    loadingRef.current = false;
                } else {
                    addLog('info', 'data-loading', 'すべてのテーブルが既に読み込まれています', null);
                }
            } catch (err) {
                loadingRef.current = false;
                const error = err instanceof Error ? err : new Error(String(err));
                const errorMessage = error.message || 'データの読み込みに失敗しました。';
                addLog('error', 'data-loading', 'データ読み込み失敗', {
                    error: errorMessage,
                    stack: error.stack
                }, error);
                setError(errorMessage);
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requiredTables.join(','), databaseTablesKey]);

    const handleRegisterImages = useCallback(async (imagesToRegister: GeneratedImage[]) => {
        const activeCanvas = canvases.find(c => c.id === activeCanvasId);
        if (!activeCanvas || !activeCanvas.quoteId) {
            console.warn("Could not register images because no active quote ID was found.");
            return;
        }
        const quoteId = activeCanvas.quoteId;
        
        const updater = (currentDb: Partial<Database> | null): Partial<Database> | null => {
            if (!currentDb || !currentDb.quotes) return currentDb;
            const newDb = JSON.parse(JSON.stringify(currentDb));
            const quotesTable = newDb.quotes as Table;
            const quoteIndex = quotesTable.data.findIndex((q: Row) => q.id === quoteId);
            if (quoteIndex > -1) {
                const imagesJson = JSON.stringify(imagesToRegister);
                const currentNotes = quotesTable.data[quoteIndex].internal_notes || '';
                const newNotes = `PROOFING_IMAGES_JSON_START\n${imagesJson}\nPROOFING_IMAGES_JSON_END\n\n${currentNotes.replace(/PROOFING_IMAGES_JSON_START[\s\S]*?PROOFING_IMAGES_JSON_END\n*/, '')}`;
                quotesTable.data[quoteIndex].internal_notes = newNotes;
            } else {
                console.warn(`Quote with ID ${quoteId} not found.`);
            }
            return newDb;
        };
        setDatabase(updater as any);
        return Promise.resolve();
    }, [setDatabase, canvases, activeCanvasId]);

    const allProductsMap = useMemo(() => {
        const map = new Map<string, Row>();
        if (!database || !database.brands?.data) {
            return map;
        }
        // stockテーブルから全商品を取得（products_masterとproduct_detailsの代替）
        const allProducts = getProductsMasterFromStock(database);
        const allProductDetails = getProductDetailsFromStock(database);
        if (allProducts.length === 0) return map;

        const detailsMap = new Map(allProductDetails.map(d => [String(d.product_id), d]));
        const brandsMap = new Map(database.brands.data.map(b => [b.id, b.manufacturer_id]));
        allProducts.forEach(p => {
            const details = detailsMap.get(String(p.id));
            const manufacturerId = p.manufacturer_id as string || brandsMap.get(p.brand_id as string);
            const newProduct = Object.assign({}, p, details || {}, { manufacturerId: manufacturerId });
            map.set(String(p.id), newProduct);
        });
        return map;
    }, [database]);

    useEffect(() => {
        const initialTransforms: Record<string, Pick<DesignElement, 'x' | 'y' | 'width' | 'height' | 'rotation'>> = {};
        canvases.forEach(canvas => {
            canvas.productImageLayers.forEach(layer => {
                const stored = loadProductTransform(layer.id);
                initialTransforms[layer.id] = stored || { x: 0, y: 0, width: 600, height: 600, rotation: 0 };
            });
        });
        setProductTransforms(initialTransforms);
    }, [canvases]);

    useEffect(() => {
        if (!database || isLoading) return;
        if (!activeCanvasId && canvases.length > 0) {
            setActiveCanvasId(canvases[0].id);
        }
        const currentCanvas = canvases.find(c => c.id === activeCanvasId);
        if (currentCanvas && currentCanvas.quoteId && !selectedQuote) {
            const quotesTable = database.quotes as Table | undefined;
            if (quotesTable && Array.isArray(quotesTable.data)) {
                const quote = quotesTable.data.find((q: Row) => String(q.id) === String(currentCanvas.quoteId));
                if(quote) setSelectedQuote(quote);
            }
        }
    }, [canvases, activeCanvasId, database, selectedQuote, isLoading]);
    
    const quoteDetails = useMemo(() => {
        if (!selectedQuote || !database || !database.quote_items) return null;
        // 注意: colorsは削除済み（stockテーブルから取得）

        const quoteItemsTable = database.quote_items as Table;
        if (!quoteItemsTable || !Array.isArray(quoteItemsTable.data)) return null;

        const allItemsForQuote = quoteItemsTable.data.filter(i => String(i.quote_id) === String(selectedQuote.id));
        if (allItemsForQuote.length === 0) return null;
        
        // Group items by product name to handle variants as a single group.
        const itemsByName = allItemsForQuote.reduce<Record<string, Row[]>>((acc, item) => {
            const productInfo = item.product_id ? allProductsMap.get(String(item.product_id)) : undefined;
            const productName = productInfo?.name;

            if (typeof productName === 'string' && productName) {
                if (!acc[productName]) {
                    acc[productName] = [];
                }
                acc[productName].push(item);
            }
            return acc;
        }, {});

        // colorsテーブルは削除済み（stockテーブルから取得）
        // stockテーブルからカラー情報を取得
        return Object.keys(itemsByName).map(name => {
            const itemsInGroup = itemsByName[name];
            const allProductIdsInGroup = [...new Set(itemsInGroup.map(i => String(i.product_id)))];
            
            const productVariants = allProductIdsInGroup
                .map(pid => allProductsMap.get(pid))
                .filter((p): p is Row => !!p);

            if (productVariants.length === 0) return null;
            
            const representativeProduct = productVariants.find(p => typeof p.variantName === 'string' && p.variantName.includes('アダルト')) || productVariants[0];
            const uniqueColorNames = [...new Set(itemsInGroup.map(i => String(i.color)))];
            
            // stockテーブルからカラー情報を取得
            const manufacturerId = String(representativeProduct.manufacturerId || '');
            const stockTable = getManufacturerTable(database, 'stock', manufacturerId);
            const availableColors: Row[] = [];
            
            if (stockTable?.data && Array.isArray(stockTable.data)) {
                const colorMap = new Map<string, Row>();
                stockTable.data.forEach((item: Row) => {
                    const colorName = String(item.color_name || '');
                    const colorCode = String(item.color_code || '');
                    if (colorName && uniqueColorNames.includes(colorName) && !colorMap.has(colorCode)) {
                        colorMap.set(colorCode, {
                            id: `color_${manufacturerId}_${colorCode}`,
                            manufacturer_id: manufacturerId,
                            colorName: colorName,
                            colorCode: colorCode,
                            colorType: 'カラー',
                            hex: ''
                        } as Row);
                    }
                });
                availableColors.push(...Array.from(colorMap.values()));
            }
            
            return { product: representativeProduct, availableColors };
        }).filter((p): p is { product: Row; availableColors: Row[] } => p !== null && p.availableColors.length > 0);

    }, [selectedQuote, database, allProductsMap]);

    const activeCanvas = useMemo(() => canvases.find(c => c.id === activeCanvasId), [canvases, activeCanvasId]);

    const updateActiveCanvas = useCallback((updater: (canvas: CanvasState) => CanvasState) => {
        setCanvases(prev => prev.map(c => c.id === activeCanvasId ? updater(c) : c));
    }, [activeCanvasId, setCanvases]);

    const addImageToCanvas = async (originalSrc: string, googleDriveFileId?: string) => {
        if (!canvasContainerRef.current) return;
        setIsAddingImage(true);
        setError(null);
        try {
            const previewSrc = await resizeImage(originalSrc);
            const img = new Image();
            img.crossOrigin = "anonymous";
            await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error(`Failed to load image at ${previewSrc}`)); img.src = previewSrc; });
            
            const canvasBounds = canvasContainerRef.current.getBoundingClientRect();
            const aspectRatio = img.width / img.height;
            let initialWidth = 150;
            let initialHeight = initialWidth / aspectRatio;

            const newElement: DesignElement = {
                id: `el_${Date.now()}`, type: 'image', src: previewSrc, originalSrc,
                x: canvasBounds.width / 2 - initialWidth / 2, y: canvasBounds.height / 2 - initialHeight / 2,
                width: initialWidth, height: initialHeight, rotation: 0, visible: true,
                aspectRatio: aspectRatio, locked: false, googleDriveFileId
            };
            updateActiveCanvas(c => ({ ...c, layers: [newElement, ...c.layers]}));
            setSelectedLayerId(newElement.id);
        } catch (err) {
            setError('画像の処理中にエラーが発生しました。');
            console.error(`Failed to process image: ${String(err)}`);
        }
        finally { setIsAddingImage(false); }
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) { for (const file of Array.from(files)) {
            const reader = new FileReader();
            const src = await new Promise<string>((resolve) => { reader.onload = (e) => resolve(e.target?.result as string); reader.readAsDataURL(file as File); });
            await addImageToCanvas(src);
        }}
        if (event.target) event.target.value = '';
    };

    const handleQuoteSelect = (quote: Row) => {
        setSelectedQuote(quote);
        const newCanvas: CanvasState = { 
            id: `canvas_${Date.now()}`, name: 'パターン1', 
            quoteId: quote.id != null ? String(quote.id) : null,
            productImageLayers: [], layers: [], viewType: 'front'
        };
        setCanvases([newCanvas]);
        setActiveCanvasId(newCanvas.id);
        setQuoteModalOpen(false);
    };
    
    const handleColorSelectionChange = (product: Row, color: Row, isChecked: boolean) => {
        updateActiveCanvas(c => {
            let newLayers = c.productImageLayers;
            const layerExists = newLayers.some(l => l.productId === String(product.id) && l.colorName === String(color.colorName));

            if (isChecked && !layerExists) {
                const hex = (String(color.hex) || '#FFFFFF').replace(/^#/, '');
                // FIX: Cast `color.name` to string to satisfy `encodeURIComponent`.
                const name = encodeURIComponent(String(color.colorName));
                const imageSrc = product.images || `https://placehold.co/600x600.png/${hex}/333?text=${name}`;

                const newLayer: ProductImageLayer = {
                    id: `pl_${String(product.id)}_${String(color.colorCode)}`,
                    productId: String(product.id),
                    colorName: String(color.colorName),
                    imageSrc: imageSrc,
                    visible: newLayers.length === 0,
                    locked: false
                };
                if (!productTransforms[newLayer.id]) {
                    const stored = loadProductTransform(newLayer.id);
                    setProductTransforms(prev => ({ ...prev, [newLayer.id]: stored || { x: 0, y: 0, width: 600, height: 600, rotation: 0 }}));
                }
                newLayers = [...newLayers, newLayer];
            } else if (!isChecked && layerExists) {
                newLayers = newLayers.filter(l => !(l.productId === String(product.id) && l.colorName === String(color.colorName)));
            }
            if (newLayers.length > 0 && !newLayers.some(l => l.visible)) {
                newLayers[0].visible = true;
            }
            return {...c, productImageLayers: newLayers};
        });
    };

    const updateLayer = (id: string, updates: Partial<DesignElement>) => {
        if (id.startsWith('el_')) {
            updateActiveCanvas(c => ({...c, layers: c.layers.map(el => (el.id === id ? { ...el, ...updates } : el))}));
        } else if (id.startsWith('pl_')) {
            const oldTransform = productTransforms[id] || { x: 0, y: 0, width: 600, height: 600, rotation: 0 };
            const newTransform = { ...oldTransform, ...updates };
            setProductTransforms(prev => ({ ...prev, [id]: newTransform }));
            saveProductTransform(id, newTransform);
        }
    };
    
    const addCanvas = () => {
        const newCanvas: CanvasState = {
            id: `canvas_${Date.now()}`, name: `パターン${canvases.length + 1}`,
            quoteId: selectedQuote?.id != null ? String(selectedQuote.id) : null, productImageLayers: [], layers: [], viewType: 'front'
        };
        setCanvases(prev => [...prev, newCanvas]);
        setActiveCanvasId(newCanvas.id);
    };

    const deleteCanvas = (id: string) => {
        if (canvases.length <= 1) return;
        const newCanvases = canvases.filter(c => c.id !== id);
        if (activeCanvasId === id) setActiveCanvasId(newCanvases[0]?.id || '');
        setCanvases(newCanvases);
    };

    const combinedLayers = useMemo(() => {
        if (!activeCanvas) return [];
        const productLayers = activeCanvas.productImageLayers.map(layer => ({
            id: layer.id, name: `${allProductsMap.get(layer.productId)?.productName || allProductsMap.get(layer.productId)?.code || '商品'} - ${layer.colorName}`, type: 'product',
            visible: layer.visible, locked: layer.locked, src: layer.imageSrc
        }));
        const designLayers = activeCanvas.layers.map((layer, index) => ({
            id: layer.id, name: `デザインレイヤー ${index + 1}`, type: 'design',
            visible: layer.visible, locked: layer.locked, src: layer.src
        }));
        return [...designLayers.reverse(), ...productLayers];
    }, [activeCanvas, allProductsMap]);

    const selectedLayerInfo = useMemo(() => {
        if (!selectedLayerId || !activeCanvas) return null;
        if (selectedLayerId.startsWith('pl_')) {
            const layerData = activeCanvas.productImageLayers.find(l => l.id === selectedLayerId);
            const transform = productTransforms[selectedLayerId];
            if (!layerData || !transform) return null;
            return { ...layerData, ...transform, aspectRatio: transform.width / transform.height, type: 'product' };
        } else {
            const layer = activeCanvas.layers.find(l => l.id === selectedLayerId);
            return layer ? { ...layer, type: 'design' } : null;
        }
    }, [selectedLayerId, activeCanvas, productTransforms]);
    
    const toggleLayerVisibility = (id: string, type: 'product' | 'design') => {
        if (type === 'product') {
            updateActiveCanvas(c => ({ ...c, productImageLayers: c.productImageLayers.map(l => ({ ...l, visible: l.id === id ? !l.visible : false }))}));
        } else {
            updateActiveCanvas(c => ({...c, layers: c.layers.map(l => (l.id === id ? { ...l, visible: !l.visible } : l))}));
        }
    };
    
    const toggleLayerLock = (id: string, type: 'product' | 'design') => {
        if (type === 'product') {
            updateActiveCanvas(c => ({...c, productImageLayers: c.productImageLayers.map(l => (l.id === id ? { ...l, locked: !l.locked } : l))}));
        } else {
            updateActiveCanvas(c => ({...c, layers: c.layers.map(l => (l.id === id ? { ...l, locked: !l.locked } : l))}));
        }
    };

    const deleteLayer = (id: string, type: 'product' | 'design') => {
        if (type === 'design') {
            updateActiveCanvas(c => ({...c, layers: c.layers.filter(l => l.id !== id)}));
            if (selectedLayerId === id) setSelectedLayerId(null);
        }
    };
    
    const handleResetScale = () => {
        if (!selectedLayerInfo || selectedLayerInfo.locked) return;
    
        const currentCenterX = selectedLayerInfo.x + selectedLayerInfo.width / 2;
        const currentCenterY = selectedLayerInfo.y + selectedLayerInfo.height / 2;
    
        if (selectedLayerInfo.type === 'product') {
            const newWidth = 600;
            const newHeight = 600; // Assuming 1:1 aspect ratio for product images
            updateLayer(selectedLayerInfo.id, {
                width: newWidth,
                height: newHeight,
                x: currentCenterX - newWidth / 2,
                y: currentCenterY - newHeight / 2,
            });
        } else { // design
            const newWidth = 150;
            const newHeight = newWidth / selectedLayerInfo.aspectRatio;
            updateLayer(selectedLayerInfo.id, {
                width: newWidth,
                height: newHeight,
                x: currentCenterX - newWidth / 2,
                y: currentCenterY - newHeight / 2,
            });
        }
    };
    
    const handleResetRotation = () => {
        if (!selectedLayerInfo || selectedLayerInfo.locked) return;
        updateLayer(selectedLayerInfo.id, { rotation: 0 });
    };

    const handleWheel = (e: React.WheelEvent<HTMLInputElement>, field: 'width' | 'rotation') => {
        if (!selectedLayerInfo || selectedLayerInfo.locked) return;
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? -1 : 1; // ホイールダウンで減少、アップで増加
        const step = e.shiftKey ? 25 : 5;
        const change = delta * step;

        if (field === 'width') {
            const currentWidth = selectedLayerInfo.width;
            const newWidth = Math.max(20, Math.min(1200, currentWidth + change));
            if (newWidth !== currentWidth) {
                 const newHeight = newWidth / selectedLayerInfo.aspectRatio;
                const centerX = selectedLayerInfo.x + selectedLayerInfo.width / 2;
                const centerY = selectedLayerInfo.y + selectedLayerInfo.height / 2;
                const newX = centerX - newWidth / 2;
                const newY = centerY - newHeight / 2;
                updateLayer(selectedLayerInfo.id, { 
                    width: newWidth, 
                    height: newHeight,
                    x: newX,
                    y: newY,
                });
            }
        } else if (field === 'rotation') {
            const currentRotation = selectedLayerInfo.rotation;
            let newRotation = currentRotation + change;
            newRotation = ((newRotation % 360) + 360) % 360;
            if (newRotation !== currentRotation) {
                updateLayer(selectedLayerInfo.id, { rotation: Math.round(newRotation) });
            }
        }
    };

    // エラーをデバッグログに記録
    React.useEffect(() => {
        if (error) {
            addLog('error', 'system', 'エラー発生', {
                error,
                isLoading
            });
        }
    }, [error, addLog, isLoading]);

    if (isLoading) {
        return (
            <>
                <div className="flex h-full w-full items-center justify-center">
                    <SpinnerIcon className="w-12 h-12 text-brand-primary" />
                    <p className="ml-4">仕上がりイメージツールを準備中...</p>
                </div>
                <DebugPanel
                    debugMode={debugMode}
                    onToggle={setDebugMode}
                    logs={logs}
                    onClearLogs={clearLogs}
                    onExportLogs={exportLogs}
                    toolName="仕上がりイメージメーカー"
                />
            </>
        );
    }
    if (error) {
        return (
            <>
                <div className="p-4 text-red-600 dark:text-red-400">
                    <h3 className="font-bold mb-2">エラーが発生しました</h3>
                    <p>{error}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        デバッグパネル（右下のアイコン）で詳細を確認できます。
                    </p>
                </div>
                <DebugPanel
                    debugMode={debugMode}
                    onToggle={setDebugMode}
                    logs={logs}
                    onClearLogs={clearLogs}
                    onExportLogs={exportLogs}
                    toolName="仕上がりイメージメーカー"
                />
            </>
        );
    }
    if (!database) {
        addLog('warning', 'data-loading', 'データベースが読み込まれていません', null);
        return (
            <>
                <div className="p-4 text-gray-500 dark:text-gray-400">
                    <h3 className="font-bold mb-2">データを読み込めませんでした</h3>
                    <p className="text-sm mt-2">
                        デバッグパネル（右下のアイコン）で詳細を確認できます。
                    </p>
                </div>
                <DebugPanel
                    debugMode={debugMode}
                    onToggle={setDebugMode}
                    logs={logs}
                    onClearLogs={clearLogs}
                    onExportLogs={exportLogs}
                    toolName="仕上がりイメージメーカー"
                />
            </>
        );
    }

    return (
        <>
        <div className="flex flex-col h-full">
            <header className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold">仕上がりイメージメーカー</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">案件に紐づく仕上がりイメージを作成・管理します。</p>
                </div>
            </header>

            <div className="flex-grow flex gap-6 overflow-hidden">
                {/* Left Panel */}
                <div className="w-80 flex-shrink-0 bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md flex flex-col space-y-4">
                    <div>
                        <button onClick={() => setQuoteModalOpen(true)} className="w-full mb-2 flex items-center justify-center gap-2 bg-brand-secondary hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                            <MagnifyingGlassIcon className="w-4 h-4"/>
                            {selectedQuote ? '案件を切り替え' : '案件を選択'}
                        </button>
                        {selectedQuote ? (
                            <div className="text-xs p-2 bg-base-200 dark:bg-base-dark-300 rounded-md space-y-1">
                                <p><strong>見積ID:</strong> {selectedQuote.id}</p>
                                <p><strong>見積コード:</strong> {selectedQuote.quote_code}</p>
                                <p><strong>顧客ID:</strong> {selectedQuote.customer_id}</p>
                            </div>
                        ) : (
                            <div className="text-center text-sm text-gray-500 p-4">案件を選択してください</div>
                        )}
                    </div>
                    
                    {selectedQuote && quoteDetails && (
                        <div className="flex-grow flex flex-col min-h-0">
                             <h3 className="font-semibold mb-2 text-sm">商品・カラーを選択</h3>
                             <div className="flex-grow overflow-y-auto space-y-3 pr-1">
                                {quoteDetails.map(({ product, availableColors }) => (
                                    <div key={product.id as string}>
                                        <p className="font-medium text-xs bg-base-200 dark:bg-base-dark-300 p-1 rounded-t-md sticky top-0">{product.productName || product.code} : {product.code}</p>
                                        <div className="border border-t-0 border-base-200 dark:border-base-dark-300 p-1 space-y-1 rounded-b-md">
                                            {availableColors.map(color => {
                                                const colorCode = String(color.colorCode);
                                                const colorName = String(color.colorName);
                                                const checkboxId = `color-checkbox-${product.id}-${colorCode}`;
                                                return (
                                                    <label htmlFor={checkboxId} key={colorCode} className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-base-200 dark:hover:bg-base-dark-300 cursor-pointer">
                                                        <input
                                                            id={checkboxId}
                                                            name={`color_${product.id}_${colorCode}`}
                                                            type="checkbox"
                                                            checked={activeCanvas?.productImageLayers.some(l => l.productId === product.id && l.colorName === colorName) || false}
                                                            onChange={(e) => handleColorSelectionChange(product, color, e.target.checked)}
                                                            className="form-checkbox h-4 w-4 text-brand-secondary bg-base-200 dark:bg-base-dark-300 border-base-300 rounded focus:ring-brand-secondary"
                                                        />
                                                        <span style={{backgroundColor: color.hex as string}} className="w-4 h-4 rounded-full border border-gray-400 flex-shrink-0"></span>
                                                        <span className="text-xs truncate">{colorName}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel */}
                <div className="flex-grow flex flex-col gap-6">
                    <div className="flex-shrink-0 bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center">
                                {canvases.map(canvas => (
                                    <button key={canvas.id} onClick={() => {setActiveCanvasId(canvas.id); setSelectedLayerId(null);}} className={`relative group px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeCanvasId === canvas.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                        {canvas.name}
                                        {canvases.length > 1 && (<span onClick={(e) => { e.stopPropagation(); deleteCanvas(canvas.id); }} className="absolute top-1 right-0 p-0.5 opacity-0 group-hover:opacity-100 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><XMarkIcon className="w-3 h-3 text-red-500"/></span>)}
                                    </button>
                                ))}
                                {canvases.length < 10 && selectedQuote && (<button onClick={addCanvas} title="パターンを追加" className="p-2 text-gray-400 hover:text-brand-primary rounded-full ml-1"><PlusIcon className="w-4 h-4" /></button>)}
                            </div>
                            <button onClick={() => setExportModalOpen(true)} disabled={!activeCanvas || activeCanvas.layers.length === 0 || activeCanvas.productImageLayers.length === 0} className="flex items-center gap-2 bg-brand-primary hover:bg-blue-800 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm disabled:bg-gray-400">
                                <DownloadIcon className="w-4 h-4" /> 画像をダウンロード
                            </button>
                        </div>
                         {activeCanvas && <div className="flex items-center gap-4 mt-2 pl-2">
                            <span className="text-sm font-medium">ビュータイプ:</span>
                             <select value={activeCanvas.viewType} onChange={e => updateActiveCanvas(c => ({...c, viewType: e.target.value as any}))} className="bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-2 py-1 text-xs">
                                <option value="front">正面</option>
                                <option value="back">背面</option>
                                <option value="other">その他</option>
                            </select>
                        </div>}
                    </div>
                    <div className="flex-grow flex gap-6 overflow-hidden">
                        <div className="flex-grow flex flex-col rounded-lg overflow-hidden bg-base-100 dark:bg-base-dark-200 shadow-md">
                            <div className="flex-grow bg-base-200 dark:bg-base-dark flex items-center justify-center p-4" onClick={() => setSelectedLayerId(null)}>
                                {activeCanvas ? (
                                    <div className="relative w-full h-full max-w-[600px] max-h-[600px] select-none bg-white dark:bg-base-dark-300 shadow-lg border border-base-300 dark:border-base-dark-300 overflow-hidden" ref={canvasContainerRef}>
                                        {(activeCanvas.productImageLayers || []).map(layer => {
                                            const transform = productTransforms[layer.id] || { x: 0, y: 0, width: 600, height: 600, rotation: 0 };
                                            const elementForProduct: DesignElement = {
                                                id: layer.id, type: 'image', src: layer.imageSrc, x: transform.x, y: transform.y,
                                                width: transform.width, height: transform.height, rotation: transform.rotation, visible: layer.visible,
                                                aspectRatio: transform.width / transform.height, locked: layer.locked,
                                            };
                                            return <DraggableResizableImage key={layer.id} element={elementForProduct} onUpdate={updateLayer} onSelect={setSelectedLayerId} isSelected={selectedLayerId === layer.id} containerRef={canvasContainerRef} zIndex={1} />
                                        })}
                                        {[...(activeCanvas.layers || [])].reverse().map((el, index) => (
                                            <DraggableResizableImage key={el.id} element={el} onUpdate={updateLayer} onSelect={setSelectedLayerId} isSelected={selectedLayerId === el.id} containerRef={canvasContainerRef} zIndex={10 + index} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-500">
                                        <p>案件を選択すると、ここにプレビューが表示されます。</p>
                                    </div>
                                )}
                            </div>
                        </div>
                         <div className="w-80 flex-shrink-0 bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md flex flex-col">
                            <input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageUpload} className="hidden" multiple />
                            <button onClick={() => imageInputRef.current?.click()} disabled={isAddingImage || !selectedQuote} className="w-full mb-4 flex items-center justify-center gap-1 bg-button-muted-bg text-button-muted dark:bg-button-muted-bg-dark dark:text-button-muted-dark hover:opacity-90 font-semibold py-6 px-2 rounded-lg transition-colors text-sm disabled:bg-gray-400">
                                {isAddingImage ? <SpinnerIcon className="w-4 h-4" /> : <UploadIcon className="w-4 h-4" />} {isAddingImage ? '処理中...' : 'デザインレイヤーを追加'}
                            </button>
                             <div className="flex-grow flex flex-col min-h-0">
                                <h3 className="font-semibold mb-2 text-sm">商品・デザインレイヤー</h3>
                                <div className="flex-grow text-sm bg-base-200 dark:bg-base-dark-300 rounded-md p-2 space-y-1 overflow-y-auto">
                                    {combinedLayers.map(layer => (
                                        <div key={layer.id} onClick={() => setSelectedLayerId(layer.id)} className={`flex items-center gap-2 p-1 rounded-md cursor-pointer ${selectedLayerId === layer.id ? 'bg-brand-secondary/20 ring-1 ring-brand-secondary' : 'hover:bg-base-300 dark:hover:bg-base-dark-300/50'} ${layer.type === 'product' ? 'border-l-2 border-blue-500' : ''}`}>
                                            <img src={layer.src} alt="layer thumbnail" className="w-8 h-8 object-contain bg-white rounded-sm"/>
                                            <span className="flex-grow truncate text-xs" title={layer.name}>{layer.name}</span>
                                            <button onClick={(e) => {e.stopPropagation(); toggleLayerLock(layer.id, layer.type as any);}} className="p-1">{layer.locked ? <LockClosedIcon className="w-4 h-4"/> : <LockOpenIcon className="w-4 h-4"/>}</button>
                                            <button onClick={(e) => {e.stopPropagation(); toggleLayerVisibility(layer.id, layer.type as any);}} className="p-1">{layer.visible ? <EyeIcon className="w-4 h-4"/> : <EyeSlashIcon className="w-4 h-4"/>}</button>
                                            {layer.type === 'design' && <button onClick={(e) => {e.stopPropagation(); deleteLayer(layer.id, layer.type as any);}} className="p-1 text-red-500"><TrashIcon className="w-4 h-4"/></button>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {selectedLayerInfo && (
                                <div className="flex-shrink-0 border-t border-base-300 dark:border-base-dark-300 mt-4 pt-4">
                                    <h4 className="font-semibold text-sm mb-3">選択中のレイヤー設定</h4>
                                    {selectedLayerInfo.locked ? (
                                        <div className="text-center text-sm text-gray-500 p-4 bg-base-200 dark:bg-base-dark-300 rounded-md">
                                            <LockClosedIcon className="w-6 h-6 mx-auto mb-2"/>
                                            <p>このレイヤーはロックされています。</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 text-xs">
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <label htmlFor={`width-range-${selectedLayerInfo.id}`} className="block font-medium">拡大縮小</label>
                                                    <button onClick={handleResetScale} title="拡大縮小をリセット" className="p-1 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0" aria-label="拡大縮小をリセット">
                                                        <ArrowUturnLeftIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input id={`width-range-${selectedLayerInfo.id}`} name={`width_range_${selectedLayerInfo.id}`} type="range" min="20" max="1200" value={Math.round(selectedLayerInfo.width)} 
                                                        onChange={(e) => {
                                                            const newWidth = Number(e.target.value);
                                                            const newHeight = newWidth / selectedLayerInfo.aspectRatio;
                                                            const centerX = selectedLayerInfo.x + selectedLayerInfo.width / 2;
                                                            const centerY = selectedLayerInfo.y + selectedLayerInfo.height / 2;
                                                            updateLayer(selectedLayerInfo.id, { width: newWidth, height: newHeight, x: centerX - newWidth / 2, y: centerY - newHeight / 2 });
                                                        }} 
                                                        onWheel={(e) => handleWheel(e, 'width')}
                                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
                                                    <input id={`width-number-${selectedLayerInfo.id}`} name={`width_number_${selectedLayerInfo.id}`} type="number" value={Math.round(selectedLayerInfo.width)} disabled className="w-20 bg-base-200 dark:bg-base-dark-300 border border-base-300 dark:border-base-dark-300 rounded-md px-2 py-1" />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <label htmlFor={`rotation-range-${selectedLayerInfo.id}`} className="block font-medium">回転 (角度)</label>
                                                     <button onClick={handleResetRotation} title="回転をリセット" className="p-1 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0" aria-label="回転をリセット">
                                                        <ArrowPathIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input id={`rotation-range-${selectedLayerInfo.id}`} name={`rotation_range_${selectedLayerInfo.id}`} type="range" min="0" max="360" value={selectedLayerInfo.rotation} 
                                                        onChange={(e) => updateLayer(selectedLayerInfo.id, { rotation: Number(e.target.value) })}
                                                        onWheel={(e) => handleWheel(e, 'rotation')} 
                                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
                                                    <input id={`rotation-number-${selectedLayerInfo.id}`} name={`rotation_number_${selectedLayerInfo.id}`} type="number" min="0" max="360" value={Math.round(selectedLayerInfo.rotation)} 
                                                        onChange={(e) => updateLayer(selectedLayerInfo.id, { rotation: Number(e.target.value) })}
                                                        onWheel={(e) => handleWheel(e, 'rotation')}
                                                        className="w-20 bg-base-200 dark:bg-base-dark-300 border border-base-300 dark:border-base-dark-300 rounded-md px-2 py-1" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                         </div>
                    </div>
                </div>
            </div>
        </div>
        <OrderSearchModal isOpen={isQuoteModalOpen} onClose={() => setQuoteModalOpen(false)} onSelect={handleQuoteSelect} database={database as Database} />
        <ExportPreviewModal 
            isOpen={isExportModalOpen}
            onClose={() => setExportModalOpen(false)}
            canvasState={activeCanvas}
            canvasSize={{width: 600, height: 600}}
            allProducts={allProductsMap}
            onRegister={handleRegisterImages}
            database={database as Database}
        />
        <DebugPanel
            debugMode={debugMode}
            onToggle={setDebugMode}
            logs={logs}
            onClearLogs={clearLogs}
            onExportLogs={exportLogs}
            toolName="仕上がりイメージメーカー"
        />
        </>
    );
};

export default ProofingTool;
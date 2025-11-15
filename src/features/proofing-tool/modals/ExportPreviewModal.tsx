import { ArrowPathIcon, DownloadIcon, SpinnerIcon, XMarkIcon } from '@components/atoms';
import { findOrCreateFolder, uploadFile } from '@features/google-api-settings/services/googleApiService';
import { CanvasState, Database, ExportOptions, Row } from '@shared/types';
import React, { useCallback, useEffect, useState } from 'react';
import { exportCanvasAsImage } from '../utils/canvasExporter';

interface ExportPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    canvasState: CanvasState | undefined;
    canvasSize: { width: number; height: number };
    allProducts: Map<string, Row>;
    onRegister: (images: GeneratedImage[]) => Promise<void>;
    database: Database;
}

interface GeneratedImage {
    colorName: string;
    dataUrl: string;
    productId: string;
}

const dataURLtoFile = (dataurl: string, filename: string): File | null => {
    const arr = dataurl.split(',');
    if (arr.length < 2) return null;
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) return null;
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}


const ExportPreviewModal: React.FC<ExportPreviewModalProps> = ({ isOpen, onClose, canvasState, canvasSize, allProducts, onRegister, database }) => {
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
    const [isGenerating, setIsGenerating] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filenamePrefix, setFilenamePrefix] = useState('仕上がりイメージ');

    const [exportOptions, setExportOptions] = useState<Omit<ExportOptions, 'width' | 'height' | 'filename'>>({
        scale: 2,
        format: 'jpeg',
        background: 'white',
    });

    const handleOptionsChange = <K extends keyof typeof exportOptions>(key: K, value: (typeof exportOptions)[K]) => {
        setExportOptions(prev => {
            const newOpts = { ...prev, [key]: value };
            if (key === 'format' && value === 'jpeg') {
                newOpts.background = 'white';
            }
            return newOpts;
        });
    };

    const generateImages = useCallback(async (options: Omit<ExportOptions, 'width' | 'height' | 'filename'> = exportOptions) => {
        if (!canvasState || canvasState.productImageLayers.length === 0) return;
        
        setIsGenerating(true);
        setError(null);
        setGeneratedImages([]);
        setSelectedImages(new Set());

        try {
            const images: GeneratedImage[] = [];
            for (const layer of canvasState.productImageLayers) {
                const dataUrl = await exportCanvasAsImage(canvasState.layers, layer.imageSrc, {
                    ...options,
                    width: canvasSize.width,
                    height: canvasSize.height,
                    filename: '' // not used here
                });
                images.push({ colorName: layer.colorName, dataUrl, productId: layer.productId });
            }
            setGeneratedImages(images);
            setSelectedImages(new Set(images.map(img => `${img.productId}-${img.colorName}`)));
        } catch (err) {
            setError(err instanceof Error ? err.message : '画像の生成に失敗しました。');
        } finally {
            setIsGenerating(false);
        }

    }, [canvasState, canvasSize, exportOptions]);

    useEffect(() => {
        if (isOpen) {
            setFilenamePrefix(`仕上がりイメージ_${canvasState?.name || ''}`);
            setIsRegistering(false);
            generateImages();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, canvasState]);

    const handleDownload = useCallback((image: GeneratedImage) => {
        const product = allProducts.get(image.productId);
        const productCode = product?.productCode || '';
        const viewTypeLabel = canvasState?.viewType === 'front' ? '正面' : canvasState?.viewType === 'back' ? '背面' : 'その他';
        const suffix = `${viewTypeLabel}-${productCode}-${image.colorName}`;
        
        const link = document.createElement('a');
        link.href = image.dataUrl;
        link.download = `${filenamePrefix}_${suffix}.${exportOptions.format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [allProducts, canvasState?.viewType, filenamePrefix, exportOptions.format]);

    const handleDownloadSelected = useCallback(() => {
        generatedImages.forEach(image => {
            const imageId = `${image.productId}-${image.colorName}`;
            if (selectedImages.has(imageId)) {
                handleDownload(image);
            }
        });
    }, [generatedImages, selectedImages, handleDownload]);

    const handleDownloadAll = useCallback(() => {
        generatedImages.forEach(handleDownload);
    }, [generatedImages, handleDownload]);

    const handleToggleSelection = (imageId: string) => {
        setSelectedImages(prev => {
            const newSet = new Set(prev);
            if (newSet.has(imageId)) {
                newSet.delete(imageId);
            } else {
                newSet.add(imageId);
            }
            return newSet;
        });
    };

    const handleToggleSelectAll = () => {
        if (generatedImages.length > 0 && selectedImages.size === generatedImages.length) {
            setSelectedImages(new Set());
        } else {
            const allImageIds = generatedImages.map(img => `${img.productId}-${img.colorName}`);
            setSelectedImages(new Set(allImageIds));
        }
    };
    
    const uploadFileToDrive = async (file: File, image: GeneratedImage): Promise<string | null> => {
        if (!canvasState?.quoteId) return null;
        
        const settings = new Map(database.google_api_settings.data.map(s => [s.key, s.value]));
        const rootFolderId = settings.get('ROOT_FOLDER_ID');
        if (!rootFolderId) {
            setError("Google DriveのアプリケーションルートフォルダIDが設定されていません。");
            return null;
        }

        const quote = database.quotes.data.find(q => q.id === canvasState.quoteId);
        if (!quote) return null;
        const customer = database.customers.data.find(c => c.id === quote.customer_id);
        const customerFolderName = customer?.company_name || customer?.name_kanji || `顧客ID-${quote.customer_id}`;
        
        const customerFolderId = await findOrCreateFolder(customerFolderName, rootFolderId as string);
        if (!customerFolderId) return null;
        
        const quoteFolderName = `${quote.quote_code}_${quote.subject}`;
        const quoteFolderId = await findOrCreateFolder(quoteFolderName, customerFolderId);
        if (!quoteFolderId) return null;

        const product = allProducts.get(image.productId);
        const productCode = product?.productCode || '';
        const viewTypeLabel = canvasState.viewType === 'front' ? '正面' : canvasState.viewType === 'back' ? '背面' : 'その他';
        const fileName = `${filenamePrefix}_${viewTypeLabel}-${productCode}-${image.colorName}.${exportOptions.format}`;

        return await uploadFile(file, quoteFolderId, fileName);
    };

    const handleRegister = async () => {
        if (generatedImages.length === 0) return;
        setIsRegistering(true);
        setError(null);
        try {
            const imagesToRegister = generatedImages.filter(img => selectedImages.has(`${img.productId}-${img.colorName}`));
            
            const uploadPromises = imagesToRegister.map(async (image) => {
                const file = dataURLtoFile(image.dataUrl, `${image.colorName}.${exportOptions.format}`);
                if (file) {
                    const fileId = await uploadFileToDrive(file, image);
                    if (!fileId) {
                        console.warn(`Failed to upload ${file.name} to Google Drive.`);
                    }
                }
            });

            await Promise.all(uploadPromises);
            await onRegister(imagesToRegister);
            onClose();
        } catch (e) {
            setError('データベースへの登録またはGoogle Driveへのアップロードに失敗しました。');
            console.error(e);
        } finally {
            setIsRegistering(false);
        }
    };
    
    const scaleMap: Record<string, number> = { '小 (600px)': 1, '中 (1200px)': 2, '大 (1800px)': 3 };
    const scaleToLabel = (scale: number) => Object.keys(scaleMap).find(key => scaleMap[key] === scale) || '中 (1200px)';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-base-300 dark:border-base-dark-300">
                    <h2 className="text-xl font-bold">画像のエクスポート設定</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                <div className="flex-grow flex overflow-hidden">
                    <aside className="w-72 flex-shrink-0 p-6 border-r border-base-300 dark:border-base-dark-300 space-y-5 overflow-y-auto">
                        <h3 className="text-lg font-semibold">保存オプション</h3>
                        <div>
                            <label htmlFor="filename-prefix-input" className="block text-sm font-medium mb-1">ファイル名</label>
                            <input id="filename-prefix-input" name="filename_prefix" type="text" value={filenamePrefix} onChange={e => setFilenamePrefix(e.target.value)} className="w-full bg-base-200 dark:bg-base-dark-300 border border-base-300 dark:border-base-dark-300 rounded-md px-3 py-1.5 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">ファイル形式</label>
                            <div className="flex gap-2">
                                <button onClick={() => handleOptionsChange('format', 'jpeg')} className={`flex-1 text-sm py-1.5 rounded-md ${exportOptions.format === 'jpeg' ? 'bg-brand-primary text-white' : 'bg-base-200 dark:bg-base-dark-300 hover:bg-base-300'}`}>JPEG</button>
                                <button onClick={() => handleOptionsChange('format', 'png')} className={`flex-1 text-sm py-1.5 rounded-md ${exportOptions.format === 'png' ? 'bg-brand-primary text-white' : 'bg-base-200 dark:bg-base-dark-300 hover:bg-base-300'}`}>PNG</button>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium mb-1">解像度</label>
                             <select value={scaleToLabel(exportOptions.scale)} onChange={e => handleOptionsChange('scale', scaleMap[e.target.value])} className="w-full bg-base-200 dark:bg-base-dark-300 border border-base-300 dark:border-base-dark-300 rounded-md px-3 py-1.5 text-sm">
                                {Object.keys(scaleMap).map(label => <option key={label} value={label}>{label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">背景</label>
                            <div className="flex gap-2">
                                <button onClick={() => handleOptionsChange('background', 'white')} className={`flex-1 text-sm py-1.5 rounded-md ${exportOptions.background === 'white' ? 'bg-brand-primary text-white' : 'bg-base-200 dark:bg-base-dark-300 hover:bg-base-300'}`}>白</button>
                                <button onClick={() => handleOptionsChange('background', 'transparent')} disabled={exportOptions.format === 'jpeg'} className={`flex-1 text-sm py-1.5 rounded-md ${exportOptions.background === 'transparent' ? 'bg-brand-primary text-white' : 'bg-base-200 dark:bg-base-dark-300 hover:bg-base-300'} disabled:bg-gray-400 disabled:cursor-not-allowed`}>透明</button>
                            </div>
                        </div>
                        <button onClick={() => generateImages()} disabled={isGenerating} className="w-full mt-4 flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm disabled:bg-gray-400">
                           {isGenerating ? <SpinnerIcon /> : <ArrowPathIcon className="w-4 h-4" />}
                           {isGenerating ? '生成中...' : 'プレビューを再生成'}
                        </button>
                    </aside>
                    
                    <main className="flex-grow p-6 overflow-y-auto">
                        {isGenerating && !generatedImages.length && (
                            <div className="flex flex-col items-center justify-center h-full">
                                <SpinnerIcon className="w-12 h-12 text-brand-primary" />
                                <p className="mt-4 text-lg">画像を生成中...</p>
                                <p className="text-sm text-gray-500">{generatedImages.length} / {canvasState?.productImageLayers.length || 0} 枚完了</p>
                            </div>
                        )}
                        
                        {!isGenerating && error && <p className="text-red-500">{error}</p>}
                        
                        {!isGenerating && generatedImages.length > 0 && (
                            <>
                                <div className="flex items-center gap-2 mb-4 p-2 bg-base-200 dark:bg-base-dark-300 rounded-md">
                                    <input
                                        type="checkbox"
                                        id="select-all-images"
                                        checked={generatedImages.length > 0 && selectedImages.size === generatedImages.length}
                                        onChange={handleToggleSelectAll}
                                        className="h-4 w-4 text-brand-secondary rounded focus:ring-brand-secondary border-gray-300 dark:bg-base-dark-300"
                                    />
                                    <label htmlFor="select-all-images" className="text-sm font-medium">
                                        すべて選択 ({selectedImages.size} / {generatedImages.length})
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {generatedImages.map((image) => {
                                        const imageId = `${image.productId}-${image.colorName}`;
                                        const isSelected = selectedImages.has(imageId);
                                        const product = allProducts.get(image.productId);
                                        const productCode = product?.productCode || '';
                                        const viewTypeLabel = canvasState?.viewType === 'front' ? '正面' : canvasState?.viewType === 'back' ? '背面' : 'その他';
                                        const label = `${viewTypeLabel}-${productCode}-${image.colorName}`;

                                        return (
                                        <div key={imageId} className="relative">
                                            <div className={`relative rounded-md border-2 transition-all ${isSelected ? 'border-brand-secondary ring-2 ring-brand-secondary' : 'border-transparent'}`} onClick={() => handleToggleSelection(imageId)}>
                                                <img src={image.dataUrl} alt={`Preview for ${image.colorName}`} className="w-full aspect-square object-contain rounded-md border border-base-300 dark:border-base-dark-300" />
                                                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all cursor-pointer">
                                                     <input
                                                        id={`image-checkbox-${imageId}`}
                                                        name={`image_${imageId}`}
                                                        type="checkbox"
                                                        readOnly
                                                        checked={isSelected}
                                                        className="absolute top-2 left-2 h-5 w-5 text-brand-secondary rounded focus:ring-brand-secondary border-gray-300 dark:bg-base-dark-300 pointer-events-none"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-center text-xs mt-1 truncate" title={label}>{label}</p>
                                        </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </main>
                </div>
                 <footer className="flex justify-between items-center gap-3 p-4 bg-base-200 dark:bg-base-dark-300/50">
                     <div>
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-base-300 hover:bg-gray-300 dark:bg-base-dark-300 dark:hover:bg-gray-600">
                            閉じる
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleDownloadSelected}
                            disabled={isGenerating || selectedImages.size === 0}
                            className="px-4 py-2 text-sm font-medium rounded-md bg-gray-600 text-white hover:bg-gray-700 disabled:bg-gray-400 flex items-center gap-2"
                        >
                            <DownloadIcon className="w-4 h-4"/>
                            選択した画像を保存 ({selectedImages.size})
                        </button>
                        <button 
                            onClick={handleDownloadAll}
                            disabled={isGenerating || generatedImages.length === 0}
                            className="px-4 py-2 text-sm font-medium rounded-md bg-gray-700 text-white hover:bg-gray-800 disabled:bg-gray-400 flex items-center gap-2"
                        >
                             <DownloadIcon className="w-4 h-4"/>
                            すべて保存 ({generatedImages.length})
                        </button>
                         <button 
                            type="button" 
                            onClick={handleRegister} 
                            disabled={isGenerating || generatedImages.length === 0 || isRegistering || selectedImages.size === 0}
                            title="選択したプレビュー画像を高画質JPEG(白背景)でDBとGoogle Driveに登録します"
                            className="px-4 py-2 text-sm font-medium rounded-md bg-brand-primary text-white hover:bg-blue-800 disabled:bg-gray-400 flex items-center gap-2"
                        >
                            {isRegistering ? <SpinnerIcon className="w-4 h-4"/> : <DownloadIcon className="w-4 h-4" />}
                            {isRegistering ? '登録中...' : 'DBとDriveに登録'}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default ExportPreviewModal;
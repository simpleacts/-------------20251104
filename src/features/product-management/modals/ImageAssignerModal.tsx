import React, { useState, useCallback, useMemo } from 'react';
import { Row, Table, ImageFile } from '@shared/types';
import { useTranslation } from '@shared/hooks/useTranslation';

interface ImageAssignerModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: Row[];
    productDetails: Table;
    onAssign: (assignments: Map<string, string>) => void;
    onRunAssignment: (images: ImageFile[], products: Row[]) => Promise<Map<string, string>>;
}

const ImageAssignerModal: React.FC<ImageAssignerModalProps> = ({
    isOpen,
    onClose,
    products,
    productDetails,
    onAssign,
    onRunAssignment
}) => {
    const { t } = useTranslation('image-batch-linker');
    const [images, setImages] = useState<ImageFile[]>([]);
    const [assignments, setAssignments] = useState<Map<string, string>>(new Map());
    const [isProcessing, setIsProcessing] = useState(false);

    const productDetailsMap = useMemo(() => {
        const map = new Map<string, Row>();
        if (productDetails?.data) {
            productDetails.data.forEach((detail: Row) => {
                const productId = detail.product_id as string;
                if (productId) {
                    map.set(productId, detail);
                }
            });
        }
        return map;
    }, [productDetails]);

    const handleImageSelect = useCallback((files: FileList | null) => {
        if (!files) return;
        
        const newImages: ImageFile[] = [];
        Array.from(files).forEach((file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataURI = e.target?.result as string;
                newImages.push({
                    name: file.name,
                    dataURI: dataURI
                });
                if (newImages.length === files.length) {
                    setImages(prev => [...prev, ...newImages]);
                }
            };
            reader.readAsDataURL(file);
        });
    }, []);

    const handleAssign = useCallback((productId: string, imageDataURI: string) => {
        setAssignments(prev => {
            const newMap = new Map(prev);
            newMap.set(productId, imageDataURI);
            return newMap;
        });
    }, []);

    const handleRunAI = useCallback(async () => {
        setIsProcessing(true);
        try {
            const aiAssignments = await onRunAssignment(images, products);
            setAssignments(aiAssignments);
        } catch (err) {
            console.error('[ImageAssignerModal] AI assignment failed:', err);
            alert(t('image_linker.ai_failed', 'AIによる自動紐付けに失敗しました。'));
        } finally {
            setIsProcessing(false);
        }
    }, [images, products, onRunAssignment, t]);

    const handleSave = useCallback(() => {
        onAssign(assignments);
        setImages([]);
        setAssignments(new Map());
    }, [assignments, onAssign]);

    if (!isOpen) return null;

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-6xl">
                <h3 className="font-bold text-lg mb-4">
                    {t('image_linker.modal_title', '商品画像紐付け')}
                </h3>

                <div className="space-y-4">
                    {/* 画像選択 */}
                    <div>
                        <label className="label">
                            <span className="label-text font-semibold">
                                {t('image_linker.select_images', '画像を選択')}
                            </span>
                        </label>
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => handleImageSelect(e.target.files)}
                            className="file-input file-input-bordered w-full"
                        />
                    </div>

                    {/* AI自動紐付けボタン */}
                    {images.length > 0 && products.length > 0 && (
                        <div>
                            <button
                                className="btn btn-primary"
                                onClick={handleRunAI}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm"></span>
                                        {t('image_linker.ai_processing', 'AI処理中...')}
                                    </>
                                ) : (
                                    t('image_linker.run_ai', 'AIで自動紐付け')
                                )}
                            </button>
                        </div>
                    )}

                    {/* 商品と画像の紐付けリスト */}
                    <div className="max-h-96 overflow-y-auto">
                        <table className="table table-zebra w-full">
                            <thead>
                                <tr>
                                    <th>{t('image_linker.product', '商品')}</th>
                                    <th>{t('image_linker.image', '画像')}</th>
                                    <th>{t('image_linker.action', '操作')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product: Row) => {
                                    const productId = product.id as string;
                                    const productName = product.productCode as string || productId;
                                    const assignedImage = assignments.get(productId);
                                    const detail = productDetailsMap.get(productId);
                                    const currentImage = detail?.images as string || '';

                                    return (
                                        <tr key={productId}>
                                            <td>{productName}</td>
                                            <td>
                                                {assignedImage ? (
                                                    <img
                                                        src={assignedImage}
                                                        alt={productName}
                                                        className="w-16 h-16 object-cover"
                                                    />
                                                ) : currentImage ? (
                                                    <img
                                                        src={currentImage}
                                                        alt={productName}
                                                        className="w-16 h-16 object-cover opacity-50"
                                                    />
                                                ) : (
                                                    <span className="text-gray-400">
                                                        {t('image_linker.no_image', '画像なし')}
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <select
                                                    className="select select-bordered select-sm"
                                                    value={assignedImage || ''}
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            handleAssign(productId, e.target.value);
                                                        }
                                                    }}
                                                >
                                                    <option value="">
                                                        {t('image_linker.select_image', '画像を選択')}
                                                    </option>
                                                    {images.map((img, idx) => (
                                                        <option key={idx} value={img.dataURI}>
                                                            {img.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="modal-action">
                    <button
                        className="btn btn-ghost"
                        onClick={onClose}
                    >
                        {t('image_linker.cancel', 'キャンセル')}
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={assignments.size === 0}
                    >
                        {t('image_linker.save', '保存')}
                    </button>
                </div>
            </div>
            <div className="modal-backdrop" onClick={onClose}></div>
        </div>
    );
};

export default ImageAssignerModal;


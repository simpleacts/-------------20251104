import React, { useState } from 'react';
import { Row } from '../../types';
import { CheckIcon, PencilIcon, SparklesIcon, SpinnerIcon, TrashIcon, XMarkIcon, ToggleSwitch } from '@components/atoms';
import EditableField from '@components/molecules/EditableField';

const ProductCard: React.FC<{
    row: Row;
    originalIndex: number;
    detail: Row | undefined;
    isEditing: boolean;
    editedMasterRow: Row | null;
    editedDetailRow: Row | null;
    generatingDescIndex: number | null;
    handleGenerateDescriptionClick: (index: number) => void;
    handleEdit: (index: number) => void;
    handleDelete: (index: number) => void;
    handleMasterChange: (field: string, value: any) => void;
    handleDetailChange: (field: string, value: any) => void;
    handleCancel: () => void;
    handleSave: () => void;
    brandsMap?: Map<string, string>;
}> = ({
    row, originalIndex, detail, isEditing, editedMasterRow, editedDetailRow,
    generatingDescIndex, handleGenerateDescriptionClick, handleEdit, handleDelete,
    handleMasterChange, handleDetailChange, handleCancel, handleSave, brandsMap
}) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    
    // 画像URLが存在し、エラーが発生していない場合のみ画像を表示
    const hasValidImage = detail?.images && detail.images.trim() !== '' && !imageError;
    const imageUrl = hasValidImage ? detail.images : null;
    
    // ブランド名を取得（brand_idから取得、またはrow.brandのフォールバック）
    const brandName = brandsMap?.get(row.brand_id as string) || row.brand || '';
    
    const handleImageError = () => {
        // エラーが発生したら、画像を非表示にしてグレー背景を表示
        setImageError(true);
    };
    
    const handleImageLoad = () => {
        setImageLoaded(true);
    };
    
    if (isEditing && editedMasterRow && editedDetailRow) {
        return (
            <div className="bg-base-200 dark:bg-base-dark-300 rounded-lg shadow-lg ring-2 ring-brand-primary flex flex-col h-full overflow-hidden">
                <div className="flex-grow p-4 space-y-3 overflow-y-auto">
                    <div>
                        <label htmlFor={`product-name-${originalIndex}`} className="text-xs font-bold">商品名</label>
                        <EditableField id={`product-name-${originalIndex}`} value={editedDetailRow.name} onChange={val => handleDetailChange('name', val)} />
                    </div>
                    <div>
                        <label htmlFor={`product-brand-${originalIndex}`} className="text-xs font-bold">ブランド</label>
                        <EditableField id={`product-brand-${originalIndex}`} value={editedMasterRow.brand} onChange={val => handleMasterChange('brand', val)} />
                    </div>
                    <div>
                        <label htmlFor={`product-code-${originalIndex}`} className="text-xs font-bold">品番</label>
                        <EditableField id={`product-code-${originalIndex}`} value={editedMasterRow.code} onChange={val => handleMasterChange('code', val)} />
                    </div>
                    <div>
                        <label htmlFor={`product-description-${originalIndex}`} className="text-xs font-bold">商品説明</label>
                        <EditableField id={`product-description-${originalIndex}`} value={editedDetailRow.description} onChange={val => handleDetailChange('description', val)} isLargeText />
                    </div>
                    <div className="flex items-center justify-between">
                        <label htmlFor={`product-published-${originalIndex}`} className="text-xs font-bold">公開</label>
                        <ToggleSwitch id={`product-published-${originalIndex}`} checked={!!editedMasterRow.is_published} onChange={(checked) => handleMasterChange('is_published', checked)} />
                    </div>
                </div>
                <div className="flex-shrink-0 flex justify-end space-x-2 p-2 border-t border-base-300 dark:border-base-dark-300">
                    <button onClick={handleCancel} className="p-2 text-gray-500 hover:text-gray-700"><XMarkIcon className="w-5 h-5"/></button>
                    <button onClick={handleSave} className="p-2 text-green-600 hover:text-green-800"><CheckIcon className="w-5 h-5"/></button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-card-100 dark:bg-card-dark-100 rounded-lg shadow flex flex-col h-full">
            <div className="w-full h-48 rounded-t-lg bg-gray-300 dark:bg-gray-700 p-2 flex items-center justify-center relative">
                {imageUrl && !imageError ? (
                    <img 
                        src={imageUrl} 
                        alt={detail?.name || row.code} 
                        className={`w-full h-full object-contain ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                        loading="lazy"
                        onError={handleImageError}
                        onLoad={handleImageLoad}
                    />
                ) : null}
                {/* 画像がない場合やエラー時のプレースホルダー */}
                {(!imageUrl || imageError) && (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="text-gray-500 dark:text-gray-400 text-xs text-center">
                            <div className="mb-1">📦</div>
                            <div>{row.code || '画像なし'}</div>
                        </div>
                    </div>
                )}
            </div>
            <div className="p-density-card flex-grow flex flex-col">
                <h3 className="font-bold mb-1 text-density-card">{detail?.name || '(名称未設定)'}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {brandName ? (
                        <>
                            <span className="font-medium">{brandName}</span>
                            {row.code && <> / <span>{row.code}</span></>}
                        </>
                    ) : (
                        row.code ? <span>{row.code}</span> : '—'
                    )}
                </p>
                <p className="text-sm mt-2 flex-grow text-gray-700 dark:text-gray-300">{String(detail?.description || '').substring(0, 50)}...</p>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-base-300 dark:border-base-dark-300">
                    <div className={`px-2 py-0.5 text-xs font-medium rounded-full ${row.is_published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{row.is_published ? '公開' : '非公開'}</div>
                    <div className="flex items-center space-x-1">
                        {handleGenerateDescriptionClick && (
                            <button onClick={() => handleGenerateDescriptionClick(originalIndex)} disabled={generatingDescIndex === originalIndex} className="p-1.5 text-purple-600 hover:text-purple-800 disabled:text-gray-400" title="AIで商品説明を生成">
                                {generatingDescIndex === originalIndex ? <SpinnerIcon className="w-4 h-4" /> : <SparklesIcon className="w-4 h-4" />}
                            </button>
                        )}
                        <button onClick={() => handleEdit(originalIndex)} className="p-1.5 text-action-primary hover:text-action-primary-hover" title="編集"><PencilIcon className="w-4 h-4"/></button>
                        <button onClick={() => handleDelete(originalIndex)} className="p-1.5 text-action-danger hover:text-action-danger-hover" title="削除"><TrashIcon className="w-4 h-4"/></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
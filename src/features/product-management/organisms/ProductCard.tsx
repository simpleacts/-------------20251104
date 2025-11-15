import React from 'react';
import { Row } from '@shared/types';
import { useTranslation } from '@shared/hooks/useTranslation';

interface ProductCardProps {
    product: Row;
    onClick: () => void;
    onDelete: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, onDelete }) => {
    const { t } = useTranslation('product-management');

    const productCode = String(product.product_code || '');
    const productName = String(product.productName || product.product_name || '');
    const brand = String(product.brand || '');
    const images = product.images ? (typeof product.images === 'string' ? product.images.split(',') : []) : [];
    const mainImage = images.length > 0 ? images[0].trim() : null;

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete();
    };

    return (
        <div
            className="card bg-base-100 dark:bg-base-dark-200 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
            onClick={onClick}
        >
            <figure className="h-48 bg-gray-100 dark:bg-gray-800">
                {mainImage ? (
                    <img
                        src={mainImage}
                        alt={productName || productCode}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <i className="fa-solid fa-image text-4xl"></i>
                    </div>
                )}
            </figure>
            <div className="card-body p-4">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="card-title text-sm font-bold line-clamp-2 flex-1">
                        {productName || productCode}
                    </h3>
                    <button
                        className="btn btn-sm btn-ghost text-error hover:bg-error hover:text-white"
                        onClick={handleDeleteClick}
                        title={t('product.delete', '削除')}
                    >
                        <i className="fa-solid fa-trash"></i>
                    </button>
                </div>
                <div className="space-y-1 text-xs">
                    <div>
                        <span className="font-semibold">{t('product.code', '品番')}:</span>
                        <span className="ml-2">{productCode}</span>
                    </div>
                    {brand && (
                        <div>
                            <span className="font-semibold">{t('product.brand', 'ブランド')}:</span>
                            <span className="ml-2">{brand}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductCard;


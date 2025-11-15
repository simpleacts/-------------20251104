import { PhotoIcon } from '@components/atoms';
import { getManufacturerTableName, getProductDetailsFromStock, getProductsMasterFromStock } from '@core/utils';
import ImageAssignerModal from '@features/product-management/modals/ImageAssignerModal';
import { useTranslation } from '@shared/hooks/useTranslation';
import { assignImagesToProducts } from '@shared/services/geminiService';
import { Database, ImageFile, Row, Table } from '@shared/types';
import React, { useCallback, useState } from 'react';

interface ImageBatchLinkerProps {
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
}

const ImageBatchLinker: React.FC<ImageBatchLinkerProps> = ({ database, setDatabase }) => {
    const { t } = useTranslation('image-batch-linker');
    const [isAssignerOpen, setIsAssignerOpen] = useState(false);

    const handleAssignImages = useCallback((assignments: Map<string, string>) => {
        setDatabase(prevDb => {
            if (!prevDb) return null;
            const newDb = JSON.parse(JSON.stringify(prevDb));
            
            // stockテーブルから全商品と商品詳細を取得（products_masterとproduct_detailsの代替）
            const allProducts = getProductsMasterFromStock(newDb);
            const allProductDetails = getProductDetailsFromStock(newDb);
            
            assignments.forEach((imageDataURI, productId) => {
                // 商品詳細を検索
                const productDetail = allProductDetails.find(d => d.product_id === productId);
                const product = allProducts.find((p: Row) => p.id === productId);
                
                if (productDetail && product) {
                    // 既存の商品詳細を更新（メーカー依存テーブルを更新）
                    const manufacturerId = product.manufacturer_id as string;
                    if (manufacturerId) {
                        const detailsTableName = getManufacturerTableName('product_details', manufacturerId);
                        const detailsTable = newDb[detailsTableName] as Table | undefined;
                        if (detailsTable?.data) {
                            const detailIndex = detailsTable.data.findIndex((d: Row) => 
                                String(d.product_code || '') === String(product.productCode || '')
                            );
                            if (detailIndex > -1) {
                                detailsTable.data[detailIndex].images = imageDataURI;
                            }
                        }
                    }
                } else if (product) {
                    // 新しい商品詳細を作成（メーカー依存テーブルに追加）
                    const manufacturerId = product.manufacturer_id as string;
                    if (manufacturerId) {
                        const detailsTableName = getManufacturerTableName('product_details', manufacturerId);
                        let detailsTable = newDb[detailsTableName] as Table | undefined;
                        if (!detailsTable) {
                            detailsTable = { schema: [], data: [] };
                            newDb[detailsTableName] = detailsTable;
                        }
                        detailsTable.data.push({
                            id: `detail_${manufacturerId}_${product.productCode || productId}`,
                            manufacturer_id: manufacturerId,
                            product_code: product.productCode || productId,
                            product_id: productId,
                            images: imageDataURI,
                            productName: '' // product_detailsテーブルにはproductNameフィールドを使用
                        });
                    }
                }
            });
            return newDb;
        });
        setIsAssignerOpen(false);
    }, [setDatabase]);

    const handleRunAIAssignment = async (images: ImageFile[], products: Row[]) => {
        return await assignImagesToProducts(products, images);
    };

    return (
        <div className="flex flex-col h-full">
            <header className="mb-6">
                <h1 className="text-3xl font-bold">{t('image_linker.title', '商品画像一括紐付け')}</h1>
                <p className="text-gray-500 mt-1">{t('image_linker.description', 'AIを使用して、商品画像と商品を自動で紐付けます。')}</p>
            </header>

            <div className="flex-grow bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md flex flex-col items-center justify-center">
                <button onClick={() => setIsAssignerOpen(true)} className="flex items-center gap-2 bg-brand-primary text-white p-4 rounded text-lg font-semibold hover:bg-blue-700">
                    <PhotoIcon className="w-6 h-6"/>
                    {t('image_linker.open_tool', '紐付けツールを開く')}
                </button>
                {isAssignerOpen && (
                    <ImageAssignerModal
                        isOpen={isAssignerOpen}
                        onClose={() => setIsAssignerOpen(false)}
                        products={getProductsMasterFromStock(database)}
                        productDetails={{
                            schema: [],
                            data: getProductDetailsFromStock(database)
                        } as Table}
                        onAssign={handleAssignImages}
                        onRunAssignment={handleRunAIAssignment}
                    />
                )}
            </div>
        </div>
    );
};

export default ImageBatchLinker;
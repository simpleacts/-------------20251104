import { getManufacturerTable, getManufacturerTableName, updateDatabase } from '@core/utils';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Database, Row } from '@shared/types';
import React, { useState } from 'react';

interface ProductEditModalProps {
    product: Row;
    manufacturerId: string;
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Partial<Database> | null>>;
    onClose: () => void;
    onSave: () => void;
}

const ProductEditModal: React.FC<ProductEditModalProps> = ({
    product,
    manufacturerId,
    database,
    setDatabase,
    onClose,
    onSave
}) => {
    const { t } = useTranslation('product-management');
    
    const [formData, setFormData] = useState({
        product_code: String(product.product_code || ''),
        productName: String(product.productName || ''),
        product_name: String(product.product_name || ''),
        description: String(product.description || ''),
        images: String(product.images || ''),
        tags: String(product.tags || ''),
        brand: String(product.brand || ''),
        meta_title: String(product.meta_title || ''),
        meta_description: String(product.meta_description || ''),
        og_image_url: String(product.og_image_url || ''),
        og_title: String(product.og_title || ''),
        og_description: String(product.og_description || ''),
    });

    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // ブランド一覧を取得
    const brands = React.useMemo(() => {
        const allBrands = database.brands?.data || [];
        return allBrands.filter((b: Row) => String(b.manufacturer_id || '') === manufacturerId);
    }, [database.brands, manufacturerId]);

    const handleSave = async () => {
        setIsSaving(true);
        setSaveError(null);

        try {
            const tableName = getManufacturerTableName('product_details', manufacturerId);
            const table = getManufacturerTable(database, 'product_details', manufacturerId);
            
            if (!table || !table.data) {
                throw new Error('テーブルが見つかりません');
            }

            // 既存のデータを更新
            const updatedData = table.data.map((item: Row) => {
                if (String(item.product_code || '') === formData.product_code) {
                    return {
                        ...item,
                        ...formData,
                        id: item.id || `detail_${manufacturerId}_${formData.product_code}`,
                        manufacturer_id: manufacturerId,
                    };
                }
                return item;
            });

            // データベースを更新（自動的にCSVに保存される）
            await updateDatabase(
                'product-management',
                tableName,
                {
                    schema: table.schema || [],
                    data: updatedData
                },
                database,
                setDatabase,
                manufacturerId
            );

            onSave();
        } catch (err) {
            console.error('[ProductEditModal] Failed to save:', err);
            setSaveError(err instanceof Error ? err.message : t('product.save_failed', '保存に失敗しました。'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-4xl">
                <h3 className="font-bold text-lg mb-4">
                    {t('product.edit_title', '商品詳細編集')}
                </h3>

                {saveError && (
                    <div className="alert alert-error mb-4">
                        <span>{saveError}</span>
                    </div>
                )}

                <div className="space-y-4">
                    {/* 品番 */}
                    <div>
                        <label className="label">
                            <span className="label-text font-semibold">{t('product.code', '品番')}</span>
                        </label>
                        <input
                            type="text"
                            value={formData.product_code}
                            onChange={(e) => setFormData(prev => ({ ...prev, product_code: e.target.value }))}
                            className="input input-bordered w-full bg-input-bg dark:bg-input-bg-dark text-base-content dark:text-base-dark-content"
                            disabled
                        />
                    </div>

                    {/* 商品名 */}
                    <div>
                        <label className="label">
                            <span className="label-text font-semibold">{t('product.name', '商品名')}</span>
                        </label>
                        <input
                            type="text"
                            value={formData.productName}
                            onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                            className="input input-bordered w-full bg-input-bg dark:bg-input-bg-dark text-base-content dark:text-base-dark-content"
                        />
                    </div>

                    {/* 商品名（略称） */}
                    <div>
                        <label className="label">
                            <span className="label-text font-semibold">{t('product.name_short', '商品名（略称）')}</span>
                        </label>
                        <input
                            type="text"
                            value={formData.product_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, product_name: e.target.value }))}
                            className="input input-bordered w-full bg-input-bg dark:bg-input-bg-dark text-base-content dark:text-base-dark-content"
                        />
                    </div>

                    {/* ブランド */}
                    <div>
                        <label className="label">
                            <span className="label-text font-semibold">{t('product.brand', 'ブランド')}</span>
                        </label>
                        <input
                            type="text"
                            value={formData.brand}
                            onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                            className="input input-bordered w-full bg-input-bg dark:bg-input-bg-dark text-base-content dark:text-base-dark-content"
                            list="brand-list"
                        />
                        <datalist id="brand-list">
                            {brands.map((b: Row) => (
                                <option key={b.id} value={String(b.name || '')} />
                            ))}
                        </datalist>
                    </div>

                    {/* 説明 */}
                    <div>
                        <label className="label">
                            <span className="label-text font-semibold">{t('product.description_text', '説明')}</span>
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="textarea textarea-bordered w-full bg-input-bg dark:bg-input-bg-dark text-base-content dark:text-base-dark-content"
                            rows={4}
                        />
                    </div>

                    {/* 画像URL（カンマ区切り） */}
                    <div>
                        <label className="label">
                            <span className="label-text font-semibold">{t('product.images', '画像URL（カンマ区切り）')}</span>
                        </label>
                        <textarea
                            value={formData.images}
                            onChange={(e) => setFormData(prev => ({ ...prev, images: e.target.value }))}
                            className="textarea textarea-bordered w-full bg-input-bg dark:bg-input-bg-dark text-base-content dark:text-base-dark-content"
                            rows={3}
                            placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                        />
                    </div>

                    {/* タグ（カンマ区切り） */}
                    <div>
                        <label className="label">
                            <span className="label-text font-semibold">{t('product.tags', 'タグ（カンマ区切り）')}</span>
                        </label>
                        <input
                            type="text"
                            value={formData.tags}
                            onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                            className="input input-bordered w-full bg-input-bg dark:bg-input-bg-dark text-base-content dark:text-base-dark-content"
                            placeholder="タグ1, タグ2, タグ3"
                        />
                    </div>

                    {/* SEO設定 */}
                    <div className="divider">{t('product.seo_settings', 'SEO設定')}</div>

                    <div>
                        <label className="label">
                            <span className="label-text font-semibold">{t('product.meta_title', 'メタタイトル')}</span>
                        </label>
                        <input
                            type="text"
                            value={formData.meta_title}
                            onChange={(e) => setFormData(prev => ({ ...prev, meta_title: e.target.value }))}
                            className="input input-bordered w-full bg-input-bg dark:bg-input-bg-dark text-base-content dark:text-base-dark-content"
                        />
                    </div>

                    <div>
                        <label className="label">
                            <span className="label-text font-semibold">{t('product.meta_description', 'メタ説明')}</span>
                        </label>
                        <textarea
                            value={formData.meta_description}
                            onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                            className="textarea textarea-bordered w-full bg-input-bg dark:bg-input-bg-dark text-base-content dark:text-base-dark-content"
                            rows={3}
                        />
                    </div>

                    {/* OG設定 */}
                    <div className="divider">{t('product.og_settings', 'OG設定')}</div>

                    <div>
                        <label className="label">
                            <span className="label-text font-semibold">{t('product.og_image_url', 'OG画像URL')}</span>
                        </label>
                        <input
                            type="text"
                            value={formData.og_image_url}
                            onChange={(e) => setFormData(prev => ({ ...prev, og_image_url: e.target.value }))}
                            className="input input-bordered w-full bg-input-bg dark:bg-input-bg-dark text-base-content dark:text-base-dark-content"
                        />
                    </div>

                    <div>
                        <label className="label">
                            <span className="label-text font-semibold">{t('product.og_title', 'OGタイトル')}</span>
                        </label>
                        <input
                            type="text"
                            value={formData.og_title}
                            onChange={(e) => setFormData(prev => ({ ...prev, og_title: e.target.value }))}
                            className="input input-bordered w-full bg-input-bg dark:bg-input-bg-dark text-base-content dark:text-base-dark-content"
                        />
                    </div>

                    <div>
                        <label className="label">
                            <span className="label-text font-semibold">{t('product.og_description', 'OG説明')}</span>
                        </label>
                        <textarea
                            value={formData.og_description}
                            onChange={(e) => setFormData(prev => ({ ...prev, og_description: e.target.value }))}
                            className="textarea textarea-bordered w-full bg-input-bg dark:bg-input-bg-dark text-base-content dark:text-base-dark-content"
                            rows={3}
                        />
                    </div>
                </div>

                <div className="modal-action">
                    <button
                        className="btn btn-ghost"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        {t('product.cancel', 'キャンセル')}
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <>
                                <span className="loading loading-spinner loading-sm"></span>
                                {t('product.saving', '保存中...')}
                            </>
                        ) : (
                            t('product.save', '保存')
                        )}
                    </button>
                </div>
            </div>
            <div className="modal-backdrop" onClick={onClose}></div>
        </div>
    );
};

export default ProductEditModal;


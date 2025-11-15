import React, { useEffect, useMemo, useState } from 'react';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { useNavigation } from '@core/contexts/NavigationContext';
import { updateDatabase } from '@core/utils';
import { Column, Database, Row } from '@shared/types';
import { Button, PlusIcon, XMarkIcon, Input, Select } from '@components/atoms';
import { ColorInput } from '@components/molecules';
import { PageHeader } from '@components/molecules';
import { Card, CardContent, CardHeader } from '@components/organisms/Card';
import DataTable from '@components/organisms/DataTable';
import { InkManufacturer, InkProduct, InkSeries } from '../../types';

// Modal component in the same file
interface InkProductEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (product: Partial<InkProduct>) => void;
    product: Partial<InkProduct> | null;
    seriesId: string;
}

const InkProductEditModal: React.FC<InkProductEditModalProps> = ({ isOpen, onClose, onSave, product, seriesId }) => {
    const { database } = useDatabase();
    const [formData, setFormData] = useState<Partial<InkProduct>>({});

    useEffect(() => {
        if (isOpen) {
            if (product) {
                setFormData(product);
            } else {
                // デフォルト値は空文字列に（データベースから取得した値を使用）
                const defaultProductType = database?.ink_product_types?.data?.[0]?.code || '';
                const defaultUnit = database?.weight_volume_units?.data?.[0]?.code || '';
                setFormData({ series_id: seriesId, product_type: defaultProductType, unit_measure: defaultUnit });
            }
        }
    }, [product, seriesId, isOpen, database?.ink_product_types, database?.weight_volume_units]);

    if (!isOpen) return null;

    const handleChange = (field: keyof InkProduct, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        if (!formData.color_name) {
            alert('色名/製品名は必須です。');
            return;
        }
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold">{product?.id ? 'インク製品を編集' : '新規インク製品'}</h2>
                    <button onClick={onClose}><XMarkIcon className="w-6 h-6" /></button>
                </header>
                <main className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium mb-1">製品タイプ</label>
                        <Select value={formData.product_type || ''} onChange={e => handleChange('product_type', e.target.value as any)}>
                            <option value="">製品タイプを選択してください</option>
                            {(() => {
                                const productTypes = (database?.ink_product_types?.data || []).sort((a, b) => {
                                    const aOrder = (a.sort_order as number) || 0;
                                    const bOrder = (b.sort_order as number) || 0;
                                    return aOrder - bOrder;
                                });
                                return productTypes.map(type => (
                                    <option key={type.id as string} value={type.code as string}>
                                        {type.name}
                                    </option>
                                ));
                            })()}
                        </Select>
                        {(!database?.ink_product_types?.data || database.ink_product_types.data.length === 0) && (
                            <p className="text-xs text-gray-500 mt-1">※ 製品タイプは商品定義管理で設定できます</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">色名 / 製品名</label>
                        <Input value={formData.color_name || ''} onChange={e => handleChange('color_name', e.target.value)} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium mb-1">色番号 / 製品コード</label>
                        <Input value={formData.color_code || ''} onChange={e => handleChange('color_code', e.target.value)} />
                    </div>
                    <div>
                        <ColorInput label="HEX値" value={formData.hex_value || ''} onChange={value => handleChange('hex_value', value)} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">単価</label>
                            <Input type="number" value={formData.unit_cost || ''} onChange={e => handleChange('unit_cost', Number(e.target.value))} />
                        </div>
                         <div>
                            <label className="block text-sm font-medium mb-1">容量</label>
                            <Input type="number" value={formData.unit_volume || ''} onChange={e => handleChange('unit_volume', Number(e.target.value))} />
                        </div>
                         <div>
                            <label className="block text-sm font-medium mb-1">単位</label>
                            <Select value={formData.unit_measure || ''} onChange={e => handleChange('unit_measure', e.target.value as any)}>
                                <option value="">単位を選択してください</option>
                                {(() => {
                                    const units = (database?.weight_volume_units?.data || []).sort((a, b) => {
                                        const aOrder = (a.sort_order as number) || 0;
                                        const bOrder = (b.sort_order as number) || 0;
                                        return aOrder - bOrder;
                                    });
                                    return units.map(unit => (
                                        <option key={unit.id as string} value={unit.code as string}>
                                            {unit.name}
                                        </option>
                                    ));
                                })()}
                            </Select>
                            {(!database?.weight_volume_units?.data || database.weight_volume_units.data.length === 0) && (
                                <p className="text-xs text-gray-500 mt-1">※ 単位は商品定義管理で設定できます</p>
                            )}
                        </div>
                    </div>
                </main>
                <footer className="p-4 bg-base-200 dark:bg-base-dark-300/50 border-t flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>キャンセル</Button>
                    <Button onClick={handleSave}>保存</Button>
                </footer>
            </div>
        </div>
    );
};

// Main Component
interface InkProductManagerProps {
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
}

const InkProductManager: React.FC<InkProductManagerProps> = ({ database, setDatabase }) => {
    const { currentPage } = useNavigation();
    const [selectedManufacturerId, setSelectedManufacturerId] = useState('');
    const [selectedSeriesId, setSelectedSeriesId] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Partial<InkProduct> | null>(null);

    const manufacturers = useMemo(() => (database.ink_manufacturers?.data as InkManufacturer[]) || [], [database.ink_manufacturers]);
    const allSeries = useMemo(() => (database.ink_series?.data as InkSeries[]) || [], [database.ink_series]);
    const allProducts = useMemo(() => (database.ink_products?.data as InkProduct[]) || [], [database.ink_products]);

    const filteredSeries = useMemo(() => {
        if (!selectedManufacturerId) return [];
        return allSeries.filter(s => s.manufacturer_id === selectedManufacturerId);
    }, [allSeries, selectedManufacturerId]);

    const filteredProducts = useMemo(() => {
        if (!selectedSeriesId) return [];
        return allProducts.filter(p => p.series_id === selectedSeriesId);
    }, [allProducts, selectedSeriesId]);

    const handleOpenModal = (product: Partial<InkProduct> | null) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleSave = async (productData: Partial<InkProduct>) => {
        const isEdit = !!productData.id;
        const productId = isEdit ? productData.id : `inkp_${Date.now()}`;
        
        // まずローカル状態を更新
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            const productsTable = newDb.ink_products.data as InkProduct[];
            if (isEdit) {
                const index = productsTable.findIndex(p => p.id === productData.id);
                if (index > -1) productsTable[index] = { ...productsTable[index], ...productData };
            } else {
                productsTable.push({ ...productData, id: productId } as InkProduct);
            }
            return newDb;
        });

        // サーバーに保存
        try {
            const operation = isEdit
                ? [{ type: 'UPDATE' as const, data: productData, where: { id: productId } }]
                : [{ type: 'INSERT' as const, data: { ...productData, id: productId } }];
            
            const result = await updateDatabase(currentPage, 'ink_products', operation, database);
            if (!result.success) {
                throw new Error(result.error || 'Failed to save ink product to server');
            }
        } catch (error) {
            console.error('[InkProductManager] Failed to save to server:', error);
            alert('サーバーへの保存に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
        }

        setIsModalOpen(false);
    };

    const handleDelete = async (rowIndex: number) => {
        const productId = filteredProducts[rowIndex]?.id;
        if (!productId || !window.confirm('このインク製品を削除しますか？')) return;
        
        // まずローカル状態から削除
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            newDb.ink_products.data = newDb.ink_products.data.filter((p: Row) => p.id !== productId);
            return newDb;
        });

        // サーバーから削除
        try {
            const operation = [{ type: 'DELETE' as const, where: { id: productId } }];
            const result = await updateDatabase(currentPage, 'ink_products', operation, database);
            if (!result.success) {
                throw new Error(result.error || 'Failed to delete ink product from server');
            }
        } catch (error) {
            console.error('[InkProductManager] Failed to delete from server:', error);
            alert('サーバーからの削除に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    const schema: Column[] = [
        { id: 'product_type', name: 'product_type', type: 'TEXT' },
        { id: 'color_name', name: 'color_name', type: 'TEXT' },
        { id: 'color_code', name: 'color_code', type: 'TEXT' },
        { id: 'hex_value', name: 'hex_value', type: 'TEXT' },
        { id: 'unit_cost', name: 'unit_cost', type: 'NUMBER' },
        { id: 'unit_volume', name: 'unit_volume', type: 'NUMBER' },
        { id: 'unit_measure', name: 'unit_measure', type: 'TEXT' },
    ];
    
    // データベースから製品タイプを取得してマップを作成
    const productTypeMap = useMemo(() => {
        const map: Record<string, string> = {};
        if (database?.ink_product_types?.data) {
            database.ink_product_types.data.forEach((type: Row) => {
                map[type.code as string] = type.name as string;
            });
        }
        return map;
    }, [database?.ink_product_types]);

    const displayData = useMemo(() => filteredProducts.map(p => ({
        ...p,
        product_type: productTypeMap[p.product_type as string] || p.product_type,
    })), [filteredProducts, productTypeMap]);

    return (
        <div className="flex flex-col h-full">
            <PageHeader title="インク製品管理" description="インクシリーズに属する個別のインクや添加剤を登録・管理します。" />
            <Card>
                <CardHeader>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select value={selectedManufacturerId} onChange={e => { setSelectedManufacturerId(e.target.value); setSelectedSeriesId(''); }}>
                            <option value="">メーカーを選択...</option>
                            {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </Select>
                        <Select value={selectedSeriesId} onChange={e => setSelectedSeriesId(e.target.value)} disabled={!selectedManufacturerId}>
                            <option value="">シリーズを選択...</option>
                            {filteredSeries.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </Select>
                        <Button onClick={() => handleOpenModal(null)} disabled={!selectedSeriesId}>
                            <PlusIcon className="w-5 h-5 mr-2" /> 新規製品を追加
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-[60vh] relative">
                        <DataTable
                            schema={schema}
                            data={displayData}
                            tableName="ink_products"
                            onUpdateRow={() => {}}
                            onOpenEditModal={(rowIndex) => handleOpenModal(filteredProducts[rowIndex])}
                            onDeleteRow={handleDelete}
                            skipDeleteConfirm={true}
                            permissions={{}}
                        />
                    </div>
                </CardContent>
            </Card>
            <InkProductEditModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                product={editingProduct}
                seriesId={selectedSeriesId}
            />
        </div>
    );
};

export default InkProductManager;
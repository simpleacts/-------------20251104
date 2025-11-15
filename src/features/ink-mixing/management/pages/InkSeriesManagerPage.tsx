import React, { useState, useMemo, useEffect } from 'react';
import { Database, Row } from '@shared/types';
import { InkSeries, InkManufacturer } from '../../types';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon, Button, Input, Select } from '@components/atoms';
import { useNavigation } from '@core/contexts/NavigationContext';
import { updateDatabase } from '@core/utils';

interface InkSeriesEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (series: Partial<InkSeries>) => void;
    series: Partial<InkSeries> | null;
    manufacturers: InkManufacturer[];
    categoryOptions: string[];
    mixingStyleOptions: string[];
}

const InkSeriesEditModal: React.FC<InkSeriesEditModalProps> = ({ isOpen, onClose, onSave, series, manufacturers, categoryOptions, mixingStyleOptions }) => {
    const [formData, setFormData] = useState<Partial<InkSeries>>({});

    useEffect(() => {
        if (series) {
            setFormData(series);
        } else {
            setFormData({ name: '', manufacturer_id: '', category: '水性', mixing_style: 'pigment_base' });
        }
    }, [series]);

    if (!isOpen) return null;

    const handleChange = (field: keyof InkSeries, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        if (!formData.name || !formData.manufacturer_id) {
            alert('シリーズ名とメーカーは必須です。');
            return;
        }
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold">{series?.id ? 'インクシリーズを編集' : '新規インクシリーズ'}</h2>
                    <button onClick={onClose}><XMarkIcon className="w-6 h-6"/></button>
                </header>
                <main className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">シリーズ名</label>
                        <Input value={formData.name || ''} onChange={e => handleChange('name', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">メーカー</label>
                        <Select value={formData.manufacturer_id || ''} onChange={e => handleChange('manufacturer_id', e.target.value)}>
                            <option value="">選択してください</option>
                            {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </Select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">カテゴリ</label>
                        <Select value={formData.category || '水性'} onChange={e => handleChange('category', e.target.value as any)}>
                            {categoryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </Select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">調色スタイル</label>
                        <Select value={formData.mixing_style || 'pigment_base'} onChange={e => handleChange('mixing_style', e.target.value as any)}>
                             {mixingStyleOptions.map(opt => <option key={opt} value={opt}>{opt === 'pigment_base' ? '顔料＋ベース型' : '基本色混合型'}</option>)}
                        </Select>
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


interface InkSeriesManagerProps {
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
}

const InkSeriesManager: React.FC<InkSeriesManagerProps> = ({ database, setDatabase }) => {
    const { currentPage } = useNavigation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSeries, setEditingSeries] = useState<Partial<InkSeries> | null>(null);

    const series = useMemo(() => (database.ink_series?.data as InkSeries[]) || [], [database.ink_series]);
    const manufacturers = useMemo(() => (database.ink_manufacturers?.data as InkManufacturer[]) || [], [database.ink_manufacturers]);
    const manufacturersMap = useMemo(() => new Map(manufacturers.map(m => [m.id, m.name])), [manufacturers]);

    const { categoryOptions, mixingStyleOptions } = useMemo(() => {
        const categories = new Set<string>();
        const mixingStyles = new Set<string>();
        series.forEach(s => {
            if (s.category) categories.add(s.category);
            if (s.mixing_style) mixingStyles.add(s.mixing_style);
        });
        return { 
            categoryOptions: ['水性', '油性', '溶剤', ...Array.from(categories)],
            mixingStyleOptions: ['pigment_base', 'color_mixing', ...Array.from(mixingStyles)]
        };
    }, [series]);

    const handleOpenModal = (seriesData: Partial<InkSeries> | null) => {
        setEditingSeries(seriesData);
        setIsModalOpen(true);
    };

    const handleSave = async (seriesData: Partial<InkSeries>) => {
        const isEdit = !!seriesData.id;
        const seriesId = isEdit ? seriesData.id : `inks_${Date.now()}`;
        
        // まずローカル状態を更新
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            const seriesTable = newDb.ink_series.data as InkSeries[];
            if (isEdit) {
                const index = seriesTable.findIndex(s => s.id === seriesData.id);
                if (index > -1) seriesTable[index] = { ...seriesTable[index], ...seriesData };
            } else {
                seriesTable.push({ ...seriesData, id: seriesId } as InkSeries);
            }
            return newDb;
        });

        // サーバーに保存
        try {
            const operation = isEdit
                ? [{ type: 'UPDATE' as const, data: seriesData, where: { id: seriesId } }]
                : [{ type: 'INSERT' as const, data: { ...seriesData, id: seriesId } }];
            
            const result = await updateDatabase(currentPage, 'ink_series', operation, database);
            if (!result.success) {
                throw new Error(result.error || 'Failed to save ink series to server');
            }
        } catch (error) {
            console.error('[InkSeriesManager] Failed to save to server:', error);
            alert('サーバーへの保存に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
        }

        setIsModalOpen(false);
    };

    const handleDelete = async (seriesId: string) => {
        if (window.confirm('このインクシリーズを削除しますか？')) {
            // まずローカル状態から削除
            setDatabase(db => {
                if (!db) return null;
                const newDb = JSON.parse(JSON.stringify(db));
                newDb.ink_series.data = newDb.ink_series.data.filter((s: Row) => s.id !== seriesId);
                return newDb;
            });

            // サーバーから削除
            try {
                const operation = [{ type: 'DELETE' as const, where: { id: seriesId } }];
                const result = await updateDatabase(currentPage, 'ink_series', operation, database);
                if (!result.success) {
                    throw new Error(result.error || 'Failed to delete ink series from server');
                }
            } catch (error) {
                console.error('[InkSeriesManager] Failed to delete from server:', error);
                alert('サーバーからの削除に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
            }
        }
    };

    return (
        <div className="flex flex-col h-full">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">インクシリーズ管理</h1>
                    <p className="text-gray-500 mt-1">インクのシリーズ、メーカー、カテゴリ、調色スタイルを管理します。</p>
                </div>
                <Button onClick={() => handleOpenModal(null)}>
                    <PlusIcon className="w-5 h-5 mr-2"/> 新規シリーズを追加
                </Button>
            </header>

            <div className="flex-grow bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md overflow-hidden">
                <div className="overflow-auto h-full">
                    <table className="min-w-full divide-y divide-base-300 dark:divide-base-dark-300 text-sm">
                        <thead className="sticky top-0 bg-base-200 dark:bg-base-dark-300">
                            <tr>
                                <th className="p-2 text-left">シリーズ名</th>
                                <th className="p-2 text-left">メーカー</th>
                                <th className="p-2 text-left">カテゴリ</th>
                                <th className="p-2 text-left">調色スタイル</th>
                                <th className="p-2 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-base-300 dark:divide-base-dark-300">
                            {series.map(s => (
                                <tr key={s.id}>
                                    <td className="p-2 font-semibold">{s.name}</td>
                                    <td className="p-2">{manufacturersMap.get(s.manufacturer_id) || s.manufacturer_id}</td>
                                    <td className="p-2">{s.category}</td>
                                    <td className="p-2">{s.mixing_style === 'pigment_base' ? '顔料＋ベース型' : '基本色混合型'}</td>
                                    <td className="p-2 text-right">
                                        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(s)}><PencilIcon className="w-4 h-4"/></Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}><TrashIcon className="w-4 h-4 text-red-500"/></Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <InkSeriesEditModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                series={editingSeries}
                manufacturers={manufacturers}
                categoryOptions={[...new Set(categoryOptions)]}
                mixingStyleOptions={[...new Set(mixingStyleOptions)]}
            />
        </div>
    );
};

export default InkSeriesManager;
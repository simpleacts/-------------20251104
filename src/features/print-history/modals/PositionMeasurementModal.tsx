
import React, { useEffect, useMemo, useState } from 'react';
import { getAllManufacturerTableData, getManufacturerTable } from '@core/utils';
import { Database, Row } from '@shared/types';
import { PlusIcon, TrashIcon, XMarkIcon } from '@components/atoms';

interface PositionMeasurementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (notesJson: string) => void;
    initialNotes: string;
    design: Row;
    quoteItems: Row[];
    database: Database;
}

interface Measurement {
    id: string;
    label: string;
}

const SIZE_ORDER: { [key: string]: number } = {
    'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, 'XXL': 6, 'XXXL': 7, 'XXXXL': 8,
    'G-S': 9, 'G-M': 10, 'G-L': 11, 'WM': 12, 'WL': 13, 'F': 14,
    '90': -8, '100': -7, '110': -6, '120': -5, '130': -4, '140': -3, '150': -2, '160': -1,
};


const PositionMeasurementModal: React.FC<PositionMeasurementModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialNotes,
    design,
    quoteItems,
    database
}) => {
    const [metrics, setMetrics] = useState<Measurement[]>([]);
    const [sizes, setSizes] = useState<string[]>(['']);
    const [measurements, setMeasurements] = useState<Record<string, Record<string, string>>>({}); // { [size]: { [metricLabel]: value } }

    const availableSizes = useMemo(() => {
        const productIds = new Set(quoteItems.map(item => item.product_id));
        if (productIds.size === 0) return [];
        
        // stockテーブルからサイズ情報を取得
        const sizeSet = new Set<string>();
        const manufacturers = database.manufacturers?.data || [];
        
        manufacturers.forEach((manufacturer: Row) => {
            const manufacturerId = manufacturer.id as string;
            if (!manufacturerId) return;
            
            // products_masterからproductCodeを取得
            const productsMaster = getManufacturerTable(database, 'products_master', manufacturerId);
            if (!productsMaster?.data) return;
            
            // quoteItemsのproduct_idに対応するproductCodeを取得
            const productCodes = new Set<string>();
            productsMaster.data.forEach((product: Row) => {
                if (productIds.has(product.id as string)) {
                    const productCode = product.productCode as string;
                    if (productCode) {
                        productCodes.add(productCode);
                    }
                }
            });
            
            // stockテーブルからサイズ情報を取得
            const stockTable = getManufacturerTable(database, 'stock', manufacturerId);
            if (stockTable?.data) {
                stockTable.data.forEach((stockItem: Row) => {
                    const productCode = stockItem.product_code as string;
                    const sizeName = stockItem.size_name as string;
                    if (productCodes.has(productCode) && sizeName) {
                        sizeSet.add(sizeName);
                    }
                });
            }
        });
        
        return Array.from(sizeSet).sort((a, b) => (SIZE_ORDER[a] || 99) - (SIZE_ORDER[b] || 99));
    }, [quoteItems, database]);

    const locationMetrics = useMemo(() => {
        return (database.print_location_metrics?.data || [])
            .filter(m => m.location_id === design.location);
    }, [database.print_location_metrics, design.location]);

    useEffect(() => {
        if (isOpen) {
            let initialMeasurements: Record<string, Record<string, string>> = {};
            try {
                const parsed = JSON.parse(initialNotes);
                if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                    initialMeasurements = parsed;
                }
            } catch {}

            const initialSizes = Object.keys(initialMeasurements);
            setSizes(initialSizes.length > 0 ? initialSizes : ['']);
            setMeasurements(initialMeasurements);
            
            const labelsInNotes = new Set<string>();
            Object.values(initialMeasurements).forEach(sizeData => {
                Object.keys(sizeData).forEach(label => labelsInNotes.add(label));
            });

            const baseMetricLabels = new Set(locationMetrics.map(m => m.metric_label as string));
            const customMetrics = Array.from(labelsInNotes).filter(label => !baseMetricLabels.has(label));
            
            const allLabels = [...baseMetricLabels, ...customMetrics];
            if (allLabels.length === 0) {
                allLabels.push('');
            }
            // FIX: Explicitly type `label` as string in the map callback to prevent it from being inferred as `unknown`.
            setMetrics(allLabels.map((label: string) => ({ id: `metric_${Date.now()}_${Math.random()}`, label })));
        }
    }, [isOpen, initialNotes, design.location, locationMetrics]);

    if (!isOpen) return null;

    const addMetric = () => setMetrics(prev => [...prev, { id: `metric_${Date.now()}`, label: '' }]);
    const removeMetric = (id: string) => setMetrics(prev => prev.filter(m => m.id !== id));
    const updateMetricLabel = (id: string, newLabel: string) => {
        const oldLabel = metrics.find(m => m.id === id)?.label;
        if (oldLabel === newLabel) return;

        setMetrics(prev => prev.map(m => m.id === id ? { ...m, label: newLabel } : m));
        
        // Update measurements keys
        if (oldLabel) {
            setMeasurements(prevMeasurements => {
                const newMeasurements = { ...prevMeasurements };
                Object.keys(newMeasurements).forEach(size => {
                    if (newMeasurements[size][oldLabel]) {
                        newMeasurements[size][newLabel] = newMeasurements[size][oldLabel];
                        delete newMeasurements[size][oldLabel];
                    }
                });
                return newMeasurements;
            });
        }
    };

    const addSizeRow = () => setSizes(prev => [...prev, '']);
    const removeSizeRow = (index: number) => {
        const sizeToRemove = sizes[index];
        setSizes(prev => prev.filter((_, i) => i !== index));
        setMeasurements(prev => {
            const newMeasurements = { ...prev };
            delete newMeasurements[sizeToRemove];
            return newMeasurements;
        });
    };

    const updateSize = (index: number, newSize: string) => {
        const oldSize = sizes[index];
        setSizes(prev => prev.map((s, i) => i === index ? newSize : s));
        if (oldSize && oldSize !== newSize && measurements[oldSize]) {
            setMeasurements(prev => {
                const newMeasurements = { ...prev };
                newMeasurements[newSize] = newMeasurements[oldSize];
                delete newMeasurements[oldSize];
                return newMeasurements;
            });
        }
    };
    
    const updateMeasurementValue = (size: string, metricLabel: string, value: string) => {
        setMeasurements(prev => ({
            ...prev,
            [size]: {
                ...(prev[size] || {}),
                [metricLabel]: value
            }
        }));
    };

    const handleSave = () => {
        const output: Record<string, Record<string, string>> = {};
        const seenSizes = new Set<string>();

        for (const size of sizes) {
            if (!size) continue;
            if (seenSizes.has(size)) {
                alert('同じサイズが複数登録されています。修正してください。');
                return;
            }
            seenSizes.add(size);
            
            const measurementForSize = measurements[size];
            if (measurementForSize) {
                const cleanedMeasurements: Record<string, string> = {};
                metrics.forEach(metric => {
                    if (metric.label.trim() && measurementForSize[metric.label] && measurementForSize[metric.label].trim()) {
                        cleanedMeasurements[metric.label] = measurementForSize[metric.label];
                    }
                });
                if(Object.keys(cleanedMeasurements).length > 0) {
                    output[size] = cleanedMeasurements;
                }
            }
        }
        onSave(JSON.stringify(output));
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold">印刷位置の計測値を登録</h2>
                    <button onClick={onClose} className="p-1 rounded-full"><XMarkIcon className="w-6 h-6"/></button>
                </header>
                <main className="p-6 overflow-auto">
                    <div className="flex justify-end mb-2">
                        <button onClick={addMetric} className="flex items-center gap-1 text-xs bg-gray-200 px-2 py-1 rounded"><PlusIcon className="w-3 h-3"/> 項目を追加</button>
                    </div>
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-800">
                                <th className="p-2 border border-default w-32">サイズ</th>
                                {metrics.map(metric => (
                                    <th key={metric.id} className="p-2 border border-default">
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="text"
                                                value={metric.label}
                                                onChange={(e) => updateMetricLabel(metric.id, e.target.value)}
                                                list="metric-suggestions"
                                                className="w-full p-1 border-none focus:ring-1 focus:ring-brand-primary bg-transparent text-center"
                                                placeholder="項目名"
                                            />
                                            <button onClick={() => removeMetric(metric.id)} className="p-0.5 text-red-500"><TrashIcon className="w-3 h-3"/></button>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sizes.map((size, index) => {
                                const selectedSizes = sizes.filter((_, i) => i !== index);
                                return (
                                    <tr key={`size-row-${index}`}>
                                        <td className="p-1 border border-default">
                                            <select 
                                                value={size} 
                                                onChange={(e) => updateSize(index, e.target.value)}
                                                className="w-full p-1 border-none focus:ring-1 focus:ring-brand-primary bg-transparent"
                                            >
                                                <option value="">選択...</option>
                                                {availableSizes.map(s => <option key={s} value={s} disabled={selectedSizes.includes(s)}>{s}</option>)}
                                            </select>
                                        </td>
                                        {metrics.map(metric => (
                                            <td key={metric.id} className="p-1 border border-default">
                                                <input
                                                    type="text"
                                                    value={size && metric.label ? (measurements[size]?.[metric.label] || '') : ''}
                                                    onChange={(e) => updateMeasurementValue(size, metric.label, e.target.value)}
                                                    className="w-full p-1 text-center border-none focus:ring-1 focus:ring-brand-primary bg-transparent"
                                                    placeholder="-"
                                                    disabled={!size || !metric.label}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                    <datalist id="metric-suggestions">
                        {locationMetrics.map(m => <option key={m.id as string} value={m.metric_label as string} />)}
                    </datalist>
                    <button onClick={addSizeRow} className="mt-4 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-semibold">
                        <PlusIcon className="w-4 h-4" /> サイズを追加
                    </button>
                </main>
                <footer className="flex justify-end gap-3 p-4 bg-base-200 dark:bg-base-dark-300/50 border-t">
                    <button onClick={onClose} className="px-4 py-2 rounded bg-gray-300">キャンセル</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded bg-brand-primary text-white">保存</button>
                </footer>
            </div>
        </div>
    );
};

export default PositionMeasurementModal;

import React, { useEffect, useMemo, useState } from 'react';
import { AppData, PlateType, PrintDesign, PrintLocationData, PrintSize, SpecialInkType } from '@shared/types';
import { TrashIcon } from '@components/atoms';
import resizeImage from '@features/proofing-tool/utils/imageUtils';

interface PrintDesignFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (design: PrintDesign) => void;
    design: Partial<PrintDesign>;
    appData: AppData;
    selectedCategoryId?: string;
}

// FIX: Refactored to a function declaration to resolve potential build tool scoping issues.
function PrintDesignForm({ isOpen, onClose, onSave, design, appData, selectedCategoryId }: PrintDesignFormProps) {
    const [localDesign, setLocalDesign] = useState<Partial<PrintDesign>>({printMethod: 'silkscreen', ...design});
    const [inkToAdd, setInkToAdd] = useState('');

    useEffect(() => {
        setLocalDesign({printMethod: 'silkscreen', ...design});
    }, [design]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const originalSrc = event.target?.result as string;
                const previewSrc = await resizeImage(originalSrc);
                setLocalDesign(prev => ({ ...prev, imageSrc: previewSrc, originalImageSrc: originalSrc, imageName: file.name }));
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSave = () => {
        const { printMethod, location, imageSrc, originalImageSrc, imageName } = localDesign;
    
        if (!location) {
            alert("プリント箇所は必須です。");
            return;
        }

        let finalDesign: PrintDesign;

        if (printMethod === 'dtf') {
            const { widthCm = 0, heightCm = 0 } = localDesign;
            if (widthCm <= 0 || heightCm <= 0) {
                alert("DTFの幅と高さは0より大きい数値を入力してください。");
                return;
            }
            finalDesign = {
                id: localDesign.id || `design_${Date.now()}`,
                location, imageSrc, originalImageSrc, imageName,
                printMethod: 'dtf',
                widthCm, heightCm
            };
        } else { // silkscreen
            const { size, colors = 0, specialInks = [], plateType = 'normal' } = localDesign;
            if (!size || colors <= 0) {
                alert("シルクスクリーンのサイズと色数は必須です。");
                return;
            }
            const totalSpecialInkCount = specialInks.reduce((sum, ink) => sum + ink.count, 0);
            if (totalSpecialInkCount > colors) {
                alert(`特殊インクの合計色数 (${totalSpecialInkCount}色) が、デザインの総色数 (${colors}色) を超えています。`);
                return;
            }
            finalDesign = {
                id: localDesign.id || `design_${Date.now()}`,
                location, imageSrc, originalImageSrc, imageName,
                printMethod: 'silkscreen',
                size, colors, specialInks, plateType
            };
        }
        onSave(finalDesign);
    };

    const handleAddInk = () => {
        if (!inkToAdd) return;
        const existingInks = localDesign.specialInks || [];
        if (existingInks.some(i => i.type === inkToAdd)) return; // Prevent duplicates

        setLocalDesign(prev => ({
            ...prev,
            specialInks: [...existingInks, { type: inkToAdd as SpecialInkType, count: 1 }]
        }));
        setInkToAdd('');
    };

    const handleRemoveInk = (type: SpecialInkType) => {
        setLocalDesign(prev => ({
            ...prev,
            specialInks: (prev.specialInks || []).filter(i => i.type !== type)
        }));
    };

    const handleInkCountChange = (type: SpecialInkType, count: number) => {
        const validCount = Math.max(1, Math.min(count, localDesign.colors || 1));
        setLocalDesign(prev => ({
            ...prev,
            specialInks: (prev.specialInks || []).map(i => i.type === type ? { ...i, count: validCount } : i)
        }));
    };

    const availableLocations = useMemo(() => {
        if (!selectedCategoryId) return appData.printLocations;
        const allowedIds = appData.pricing.categoryPrintLocations[selectedCategoryId];
        if (!allowedIds) return appData.printLocations;
        return appData.printLocations.filter(loc => allowedIds.includes(loc.locationId));
    }, [appData.printLocations, appData.pricing.categoryPrintLocations, selectedCategoryId]);

    const groupedLocations = useMemo(() => {
        return availableLocations.reduce((acc, loc) => {
            const groupName = loc.groupName || 'その他';
            if (!acc[groupName]) {
                acc[groupName] = [];
            }
            acc[groupName].push(loc);
            return acc;
        }, {} as Record<string, PrintLocationData[]>);
    }, [availableLocations]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b"><h2 className="text-xl font-bold">プリントデザインの編集</h2></header>
                <main className="p-6 space-y-4">
                    <div>
                        <label htmlFor="design-image-input" className="block text-sm font-medium mb-1">デザイン画像</label>
                        <input id="design-image-input" name="design_image" type="file" accept="image/*" onChange={handleFileChange} className="text-sm"/>
                        {localDesign.imageSrc && <img src={localDesign.imageSrc} alt="Preview" className="mt-2 max-h-40 border rounded-md" loading="lazy"/>}
                    </div>
                    
                    <div className="flex items-center gap-2 p-1 bg-input-bg dark:bg-input-bg-dark rounded-lg">
                        <button type="button" onClick={() => setLocalDesign(prev => ({...prev, printMethod: 'silkscreen'}))} className={`flex-1 py-1 text-sm rounded ${localDesign.printMethod === 'silkscreen' ? 'bg-white dark:bg-base-dark-200 shadow' : ''}`}>シルクスクリーン</button>
                        <button type="button" onClick={() => setLocalDesign(prev => ({...prev, printMethod: 'dtf'}))} className={`flex-1 py-1 text-sm rounded ${localDesign.printMethod === 'dtf' ? 'bg-white dark:bg-base-dark-200 shadow' : ''}`}>DTF</button>
                    </div>

                    <div>
                        <label htmlFor="print-location-select" className="block text-sm font-medium mb-1">プリント箇所</label>
                        <select id="print-location-select" name="print_location" value={localDesign.location || ''} onChange={e => setLocalDesign(p => ({...p, location: e.target.value}))} className="w-full p-2 border border-default rounded bg-input-bg dark:bg-input-bg-dark">
                            <option value="">選択してください...</option>
                            {Object.entries(groupedLocations).map(([groupName, locations]) => (
                                <optgroup label={groupName} key={groupName}>
                                    {/* FIX: Add Array.isArray check to prevent runtime error on map */}
                                    {Array.isArray(locations) && locations.map(loc => <option key={loc.locationId} value={loc.locationId}>{loc.label}</option>)}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                    
                    {localDesign.printMethod === 'silkscreen' ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="print-size-select" className="block text-sm font-medium mb-1">プリントサイズ</label>
                                    <select id="print-size-select" name="print_size" value={localDesign.size || ''} onChange={e => setLocalDesign(p => ({...p, size: e.target.value as PrintSize}))} className="w-full p-2 border border-default rounded bg-input-bg dark:bg-input-bg-dark">
                                        <option value="">選択...</option><option value="10x10">10x10</option><option value="30x40">30x40</option><option value="35x50">35x50</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="color-count-input" className="block text-sm font-medium mb-1">色数</label>
                                    <input id="color-count-input" name="color_count" type="number" step="1" value={localDesign.colors === 0 ? '' : localDesign.colors ?? ''} onChange={e => { const num = parseInt(e.target.value, 10); setLocalDesign(p => ({...p, colors: isNaN(num) ? 0 : num})); }} placeholder="0" className="w-full p-2 border border-default rounded bg-input-bg dark:bg-input-bg-dark"/>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="plate-type-select" className="block text-sm font-medium mb-1">版の種類</label>
                                <select id="plate-type-select" name="plate_type" value={localDesign.plateType || 'normal'} onChange={e => setLocalDesign(p => ({...p, plateType: e.target.value as PlateType}))} className="w-full p-2 border border-default rounded bg-input-bg dark:bg-input-bg-dark">
                                    <option value="normal">通常版</option><option value="decomposition">分解版</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="special-ink-select" className="block text-sm font-medium mb-1">特殊インク</label>
                                <div className="flex gap-2">
                                    <select id="special-ink-select" name="special_ink" value={inkToAdd} onChange={e => setInkToAdd(e.target.value)} className="flex-grow p-2 border border-default rounded bg-input-bg dark:bg-input-bg-dark">
                                        <option value="">追加するインク...</option>
                                        {appData.pricing.specialInkOptions.map(opt => <option key={opt.type} value={opt.type}>{opt.displayName}</option>)}
                                    </select>
                                    <button onClick={handleAddInk} className="px-4 bg-gray-200 rounded">追加</button>
                                </div>
                                <div className="mt-2 space-y-2">
                                    {(localDesign.specialInks || []).map(ink => (
                                        <div key={ink.type} className="flex items-center gap-2">
                                            <span>{appData.pricing.specialInkOptions.find(o => o.type === ink.type)?.displayName}</span>
                                            <input type="number" min="1" max={localDesign.colors} value={ink.count} onChange={e => handleInkCountChange(ink.type, +e.target.value)} className="w-16 p-1 border rounded text-center"/>
                                            <span>色</span>
                                            <button onClick={() => handleRemoveInk(ink.type)} className="ml-auto text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="width-cm-input" className="block text-sm font-medium mb-1">幅 (cm)</label>
                                <input id="width-cm-input" name="width_cm" type="number" step="1" value={localDesign.widthCm === 0 ? '' : localDesign.widthCm ?? ''} onChange={e => { const num = parseInt(e.target.value, 10); setLocalDesign(p => ({...p, widthCm: isNaN(num) ? 0 : num})); }} placeholder="0" className="w-full p-2 border border-default rounded bg-input-bg dark:bg-input-bg-dark"/>
                            </div>
                            <div>
                                <label htmlFor="height-cm-input" className="block text-sm font-medium mb-1">高さ (cm)</label>
                                <input id="height-cm-input" name="height_cm" type="number" step="1" value={localDesign.heightCm === 0 ? '' : localDesign.heightCm ?? ''} onChange={e => { const num = parseInt(e.target.value, 10); setLocalDesign(p => ({...p, heightCm: isNaN(num) ? 0 : num})); }} placeholder="0" className="w-full p-2 border border-default rounded bg-input-bg dark:bg-input-bg-dark"/>
                            </div>
                        </div>
                    )}
                </main>
                <footer className="p-4 border-t flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">キャンセル</button>
                    <button type="button" onClick={handleSave} className="px-4 py-2 bg-brand-primary text-white rounded">保存</button>
                </footer>
            </div>
        </div>
    );
};

export default PrintDesignForm;
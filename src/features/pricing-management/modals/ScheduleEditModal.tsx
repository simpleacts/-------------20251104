import React, { useEffect, useMemo, useState } from 'react';
import { Database, Row } from '@shared/types';
import { PlusIcon, TrashIcon, XMarkIcon } from '@components/atoms';

interface ScheduleEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (schedule: Row, tiers: Row[]) => void;
    scheduleId: string | null;
    duplicateFromScheduleId?: string | null;
    database: Database;
    currentUser: Row;
}

const ScheduleEditModal: React.FC<ScheduleEditModalProps> = ({ isOpen, onClose, onSave, scheduleId, duplicateFromScheduleId, database, currentUser }) => {
    const [schedule, setSchedule] = useState<Row>({});
    const [tiers, setTiers] = useState<Row[]>([]);
    const [isLumpMap, setIsLumpMap] = useState<Record<number, boolean>>({});

    const isNew = scheduleId === null && !duplicateFromScheduleId;
    const isDuplicating = !!duplicateFromScheduleId;

    const isAdmin = useMemo(() => {
        if (!currentUser || !database?.roles?.data) return false;
        const adminRole = database.roles.data.find(r => r.name === '管理者');
        return adminRole && currentUser.role_id === adminRole.id;
    }, [currentUser, database?.roles?.data]);

    useEffect(() => {
        if (isOpen) {
            if (isDuplicating && duplicateFromScheduleId) {
                const sourceSch = (database?.print_pricing_schedules?.data || []).find(s => s.id === duplicateFromScheduleId);
                const sourceTiers = (database?.print_pricing_tiers?.data || []).filter(t => t.schedule_id === duplicateFromScheduleId);

                if (sourceSch) {
                    setSchedule({
                        ...sourceSch,
                        id: null,
                        name: `${sourceSch.name} (コピー)`
                    });
                    
                    const newTiers = sourceTiers.map((t): Row => ({ ...t, id: null, schedule_id: null }));
                    
                    const initialLumpMap: Record<number, boolean> = {};
                    const cleanedTiers = newTiers.map((tier, index) => {
                        const isLump = (tier.additionalColor as number) < 0;
                        initialLumpMap[index] = isLump;
                        const cleanedTier = {...tier};
                        if (isLump) {
                            cleanedTier.additionalColor = tier.additionalColor === -1 ? 0 : Math.abs(tier.additionalColor as number);
                        }
                        return cleanedTier;
                    });

                    setTiers(cleanedTiers.sort((a, b) => (a.min as number) - (b.min as number)));
                    setIsLumpMap(initialLumpMap);
                }
            } else if (isNew) {
                setSchedule({ name: '', owner_user_id: isAdmin ? null : currentUser.id });
                const initialTiers = [{ id: null, min: 1, max: 9, firstColor: 0, additionalColor: 0 }];
                setTiers(initialTiers);
                setIsLumpMap({ 0: false });
            } else {
                const sch = (database?.print_pricing_schedules?.data || []).find(s => s.id === scheduleId);
                const schTiers = (database?.print_pricing_tiers?.data || []).filter(t => t.schedule_id === scheduleId);
                
                const initialLumpMap: Record<number, boolean> = {};
                const cleanedTiers = schTiers.map((tier, index) => {
                    const isLump = (tier.additionalColor as number) < 0;
                    initialLumpMap[index] = isLump;
                    const cleanedTier = {...tier};
                    if (isLump) {
                        cleanedTier.additionalColor = tier.additionalColor === -1 ? 0 : Math.abs(tier.additionalColor as number);
                    }
                    return cleanedTier;
                });

                setSchedule(sch || {});
                setTiers(cleanedTiers.sort((a, b) => (a.min as number) - (b.min as number)));
                setIsLumpMap(initialLumpMap);
            }
        }
    }, [scheduleId, duplicateFromScheduleId, database, isNew, isDuplicating, isAdmin, currentUser.id, isOpen]);
    
    const handleTierChange = (index: number, field: keyof Row, value: string) => {
        const newTiers = [...tiers];
        const currentTier = { ...newTiers[index] };

        if (value === '') {
            currentTier[field] = '';
        } else {
            const numValue = parseInt(value, 10);
            if (!isNaN(numValue)) {
                if ((field === 'min' || field === 'max') && numValue < 0) return;
                currentTier[field] = numValue;
            } else {
                 return;
            }
        }
        
        newTiers[index] = currentTier;

        const numValue = currentTier[field];
        if (field === 'max' && index < newTiers.length - 1) {
            newTiers[index + 1] = { ...newTiers[index + 1], min: numValue === '' ? '' : (numValue as number) + 1 };
        } else if (field === 'min' && index > 0) {
             newTiers[index - 1] = { ...newTiers[index - 1], max: numValue === '' ? '' : (numValue as number) - 1 };
        }
        
        setTiers(newTiers);
    };

    const handlePricingModelChange = (index: number, model: 'per_item' | 'lump') => {
        setIsLumpMap(prev => ({...prev, [index]: model === 'lump'}));
    };
    
    const addTierAfter = (index: number) => {
        const newTiers = [...tiers];
        const currentTier = newTiers[index];
        const currentMax = currentTier.max as number;

        if (currentMax === null || currentMax === undefined || currentMax < (currentTier.min as number)) {
            alert('新しい階層を追加する前に、現在の階層の最大値を正しく設定してください。');
            return;
        }

        const newMin = currentMax + 1;

        const newTier: Row = {
            id: null,
            min: newMin,
            max: newMin + 9, // Default to a range of 10
            firstColor: currentTier.firstColor,
            additionalColor: currentTier.additionalColor,
        };
        
        newTiers.splice(index + 1, 0, newTier);
        setTiers(newTiers);
        setIsLumpMap(prev => ({...prev, [index + 1]: isLumpMap[index]}));
    };

    const removeTier = (index: number) => {
        if (tiers.length <= 1) return;

        const newTiers = tiers.filter((_, i) => i !== index);
        
        if (index > 0 && index < tiers.length) {
            newTiers[index - 1] = { ...newTiers[index - 1], max: newTiers[index]?.min ? (newTiers[index].min as number) - 1 : tiers[index].max };
        } else if (index === 0 && newTiers.length > 0) {
             newTiers[0] = { ...newTiers[0], min: 1 };
        }
        
        setTiers(newTiers);
        const newLumpMap = { ...isLumpMap };
        delete newLumpMap[index];
        setIsLumpMap(newLumpMap);
    };
    
    const handleSave = () => {
        if (!schedule.name || String(schedule.name).trim() === '') {
            alert('単価表名を入力してください。');
            return;
        }

        for (let i = 0; i < tiers.length; i++) {
            const tier = tiers[i];
            const min = tier.min === '' ? NaN : Number(tier.min);
            const max = tier.max === '' ? NaN : Number(tier.max);

            if (isNaN(min) || isNaN(max) || (i > 0 && min < 1) || (i === 0 && min < 1 && !isNew)) {
                alert(`階層 ${i+1} の枚数範囲を正しく入力してください。`);
                return;
            }

            if (max < min) {
                alert(`階層 ${i+1} の最大枚数が最小枚数より小さくなっています。(${min} ~ ${max})。修正してください。`);
                return;
            }
            if (i > 0) {
                const prevTier = tiers[i - 1];
                const prevMax = Number(prevTier.max);
                if (prevMax + 1 !== min) {
                    alert(`枚数範囲が連続していません。階層 ${i} と ${i+1} の間に隙間または重複があります。`);
                    return;
                }
            }
        }
        
        const finalTiers = tiers.map((tier, index) => {
            const newTier = {...tier};
            if (isLumpMap[index]) {
                const addColor = Number(newTier.additionalColor);
                if (addColor > 0) {
                    newTier.additionalColor = -addColor;
                } else if (addColor === 0 || isNaN(addColor)) {
                    newTier.additionalColor = -1; // Flag for lump sum with 0 additional price
                }
            }
            return newTier;
        });
        
        const scheduleToSave = { ...schedule };
        if (isDuplicating && !isAdmin) {
            scheduleToSave.owner_user_id = currentUser.id;
        }

        onSave(scheduleToSave, finalTiers);
    };

    const users = database.users?.data || [];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-default dark:border-default-dark">
                    <h2 className="text-xl font-bold">{isDuplicating ? '単価表を複製' : (isNew ? '新規単価表を作成' : '単価表を編集')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                <main className="overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="schedule-name" className="block text-sm font-medium mb-1">単価表名</label>
                            <input
                                id="schedule-name"
                                type="text"
                                value={schedule.name || ''}
                                onChange={e => setSchedule(s => ({ ...s, name: e.target.value }))}
                                className="w-full bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm"
                            />
                        </div>
                        {isAdmin && (
                            <div>
                                <label htmlFor="owner-user" className="block text-sm font-medium mb-1">担当ユーザー</label>
                                <select
                                    id="owner-user"
                                    value={schedule.owner_user_id === null ? 'null' : (schedule.owner_user_id || '')}
                                    onChange={e => setSchedule(s => ({ ...s, owner_user_id: e.target.value === 'null' ? null : e.target.value }))}
                                    className="w-full bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm"
                                >
                                    <option value="null">共用</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>{user.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className="text-lg font-bold mb-2">単価階層</h3>
                        <div className="space-y-2">
                            {tiers.map((tier, index) => {
                                const isLump = isLumpMap[index];
                                const tierId = tier.id || `tier-${index}`;
                                return (
                                <div key={tierId} className="grid grid-cols-12 gap-2 items-center bg-base-200 dark:bg-base-dark-300 p-2 rounded-md">
                                    <div className="col-span-3 flex items-center gap-1 text-sm">
                                        <label htmlFor={`tier-${index}-min`} className="sr-only">最小枚数</label>
                                        <input
                                            id={`tier-${index}-min`}
                                            name={`tier-${index}-min`}
                                            type="number"
                                            value={tier.min ?? ''}
                                            onChange={e => handleTierChange(index, 'min', e.target.value)}
                                            className="w-full p-1 border rounded"
                                            onWheel={e => (e.target as HTMLInputElement).blur()}
                                            disabled={index === 0}
                                        />
                                        <span>~</span>
                                        <label htmlFor={`tier-${index}-max`} className="sr-only">最大枚数</label>
                                        <input
                                            id={`tier-${index}-max`}
                                            name={`tier-${index}-max`}
                                            type="number"
                                            value={tier.max ?? ''}
                                            onChange={e => handleTierChange(index, 'max', e.target.value)}
                                            className="w-full p-1 border rounded"
                                            onWheel={e => (e.target as HTMLInputElement).blur()}
                                        />
                                    </div>
                                     <div className="col-span-3">
                                        <label htmlFor={`tier-${index}-pricing-model`} className="text-xs">価格モデル</label>
                                        <select
                                            id={`tier-${index}-pricing-model`}
                                            name={`tier-${index}-pricing-model`}
                                            value={isLump ? 'lump' : 'per_item'}
                                            onChange={e => handlePricingModelChange(index, e.target.value as any)}
                                            className="w-full p-1 border rounded"
                                        >
                                            <option value="per_item">単価制</option>
                                            <option value="lump">一括価格制</option>
                                        </select>
                                    </div>
                                    {isLump ? (
                                        <>
                                            <div className="col-span-2">
                                                <label htmlFor={`tier-${index}-first-color-lump`} className="text-xs">1色目 一括価格 (円)</label>
                                                <input
                                                    id={`tier-${index}-first-color-lump`}
                                                    name={`tier-${index}-first-color-lump`}
                                                    type="number"
                                                    value={tier.firstColor ?? ''}
                                                    onChange={e => handleTierChange(index, 'firstColor', e.target.value)}
                                                    className="w-full p-1 border rounded"
                                                    onWheel={e => (e.target as HTMLInputElement).blur()}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label htmlFor={`tier-${index}-additional-color-lump`} className="text-xs">追加色 一括価格 (円)</label>
                                                <input
                                                    id={`tier-${index}-additional-color-lump`}
                                                    name={`tier-${index}-additional-color-lump`}
                                                    type="number"
                                                    value={tier.additionalColor ?? ''}
                                                    onChange={e => handleTierChange(index, 'additionalColor', e.target.value)}
                                                    className="w-full p-1 border rounded"
                                                    onWheel={e => (e.target as HTMLInputElement).blur()}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="col-span-2">
                                                <label htmlFor={`tier-${index}-first-color`} className="text-xs">1色目単価</label>
                                                <input
                                                    id={`tier-${index}-first-color`}
                                                    name={`tier-${index}-first-color`}
                                                    type="number"
                                                    value={tier.firstColor ?? ''}
                                                    onChange={e => handleTierChange(index, 'firstColor', e.target.value)}
                                                    className="w-full p-1 border rounded"
                                                    onWheel={e => (e.target as HTMLInputElement).blur()}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label htmlFor={`tier-${index}-additional-color`} className="text-xs">追加色単価</label>
                                                <input
                                                    id={`tier-${index}-additional-color`}
                                                    name={`tier-${index}-additional-color`}
                                                    type="number"
                                                    value={tier.additionalColor ?? ''}
                                                    onChange={e => handleTierChange(index, 'additionalColor', e.target.value)}
                                                    className="w-full p-1 border rounded"
                                                    onWheel={e => (e.target as HTMLInputElement).blur()}
                                                />
                                            </div>
                                        </>
                                    )}
                                    <div className="col-span-2 flex justify-end gap-1">
                                        <button onClick={() => addTierAfter(index)} className="p-1 text-green-600 hover:bg-green-100 rounded-full" title="この階層を分割して新しい階層を追加">
                                            <PlusIcon className="w-4 h-4" />
                                        </button>
                                        {tiers.length > 1 && (
                                            <button onClick={() => removeTier(index)} className="p-1 text-red-500 hover:bg-red-100 rounded-full" title="この階層を削除">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )})}
                        </div>
                    </div>

                </main>

                <footer className="flex justify-end gap-3 p-4 bg-base-200 dark:bg-base-dark-300/50 border-t">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-button-muted-bg text-button-muted dark:bg-button-muted-bg-dark dark:text-button-muted-dark hover:opacity-90">
                        キャンセル
                    </button>
                    <button type="button" onClick={handleSave} className="px-4 py-2 text-sm font-medium rounded-md bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark hover:opacity-90">
                        保存
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default ScheduleEditModal;
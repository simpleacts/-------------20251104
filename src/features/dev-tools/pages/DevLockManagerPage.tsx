import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Database, DevLock } from '@shared/types';
import { Page } from '@core/config/Routes';

const BulkActions: React.FC<{ onAction: (action: 'lock_no_edit' | 'lock_copy_on_edit' | 'unlock') => void }> = ({ onAction }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref]);
    
    const handleSelect = (action: 'lock_no_edit' | 'lock_copy_on_edit' | 'unlock') => {
        onAction(action);
        setIsOpen(false);
    }

    return (
        <div className="relative" ref={ref}>
            <button onClick={() => setIsOpen(!isOpen)} className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                一括設定...
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-base-100 dark:bg-base-dark-200 rounded-md shadow-lg z-30 border border-base-300 dark:border-base-dark-300">
                    <ul className="py-1">
                        <li><a href="#" onClick={(e) => { e.preventDefault(); handleSelect('lock_no_edit'); }} className="block px-4 py-2 text-sm text-base-content dark:text-base-dark-content hover:bg-base-200 dark:hover:bg-base-dark-300">すべてロック (変更不可)</a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); handleSelect('lock_copy_on_edit'); }} className="block px-4 py-2 text-sm text-base-content dark:text-base-dark-content hover:bg-base-200 dark:hover:bg-base-dark-300">すべてロック (コピーして編集)</a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); handleSelect('unlock'); }} className="block px-4 py-2 text-sm text-base-content dark:text-base-dark-content hover:bg-base-200 dark:hover:bg-base-dark-300">すべてのロックを解除</a></li>
                    </ul>
                </div>
            )}
        </div>
    );
};


interface DevLockManagerProps {
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
    allTools: { name: Page; displayName: string }[];
}


const DevLockManager: React.FC<DevLockManagerProps> = ({ database, setDatabase, allTools }) => {
    const [locks, setLocks] = useState<DevLock[]>([]);

    useEffect(() => {
        setLocks((database.dev_locks?.data as DevLock[]) || []);
    }, [database.dev_locks]);
    
    const allComponents = useMemo(() => {
        const tools = allTools.map(tool => ({ type: 'tool' as 'tool', name: tool.name, displayName: tool.displayName }));
            
        const tables = Object.keys(database)
            .filter(name => name !== 'dev_locks')
            .map(name => ({ type: 'table' as 'table', name, displayName: name }))
            .sort((a,b) => a.displayName.localeCompare(b.displayName));
        
        return { tools, tables };
    }, [database, allTools]);

    const getLock = (type: 'tool' | 'table', name: string) => {
        return locks.find(l => l.component_type === type && l.component_name === name);
    };

    const updateLock = (type: 'tool' | 'table', name: string, updates: Partial<Omit<DevLock, 'id' | 'component_type' | 'component_name'>>) => {
        setLocks(prevLocks => {
            const existingLockIndex = prevLocks.findIndex(l => l.component_type === type && l.component_name === name);
            if (existingLockIndex > -1) {
                return prevLocks.map((l, i) => i === existingLockIndex ? { ...l, ...updates } : l);
            } else {
                const newLock: DevLock = {
                    id: `lock_${type}_${name}`,
                    component_type: type,
                    component_name: name,
                    is_locked: false,
                    lock_type: 'no_edit',
                    notes: '',
                    ...updates
                };
                return [...prevLocks, newLock];
            }
        });
    };
    
    const handleSave = () => {
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            if (!newDb.dev_locks) {
                newDb.dev_locks = { schema: database.dev_locks.schema, data: [] };
            }
            newDb.dev_locks.data = locks;
            return newDb;
        });
        alert('開発ロック設定を保存しました。');
    };

    const handleBulkUpdate = (componentType: 'tool' | 'table', action: 'lock_no_edit' | 'lock_copy_on_edit' | 'unlock') => {
        const targetComponents = componentType === 'tool' ? allComponents.tools : allComponents.tables;
        let updatedLocks = [...locks];

        targetComponents.forEach(comp => {
            const existingLockIndex = updatedLocks.findIndex(l => l.component_type === comp.type && l.component_name === comp.name);
            const isLocked = action !== 'unlock';
            const lockType = action === 'lock_no_edit' ? 'no_edit' : (action === 'lock_copy_on_edit' ? 'copy_on_edit' : 'no_edit');

            if (existingLockIndex > -1) {
                const existingLock = updatedLocks[existingLockIndex];
                updatedLocks[existingLockIndex] = {
                    ...existingLock,
                    is_locked: isLocked,
                    lock_type: isLocked ? lockType : existingLock.lock_type, // 解除時は元のタイプを保持
                    notes: existingLock.notes || (isLocked ? '一括設定' : ''),
                };
            } else {
                const newLock: DevLock = {
                    id: `lock_${comp.type}_${comp.name}`,
                    component_type: comp.type,
                    component_name: comp.name,
                    is_locked: isLocked,
                    lock_type: isLocked ? lockType : 'no_edit',
                    notes: isLocked ? '一括設定' : '',
                };
                updatedLocks.push(newLock);
            }
        });
        setLocks(updatedLocks);
    };

    const handleApplyAndLock = (type: 'tool' | 'table', name: string) => {
        updateLock(type, name, { 
            is_locked: true, 
            lock_type: 'no_edit', 
            notes: `バージョン適用済み: ${new Date().toLocaleString('ja-JP')}` 
        });
        alert(`「${name}」の編集内容を適用し、ロック状態を「変更不可」に更新しました。`);
    };

    const renderComponentList = (components: { type: 'tool' | 'table', name: string, displayName: string }[]) => (
        <div className="space-y-3">
            {components.map(comp => {
                const lock = getLock(comp.type, comp.name);
                const isLocked = lock?.is_locked || false;

                return (
                    <div key={`${comp.type}-${comp.name}`} className={`p-3 rounded-md transition-colors ${isLocked ? 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700' : 'bg-base-200 dark:bg-base-dark-300'}`}>
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-sm">{comp.displayName}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs">{isLocked ? 'ロック中' : 'アンロック'}</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={isLocked} onChange={() => updateLock(comp.type, comp.name, { is_locked: !isLocked })} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                                </label>
                            </div>
                        </div>
                        {isLocked && (
                            <div className="mt-3 pt-3 border-t border-yellow-200 dark:border-yellow-800 space-y-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <label className="block text-xs font-medium mb-1">ロック種別</label>
                                        <select value={lock?.lock_type || 'no_edit'} onChange={e => updateLock(comp.type, comp.name, { lock_type: e.target.value as any })} className="w-full p-1 border rounded bg-base-100 dark:bg-base-dark-200 text-xs">
                                            <option value="no_edit">変更不可</option>
                                            <option value="copy_on_edit">コピーして編集</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1">メモ</label>
                                        <input type="text" value={lock?.notes || ''} onChange={e => updateLock(comp.type, comp.name, { notes: e.target.value })} placeholder="理由などを記載..." className="w-full p-1 border rounded bg-base-100 dark:bg-base-dark-200 text-xs" />
                                    </div>
                                </div>
                                {lock?.lock_type === 'copy_on_edit' && (
                                    <div className="pt-2">
                                        <button 
                                            onClick={() => handleApplyAndLock(comp.type, comp.name)}
                                            className="w-full text-center text-xs font-semibold p-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                                        >
                                            このバージョンを適用してロック
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="flex flex-col h-full">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">開発ロック管理</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">AIアシスタントによる変更をコンポーネント単位で制御します。</p>
                </div>
                <button onClick={handleSave} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg">
                    保存
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow min-h-0">
                <div className="bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">ツール ({allComponents.tools.length})</h2>
                        <BulkActions onAction={(action) => handleBulkUpdate('tool', action)} />
                    </div>
                    <div className="overflow-y-auto flex-grow pr-2 -mr-2">
                        {renderComponentList(allComponents.tools)}
                    </div>
                </div>
                <div className="bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md flex flex-col">
                     <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">テーブル ({allComponents.tables.length})</h2>
                         <BulkActions onAction={(action) => handleBulkUpdate('table', action)} />
                    </div>
                    <div className="overflow-y-auto flex-grow pr-2 -mr-2">
                        {renderComponentList(allComponents.tables)}
                    </div>
                </div>
            </div>
        </div>
    );
};
export default DevLockManager;
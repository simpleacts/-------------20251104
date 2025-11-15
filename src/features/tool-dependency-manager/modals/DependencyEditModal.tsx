

import { XMarkIcon } from '@components/atoms';
import { Column, ToolDependency } from '@shared/types';
import React, { useEffect, useState } from 'react';

interface DependencyEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (dependency: ToolDependency) => void;
    toolName: string;
    tableName: string;
    schema: Column[];
    initialDependency?: Partial<ToolDependency>;
    highlightedReadFields?: Set<string>;
    highlightedWriteFields?: Set<string>;
}

type Strategy = 'on_app_start' | 'on_tool_mount' | 'on_demand';
const STRATEGIES: Strategy[] = ['on_app_start', 'on_tool_mount', 'on_demand'];

const DependencyEditModal: React.FC<DependencyEditModalProps> = ({
    isOpen,
    onClose,
    onSave,
    toolName,
    tableName,
    schema,
    initialDependency,
}) => {
    const [readFields, setReadFields] = useState<Record<Strategy, Set<string>>>({
        on_app_start: new Set(),
        on_tool_mount: new Set(),
        on_demand: new Set(),
    });
    const [writeFields, setWriteFields] = useState<Set<string>>(new Set());
    const [allowedOperations, setAllowedOperations] = useState<Set<'INSERT' | 'UPDATE' | 'DELETE'>>(new Set(['INSERT', 'UPDATE', 'DELETE']));
    const [loadCondition, setLoadCondition] = useState('');
    const [activeTab, setActiveTab] = useState<'read' | 'write' | 'operations'>('read');

    useEffect(() => {
        if (initialDependency) {
            // Read Fields Parsing
            const newReadFields: Record<Strategy, Set<string>> = { on_app_start: new Set(), on_tool_mount: new Set(), on_demand: new Set() };
            try {
                // Try parsing as new JSON format
                const parsedReadFields = JSON.parse(initialDependency.read_fields || '[]');
                if (Array.isArray(parsedReadFields)) {
                    parsedReadFields.forEach(group => {
                        if (group.strategy && newReadFields[group.strategy as Strategy] && Array.isArray(group.fields)) {
                            newReadFields[group.strategy as Strategy] = new Set(group.fields);
                        }
                    });
                }
            } catch (e) {
                // Fallback to old string format
                const strategy = initialDependency.load_strategy || 'on_tool_mount';
                const fields = initialDependency.read_fields === '*'
                    ? schema.map(c => c.name)
                    : (initialDependency.read_fields || '').split(',').filter(Boolean);
                newReadFields[strategy] = new Set(fields);
            }
            setReadFields(newReadFields);

            // Write Fields Parsing
            const allFields = schema.map(c => c.name);
            const writeFieldSet = new Set(initialDependency.write_fields === '*' ? allFields : (initialDependency.write_fields || '').split(',').filter(Boolean));
            setWriteFields(writeFieldSet);

            // Allowed Operations Parsing
            const allowedOpsStr = initialDependency.allowed_operations || '*';
            const allowedOpsSet = allowedOpsStr === '*' || allowedOpsStr === ''
                ? new Set<'INSERT' | 'UPDATE' | 'DELETE'>(['INSERT', 'UPDATE', 'DELETE'])
                : new Set(allowedOpsStr.split(',').map(op => op.trim().toUpperCase()).filter(op => ['INSERT', 'UPDATE', 'DELETE'].includes(op)) as ('INSERT' | 'UPDATE' | 'DELETE')[]);
            setAllowedOperations(allowedOpsSet);

            setLoadCondition(initialDependency.load_condition || '');
        } else {
            // Reset state for new dependency
            setReadFields({ on_app_start: new Set(), on_tool_mount: new Set(), on_demand: new Set() });
            setWriteFields(new Set());
            setAllowedOperations(new Set(['INSERT', 'UPDATE', 'DELETE']));
            setLoadCondition('');
        }
    }, [initialDependency, schema]);

    if (!isOpen) return null;
    
    // スキーマが空の場合の警告
    if (schema.length === 0) {
        console.warn(`[DependencyEditModal] No schema found for table: ${tableName}. Fields cannot be displayed.`);
    }

    const handleFieldToggle = (field: string, type: 'read' | 'write', strategy?: Strategy) => {
        if (type === 'read' && strategy) {
            setReadFields(prev => {
                const newStrategyFields = new Set<string>(prev[strategy]);
                if (newStrategyFields.has(field)) {
                    newStrategyFields.delete(field);
                } else {
                    newStrategyFields.add(field);
                }
                return { ...prev, [strategy]: newStrategyFields };
            });
        } else if (type === 'write') {
            setWriteFields(prev => {
                // FIX: Explicitly type `new Set(prev)` as `new Set<string>(prev)` to resolve TypeScript error about `Set<unknown>` not being assignable to `Set<string>`.
                const newSet = new Set<string>(prev);
                if (newSet.has(field)) {
                    newSet.delete(field);
                } else {
                    newSet.add(field);
                }
                return newSet;
            });
        }
    };
    
    const handleToggleAll = (type: 'read' | 'write', strategy?: Strategy) => {
        const allFieldNames = schema.map(c => c.name);
        
        if (type === 'read' && strategy) {
            const currentSet = readFields[strategy];
            if (currentSet.size === allFieldNames.length) {
                setReadFields(prev => ({ ...prev, [strategy]: new Set() }));
            } else {
                setReadFields(prev => ({ ...prev, [strategy]: new Set(allFieldNames) }));
            }
        } else if (type === 'write') {
            if (writeFields.size === schema.length) {
                setWriteFields(new Set());
            } else {
                setWriteFields(new Set(allFieldNames));
            }
        }
    };


    const handleSave = () => {
        const readFieldsConfig = STRATEGIES.map(strategy => ({
            strategy,
            fields: Array.from(readFields[strategy]),
        })).filter(group => group.fields.length > 0);
        
        const readFieldsString = JSON.stringify(readFieldsConfig);
        const writeFieldsString = writeFields.size === schema.length ? '*' : Array.from(writeFields).join(',');
        const allowedOpsString = allowedOperations.size === 3 ? '*' : Array.from(allowedOperations).join(',');
        
        const primaryStrategy = 
            readFields.on_app_start.size > 0 ? 'on_app_start' :
            readFields.on_tool_mount.size > 0 ? 'on_tool_mount' :
            readFields.on_demand.size > 0 ? 'on_demand' : 
            initialDependency?.load_strategy || 'on_tool_mount';

        const dependency: ToolDependency = {
            tool_name: toolName,
            table_name: tableName,
            read_fields: readFieldsString,
            write_fields: writeFieldsString,
            allowed_operations: allowedOpsString,
            load_strategy: primaryStrategy,
            load_condition: readFields.on_demand.size > 0 ? loadCondition : undefined,
        };

        onSave(dependency);
        onClose();
    };
    
    const strategyLabels: Record<Strategy, string> = {
        on_app_start: "アプリ起動時",
        on_tool_mount: "ツール起動時",
        on_demand: "オンデマンド (機能実行時)"
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold">依存関係を編集</h2>
                    <button onClick={onClose} className="p-1 rounded-full"><XMarkIcon className="w-6 h-6" /></button>
                </header>
                <div className="p-3 text-sm bg-base-200 dark:bg-base-dark-300">
                    <p><strong>ツール:</strong> {toolName}</p>
                    <p><strong>テーブル:</strong> {tableName}</p>
                </div>
                <div className="border-b border-default">
                    <nav className="-mb-px flex space-x-4 px-4">
                        <button onClick={() => setActiveTab('read')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'read' ? 'border-brand-primary text-brand-primary' : 'border-transparent'}`}>読み込み (Read)</button>
                        <button onClick={() => setActiveTab('write')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'write' ? 'border-brand-primary text-brand-primary' : 'border-transparent'}`}>書き込み (Write)</button>
                        <button onClick={() => setActiveTab('operations')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'operations' ? 'border-brand-primary text-brand-primary' : 'border-transparent'}`}>操作権限 (Operations)</button>
                    </nav>
                </div>
                <main className="p-6 overflow-y-auto">
                    {schema.length === 0 ? (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                <strong>警告:</strong> テーブル「{tableName}」のスキーマが見つかりませんでした。
                            </p>
                            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                                スキーマが取得できないため、フィールドの選択ができません。データベースにテーブルが存在するか、またはCSVファイルにヘッダー行が含まれているか確認してください。
                            </p>
                        </div>
                    ) : activeTab === 'read' ? (
                        <div className="space-y-4">
                            {STRATEGIES.map(strategy => (
                                <div key={strategy} className="border rounded-md">
                                    <div className="flex justify-between items-center p-3 bg-base-200 dark:bg-base-dark-300 rounded-t-md">
                                        <h3 className="font-semibold">{strategyLabels[strategy]}</h3>
                                        <label htmlFor={`toggle-all-read-${strategy}`} className="text-xs flex items-center gap-1"><input id={`toggle-all-read-${strategy}`} name={`toggle-all-read-${strategy}`} type="checkbox" onChange={() => handleToggleAll('read', strategy)} checked={readFields[strategy].size === schema.length && schema.length > 0} />すべて選択</label>
                                    </div>
                                    {strategy === 'on_demand' && (
                                        <div className="p-3 border-b">
                                            <label htmlFor={`load-condition-input-${strategy}`} className="block text-xs font-medium mb-1">実行条件 (メモ)</label>
                                            <input id={`load-condition-input-${strategy}`} name={`load_condition_${strategy}`} type="text" value={loadCondition} onChange={e => setLoadCondition(e.target.value)} className="w-full p-2 border rounded" placeholder="例: 詳細ボタンクリック時"/>
                                        </div>
                                    )}
                                    <ul className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {schema.map(col => {
                                            const checkboxId = `read-field-${strategy}-${col.id}`;
                                            return (
                                                <li key={col.id}>
                                                    <label htmlFor={checkboxId} className="flex items-center gap-2 text-sm p-1 rounded">
                                                        <input id={checkboxId} name={`read-field-${strategy}-${col.name}`} type="checkbox" checked={readFields[strategy].has(col.name)} onChange={() => handleFieldToggle(col.name, 'read', strategy)} />
                                                        {col.name}
                                                    </label>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    ) : activeTab === 'write' ? (
                         <div className="border rounded-md p-3">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-semibold">書き込み対象フィールド</h3>
                                {schema.length > 0 && (
                                    <label htmlFor="toggle-all-write" className="text-xs flex items-center gap-1"><input id="toggle-all-write" name="toggle-all-write" type="checkbox" onChange={() => handleToggleAll('write')} checked={writeFields.size === schema.length && schema.length > 0} />すべて選択</label>
                                )}
                            </div>
                             <ul className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                                {schema.length > 0 ? (
                                    schema.map(col => {
                                        const checkboxId = `write-field-${col.id}`;
                                        return (
                                            <li key={col.id}>
                                                <label htmlFor={checkboxId} className="flex items-center gap-2 text-sm p-1 rounded">
                                                    <input id={checkboxId} name={`write-field-${col.name}`} type="checkbox" checked={writeFields.has(col.name)} onChange={() => handleFieldToggle(col.name, 'write')} />
                                                    {col.name}
                                                </label>
                                            </li>
                                        );
                                    })
                                ) : (
                                    <li className="text-sm text-gray-500">スキーマが取得できませんでした</li>
                                )}
                            </ul>
                        </div>
                    ) : (
                        <div className="border rounded-md p-3">
                            <div className="mb-4">
                                <h3 className="font-semibold mb-3">許可するデータベース操作</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                    このツールがこのテーブルに対して実行できる操作を選択してください。
                                </p>
                                <div className="space-y-2">
                                    {(['INSERT', 'UPDATE', 'DELETE'] as const).map(op => {
                                        const checkboxId = `operation-${op}`;
                                        return (
                                            <label key={op} htmlFor={checkboxId} className="flex items-center gap-2 text-sm p-2 rounded hover:bg-base-200 dark:hover:bg-base-dark-300">
                                                <input
                                                    id={checkboxId}
                                                    name={`operation-${op}`}
                                                    type="checkbox"
                                                    checked={allowedOperations.has(op)}
                                                    onChange={() => {
                                                        const newSet = new Set(allowedOperations);
                                                        if (newSet.has(op)) {
                                                            newSet.delete(op);
                                                        } else {
                                                            newSet.add(op);
                                                        }
                                                        setAllowedOperations(newSet);
                                                    }}
                                                />
                                                <span className="font-medium">{op}</span>
                                                <span className="text-xs text-gray-500">
                                                    {op === 'INSERT' && '(新規作成)'}
                                                    {op === 'UPDATE' && '(更新)'}
                                                    {op === 'DELETE' && '(削除)'}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                                    <p><strong>注意:</strong> 設定ツールは通常UPDATEのみ、データ管理ツールはすべての操作を許可することが一般的です。</p>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
                <footer className="flex justify-end gap-3 p-4 bg-base-200 dark:bg-base-dark-300/50">
                    <button onClick={onClose} className="px-4 py-2 text-sm rounded-md bg-gray-200">キャンセル</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm rounded-md bg-brand-primary text-white">保存</button>
                </footer>
            </div>
        </div>
    );
};

export default DependencyEditModal;

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Database, Row, TaskMaster } from '@shared/types';
import { PlusIcon, TrashIcon, XMarkIcon, PencilIcon, CheckIcon } from '@components/atoms';
import { useNavigation } from '@core/contexts/NavigationContext';
import { updateDatabase } from '@core/utils';
import { fetchTables } from '@core/data/db.live';

interface TaskSettingsToolProps {
    database: Partial<Database> | null;
    setDatabase: React.Dispatch<React.SetStateAction<Partial<Database> | null>>;
}

const TaskSettingsTool: React.FC<TaskSettingsToolProps> = ({ database, setDatabase }) => {
    const { currentPage } = useNavigation();
    const [tasks, setTasks] = useState<TaskMaster[]>([]);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editingTask, setEditingTask] = useState<Partial<TaskMaster & { isNew?: boolean }>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const loadedTablesRef = useRef<Set<string>>(new Set());

    // データ読み込み処理
    useEffect(() => {
        const loadData = async () => {
            if (!database) {
                setIsLoading(true);
                return;
            }
            
            const requiredTables = [
                'task_master',
                'task_generation_rules',
                'task_time_settings',
                'time_units',
                'calculation_logic_types'
            ];
            
            // 既に読み込み済みのテーブルはスキップ
            const missingTables = requiredTables.filter(t => {
                if (loadedTablesRef.current.has(t)) return false;
                if (database[t]) {
                    loadedTablesRef.current.add(t);
                    return false;
                }
                return true;
            });
            
            if (missingTables.length === 0) {
                setIsLoading(false);
                return;
            }
            
            setIsLoading(true);
            setError(null);
            try {
                missingTables.forEach(t => loadedTablesRef.current.add(t));
                const data = await fetchTables(missingTables, { toolName: 'task-settings' });
                setDatabase(prev => ({...(prev || {}), ...data}));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'データの読み込みに失敗しました。');
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []); // 初回のみ実行

    useEffect(() => {
        const sortedTasks = (database?.task_master?.data as TaskMaster[] || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        setTasks(sortedTasks);
    }, [database]);

    const handleSave = async (data: any[]) => {
        // まずローカル状態を更新
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            if (newDb.task_master) {
                newDb.task_master.data = data;
            }
            return newDb;
        });

        // サーバーに保存（全データを置き換え）
        try {
            const existingIds = ((database?.task_master?.data || []) as TaskMaster[]).map(t => t.id);
            const operations = [
                ...existingIds.map(id => ({ type: 'DELETE' as const, where: { id } })),
                ...data.map(task => ({ type: 'INSERT' as const, data: task }))
            ];

            if (operations.length > 0 && database) {
                const result = await updateDatabase(currentPage, 'task_master', operations, database as Database);
                if (!result.success) {
                    throw new Error(result.error || 'Failed to save tasks to server');
                }
            }
            alert('設定を保存しました。');
        } catch (error) {
            console.error('[TaskSettings] Failed to save to server:', error);
            alert('サーバーへの保存に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    const handleStartEdit = (task: TaskMaster) => {
        setEditingTaskId(task.id);
        setEditingTask(task);
    };

    const handleCancelEdit = () => {
        setEditingTaskId(null);
        setEditingTask({});
    };
    
    const handleSaveTask = (taskToSave: Partial<TaskMaster>) => {
        const newTasks = [...tasks];
        if (taskToSave.id && !(taskToSave as any).isNew) {
            const index = newTasks.findIndex(t => t.id === taskToSave.id);
            if (index > -1) {
                newTasks[index] = taskToSave as TaskMaster;
            }
        } else {
             newTasks.push({ id: `task_${Date.now()}`, ...taskToSave } as TaskMaster);
        }
        setTasks(newTasks);
        handleSave(newTasks);
        handleCancelEdit();
    };

    const handleDeleteTask = (taskId: string) => {
        if (window.confirm('このタスクを削除しますか？自動生成ルールからも削除されます。')) {
            const newTasks = tasks.filter(t => t.id !== taskId);
            setTasks(newTasks);
            handleSave(newTasks);
        }
    };
    
    // データベースから計算ロジックタイプを取得（sort_orderでソート）
    const calculationLogicOptions = useMemo(() => {
        const options = database?.calculation_logic_types?.data || [];
        return [...options].sort((a, b) => {
            const aOrder = (a.sort_order as number) || 0;
            const bOrder = (b.sort_order as number) || 0;
            return aOrder - bOrder;
        });
    }, [database?.calculation_logic_types]);

    // データベースから時間単位を取得（sort_orderでソート）
    const unitOptions = useMemo(() => {
        const options = database?.time_units?.data || [];
        return [...options].sort((a, b) => {
            const aOrder = (a.sort_order as number) || 0;
            const bOrder = (b.sort_order as number) || 0;
            return aOrder - bOrder;
        });
    }, [database?.time_units]);

    const renderEditableRow = (task: Partial<TaskMaster & { isNew?: boolean }>, onSave: (t: Partial<TaskMaster>) => void, onCancel: () => void) => (
        <tr className="bg-yellow-50 dark:bg-yellow-900/20">
            <td className="p-1"><input type="text" id={`task-name-${task.id}`} name={`task-name-${task.id}`} value={task.name || ''} onChange={e => setEditingTask(t => ({...t, name: e.target.value}))} className="w-full p-1 border rounded"/></td>
            <td className="p-1"><input type="text" id={`task-category-${task.id}`} name={`task-category-${task.id}`} value={task.category || ''} onChange={e => setEditingTask(t => ({...t, category: e.target.value}))} className="w-full p-1 border rounded"/></td>
            <td className="p-1"><input type="number" id={`task-sort_order-${task.id}`} name={`task-sort_order-${task.id}`} value={task.sort_order || ''} onChange={e => setEditingTask(t => ({...t, sort_order: +e.target.value}))} className="w-20 p-1 border rounded"/></td>
            <td className="p-1"><input type="number" id={`task-default_value-${task.id}`} name={`task-default_value-${task.id}`} value={task.default_value || 0} onChange={e => setEditingTask(t => ({...t, default_value: +e.target.value}))} className="w-20 p-1 border rounded"/></td>
            <td className="p-1">
                <select 
                    id={`task-unit-${task.id}`} 
                    name={`task-unit-${task.id}`} 
                    value={task.unit || (unitOptions.length > 0 ? (unitOptions[0].name as string) : '')} 
                    onChange={e => setEditingTask(t => ({...t, unit: e.target.value as any}))} 
                    className="w-full p-1 border rounded"
                >
                    {unitOptions.length === 0 ? (
                        <option value="">時間単位を読み込み中...</option>
                    ) : (
                        unitOptions.map(unit => (
                            <option key={unit.id as string} value={unit.name as string}>
                                {unit.name}
                            </option>
                        ))
                    )}
                </select>
            </td>
            <td className="p-1">
                <select 
                    id={`task-logic-${task.id}`} 
                    name={`task-logic-${task.id}`} 
                    value={task.calculation_logic || (calculationLogicOptions.length > 0 ? (calculationLogicOptions[0].code as string) : '')} 
                    onChange={e => setEditingTask(t => ({...t, calculation_logic: e.target.value as any}))} 
                    className="w-full p-1 border rounded"
                >
                    {calculationLogicOptions.length === 0 ? (
                        <option value="">計算ロジックを読み込み中...</option>
                    ) : (
                        calculationLogicOptions.map(logic => (
                            <option key={logic.id as string} value={logic.code as string}>
                                {logic.name || logic.code}
                            </option>
                        ))
                    )}
                </select>
            </td>
            <td className="p-1 text-right whitespace-nowrap">
                <button onClick={() => onSave(task)} className="p-1 text-green-600"><CheckIcon className="w-5 h-5"/></button>
                <button onClick={onCancel} className="p-1 text-gray-500"><XMarkIcon className="w-5 h-5"/></button>
            </td>
        </tr>
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">データを読み込み中...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <p className="text-red-600 dark:text-red-400 mb-4">エラーが発生しました</p>
                    <p className="text-gray-600 dark:text-gray-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <header className="mb-6">
                <h1 className="text-3xl font-bold">タスク設定</h1>
                <p className="text-gray-500 mt-1">業務タスクの内容と、案件に応じた自動生成ルールを管理します。</p>
            </header>
            <div className="flex-grow bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md">
                 <div className="space-y-4">
                    <button onClick={() => setEditingTask({ isNew: true })} className="flex items-center gap-2 bg-brand-primary hover:bg-blue-800 text-white font-semibold py-2 px-4 rounded-lg">
                        <PlusIcon className="w-5 h-5"/> 新規タスクを追加
                    </button>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-base-200 dark:bg-base-dark-300">
                                <tr>
                                    <th className="p-2 text-left">タスク名</th>
                                    <th className="p-2 text-left">カテゴリ</th>
                                    <th className="p-2 text-left">表示順</th>
                                    <th className="p-2 text-left">基準値</th>
                                    <th className="p-2 text-left">単位</th>
                                    <th className="p-2 text-left">計算ロジック</th>
                                    <th className="p-2 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.map(task => (
                                    editingTaskId === task.id ?
                                    renderEditableRow(editingTask, handleSaveTask, handleCancelEdit)
                                    : (
                                        <tr key={task.id} className="border-t">
                                            <td className="p-2 font-semibold">{task.name}</td>
                                            <td className="p-2">{task.category}</td>
                                            <td className="p-2">{task.sort_order}</td>
                                            <td className="p-2">{task.default_value}</td>
                                            <td className="p-2">
                                                {unitOptions.find(u => u.name === task.unit)?.name || task.unit}
                                            </td>
                                            <td className="p-2">
                                                {calculationLogicOptions.find(l => l.code === task.calculation_logic)?.name || task.calculation_logic}
                                            </td>
                                            <td className="p-2 text-right whitespace-nowrap">
                                                <button onClick={() => handleStartEdit(task)} className="p-1 text-blue-600"><PencilIcon className="w-5 h-5"/></button>
                                                <button onClick={() => handleDeleteTask(task.id)} className="p-1 text-red-600"><TrashIcon className="w-5 h-5"/></button>
                                            </td>
                                        </tr>
                                    )
                                ))}
                                {editingTask.isNew && renderEditableRow(editingTask, handleSaveTask, handleCancelEdit)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default TaskSettingsTool;

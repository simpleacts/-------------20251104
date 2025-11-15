
import React, { useMemo, useState } from 'react';
// FIX: Corrected import path for types.
import { EnrichedTask } from '@shared/types';
import { ExclamationTriangleIcon, PlayIcon, StopIcon } from '@components/atoms';

interface TaskListProps {
    tasks: EnrichedTask[];
    onSelectTask?: (taskId: string) => void;
    selectedTaskId: string | null;
    onRunValidation?: () => void;
    activeSessions?: { id: string; startTime: number; name: string; }[];
    onStartTimer?: (taskMasterId: string) => void;
    onStopTimer?: (sessionId: string) => void;
}

const statusOptions: { value: string, label: string }[] = [
    { value: 'all', label: 'すべて' },
    { value: 'pending', label: '未対応' },
    { value: 'in_progress', label: '対応中' },
    { value: 'completed', label: '完了' },
    { value: 'skipped', label: 'スキップ' },
];
const statusLabelMap: Record<string, string> = { pending: '未対応', in_progress: '対応中', completed: '完了', skipped: 'スキップ' };


const TaskList: React.FC<TaskListProps> = ({ tasks, onSelectTask, selectedTaskId, onRunValidation, activeSessions, onStartTimer, onStopTimer }) => {
    const [statusFilter, setStatusFilter] = useState('pending');
    const [searchTerm, setSearchTerm] = useState('');

    const isSelectable = !!onSelectTask;

    const filteredTasks = useMemo(() => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        return tasks
            .filter(task => {
                const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
                const matchesSearch = searchTerm === '' ||
                    (task.quoteCode && task.quoteCode.toLowerCase().includes(lowerSearchTerm)) ||
                    (task.customerName && task.customerName.toLowerCase().includes(lowerSearchTerm)) ||
                    (task.notes && task.notes.toLowerCase().includes(lowerSearchTerm));
                return matchesStatus && matchesSearch;
            })
            .sort((a, b) => new Date(b.due_date || 0).getTime() - new Date(a.due_date || 0).getTime());
    }, [tasks, statusFilter, searchTerm]);

    return (
        <div className="flex flex-col h-full">
            <div className="p-2 border-b border-default dark:border-default-dark flex justify-between items-center flex-shrink-0">
                <input id="task-search-input" name="task_search" type="text" placeholder="案件コード, 顧客名, メモで検索..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 bg-input-bg dark:bg-input-bg-dark rounded"/>
                <select id="task-status-filter" name="task_status_filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="ml-2 p-2 border rounded text-sm bg-base-200 dark:bg-base-dark-300" aria-label="ステータスでフィルター">
                    {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            </div>
            {onRunValidation && (
                <div className="p-2 border-b border-default dark:border-default-dark flex-shrink-0">
                    <button onClick={onRunValidation} className="w-full flex items-center justify-center gap-2 text-sm bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 font-semibold py-2 px-4 rounded-lg transition-colors hover:bg-yellow-200">
                        <ExclamationTriangleIcon className="w-4 h-4"/> データ整合性チェック
                    </button>
                </div>
            )}
            <ul className="overflow-y-auto flex-grow">
                {filteredTasks.map(task => {
                    const isTaskActive = activeSessions?.some(s => s.id === task.task_master_id);
                    return (
                        <li key={task.id} onClick={() => isSelectable && onSelectTask(task.id)} className={`p-3 border-b border-default dark:border-default-dark flex items-center gap-4 ${isSelectable ? 'cursor-pointer' : ''} ${isSelectable && selectedTaskId === task.id ? 'bg-blue-100 dark:bg-blue-900/50' : 'hover:bg-hover-bg dark:hover:bg-hover-bg-dark'}`}>
                            <div className="flex-grow">
                                <div className="flex justify-between text-xs text-gray-500">
                                    <p className="font-semibold text-black dark:text-white truncate">{task.quoteCode || '案件未割り当て'}</p>
                                    <p>{task.due_date ? new Date(task.due_date).toLocaleDateString() : ''}</p>
                                </div>
                                <p className="font-bold text-sm truncate">{task.taskName}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{task.notes}</p>
                                <div className="mt-1 text-xs">
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${task.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {statusLabelMap[task.status] || task.status}
                                    </span>
                                </div>
                            </div>
                            {onStartTimer && onStopTimer && (
                                <div className="flex-shrink-0">
                                    {isTaskActive ? (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onStopTimer(task.task_master_id); }}
                                            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                            title="タイマーを停止"
                                        >
                                            <StopIcon className="w-4 h-4"/>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onStartTimer(task.task_master_id); }}
                                            className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                                            title="タイマーを開始"
                                        >
                                            <PlayIcon className="w-4 h-4"/>
                                        </button>
                                    )}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default TaskList;

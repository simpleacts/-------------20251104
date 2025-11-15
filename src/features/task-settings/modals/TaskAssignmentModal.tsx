

import React, { useEffect, useMemo, useState } from 'react';
import { TaskMaster } from '@shared/types';
import { PlusIcon, TrashIcon, XMarkIcon } from '@components/atoms';

interface TaskAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (quoteId: string, taskIds: string[]) => void;
    allTasks: TaskMaster[];
    initialSelectedTaskIds: Set<string>;
    quoteId: string;
    quoteCode: string;
}

const TaskAssignmentModal: React.FC<TaskAssignmentModalProps> = ({ isOpen, onClose, onSave, allTasks, initialSelectedTaskIds, quoteId, quoteCode }) => {
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            setSelectedTaskIds(new Set(initialSelectedTaskIds));
        }
    }, [isOpen, initialSelectedTaskIds]);

    const { tasksByCategory, allTasksMap } = useMemo(() => {
        const map = new Map(allTasks.map(t => [t.id, t]));
        const grouped = allTasks.reduce((acc, task) => {
            const category = task.category || 'その他';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(task);
            return acc;
        }, {} as Record<string, TaskMaster[]>);

        Object.values(grouped).forEach(tasks => (tasks as TaskMaster[]).sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999)));

        return { tasksByCategory: grouped, allTasksMap: map };
    }, [allTasks]);

    if (!isOpen) return null;
    
    const availableTasks = Object.entries(tasksByCategory).map(([category, tasks]) => ({
        category,
        tasks: (tasks as TaskMaster[]).filter(t => !selectedTaskIds.has(t.id))
    })).filter(g => g.tasks.length > 0);

    const selectedTasks = Array.from(selectedTaskIds)
        .map(id => allTasksMap.get(id))
        .filter((t): t is TaskMaster => !!t)
        .sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999));

    const handleAddTask = (taskId: string) => {
        setSelectedTaskIds(prev => new Set(prev).add(taskId));
    };

    const handleRemoveTask = (taskId: string) => {
        setSelectedTaskIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
        });
    };

    const handleSave = () => {
        onSave(quoteId, Array.from(selectedTaskIds));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex-shrink-0 flex justify-between items-center p-4 border-b border-base-300 dark:border-base-dark-300">
                    <div>
                        <h2 className="text-xl font-bold">タスク割り当て</h2>
                        <p className="text-sm text-gray-500">案件: {quoteCode}</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300"><XMarkIcon className="w-6 h-6" /></button>
                </header>
                <main className="flex-grow grid grid-cols-2 gap-4 p-4 overflow-hidden">
                    {/* Left Column: Available Tasks */}
                    <div className="flex flex-col border border-base-300 dark:border-base-dark-300 rounded-md overflow-hidden">
                        <h3 className="flex-shrink-0 p-3 font-semibold border-b border-base-300 dark:border-base-dark-300">利用可能なタスク</h3>
                        <div className="overflow-y-auto">
                            {availableTasks.map(({ category, tasks }) => (
                                <div key={category}>
                                    <h4 className="p-2 bg-base-200 dark:bg-base-dark-300 font-bold text-sm sticky top-0">{category}</h4>
                                    <ul>
                                        {tasks.map(task => (
                                            <li key={task.id} className="flex justify-between items-center p-2 text-sm border-b border-base-200 dark:border-base-dark-300/50">
                                                <span>{task.name}</span>
                                                <button onClick={() => handleAddTask(task.id)} className="p-1 text-green-600 hover:bg-green-100 rounded-full"><PlusIcon className="w-4 h-4" /></button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Selected Tasks */}
                    <div className="flex flex-col border border-base-300 dark:border-base-dark-300 rounded-md overflow-hidden">
                        <h3 className="flex-shrink-0 p-3 font-semibold border-b border-base-300 dark:border-base-dark-300">割り当てるタスク ({selectedTasks.length})</h3>
                        <div className="overflow-y-auto">
                             <ul>
                                {selectedTasks.map(task => (
                                    <li key={task.id} className="flex justify-between items-center p-2 text-sm border-b border-base-200 dark:border-base-dark-300/50">
                                        <span>{task.name}</span>
                                        <button onClick={() => handleRemoveTask(task.id)} className="p-1 text-red-500 hover:bg-red-100 rounded-full"><TrashIcon className="w-4 h-4" /></button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </main>
                <footer className="flex-shrink-0 flex justify-end gap-3 p-4 bg-base-200 dark:bg-base-dark-300/50 border-t">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-base-300 hover:bg-gray-300 dark:bg-base-dark-300 dark:hover:bg-gray-600">キャンセル</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm font-medium rounded-md bg-brand-primary text-white hover:bg-blue-800">保存</button>
                </footer>
            </div>
        </div>
    );
};

export default TaskAssignmentModal;
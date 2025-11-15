import React, { useMemo } from 'react';
import { Database, QuoteTask, Row, TaskMaster } from '@shared/types';
import { XMarkIcon } from '@components/atoms';

interface TaskListModalProps {
    isOpen: boolean;
    onClose: () => void;
    database: Partial<Database>;
    taskMasterId: string | null;
}

const TaskListModal: React.FC<TaskListModalProps> = ({ isOpen, onClose, database, taskMasterId }) => {
    const { taskName, tasks } = useMemo(() => {
        if (!taskMasterId) return { taskName: '', tasks: [] };

        const master = (database.task_master?.data as TaskMaster[])?.find(t => t.id === taskMasterId);
        const name = master?.name || 'タスク';
        
        const quoteTasks = (database.quote_tasks?.data as QuoteTask[]) || [];
        const customerMap = new Map(database.customers?.data.map(c => [c.id, c]));
        const quoteMap = new Map(database.quotes?.data.map(q => [q.id, q]));
        const userMap = new Map(database.users?.data.map(u => [u.id, u.name]));

        const filteredTasks = quoteTasks
            .filter(t => t.task_master_id === taskMasterId && t.status !== 'completed')
            .map(task => {
                const quote = quoteMap.get(task.quote_id as string);
                return {
                    ...task,
                    quote,
                    customer: quote ? customerMap.get((quote as Row).customer_id as string) : undefined,
                    assigneeName: task.assignee_id ? userMap.get(task.assignee_id) : null,
                };
            })
            .sort((a, b) => {
                const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
                const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
                if(dateA !== dateB) return dateA - dateB;

                const deliveryDateA = (a.quote as Row)?.estimated_delivery_date ? new Date((a.quote as Row).estimated_delivery_date as string).getTime() : Infinity;
                const deliveryDateB = (b.quote as Row)?.estimated_delivery_date ? new Date((b.quote as Row).estimated_delivery_date as string).getTime() : Infinity;
                return deliveryDateA - deliveryDateB;
            });

        return { taskName: name, tasks: filteredTasks };

    }, [database, taskMasterId]);

    if (!isOpen) return null;

    const getDueDateClass = (dueDate: string | null) => {
        if (!dueDate) return '';
        const due = new Date(dueDate);
        const today = new Date();
        today.setHours(0,0,0,0);
        const diffDays = (due.getTime() - today.getTime()) / (1000 * 3600 * 24);

        if (diffDays < 0) return 'text-red-600 font-bold';
        if (diffDays <= 3) return 'text-yellow-600 font-semibold';
        return '';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-base-300 dark:border-base-dark-300">
                    <h2 className="text-xl font-bold">未完了タスク一覧: {taskName}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300">
                        <XMarkIcon className="w-6 h-6"/>
                    </button>
                </header>
                <main className="p-6 overflow-y-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-base-200 dark:bg-base-dark-300">
                            <tr>
                                <th className="p-2 text-left">案件コード</th>
                                <th className="p-2 text-left">顧客名</th>
                                <th className="p-2 text-left">希望納期</th>
                                <th className="p-2 text-left">タスク期日</th>
                                <th className="p-2 text-left">担当者</th>
                                <th className="p-2 text-left">ステータス</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map(task => (
                                <tr key={task.id} className="border-b border-base-200 dark:border-base-dark-300">
                                    <td className="p-2 font-mono">{(task.quote as Row)?.quote_code}</td>
                                    <td className="p-2">{(task.customer as Row)?.company_name || (task.customer as Row)?.name_kanji}</td>
                                    <td className="p-2">{(task.quote as Row)?.estimated_delivery_date ? new Date((task.quote as Row).estimated_delivery_date as string).toLocaleDateString() : 'N/A'}</td>
                                    <td className={`p-2 ${getDueDateClass(task.due_date)}`}>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</td>
                                    <td className="p-2">{task.assigneeName || <span className="text-gray-400">未割り当て</span>}</td>
                                    <td className="p-2">{task.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {tasks.length === 0 && <p className="text-center py-8 text-gray-500">この工程に未完了のタスクはありません。</p>}
                </main>
            </div>
        </div>
    );
};

export default TaskListModal;
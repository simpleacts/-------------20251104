import React, { useMemo, useState } from 'react';
import { Database, QuoteTask, TaskMaster } from '@shared/types';
import TaskListModal from '../modals/TaskListModal';
import TaskProgressGraph from '../organisms/TaskProgressGraph';

interface TaskAnalysisToolProps {
    database: Partial<Database>;
}

const TaskAnalysisTool: React.FC<TaskAnalysisToolProps> = ({ database }) => {
    const [isTaskListModalOpen, setIsTaskListModalOpen] = useState(false);
    const [selectedTaskMasterId, setSelectedTaskMasterId] = useState<string | null>(null);

    const taskData = useMemo(() => {
        const quoteTasks = (database.quote_tasks?.data as QuoteTask[]) || [];
        const taskMaster = (database.task_master?.data as TaskMaster[]) || [];
        const taskMasterMap = new Map(taskMaster.map(t => [t.id, t]));

        const counts: Record<string, number> = {};
        quoteTasks.forEach(task => {
            if (task.status !== 'completed' && task.status !== 'skipped') {
                counts[task.task_master_id] = (counts[task.task_master_id] || 0) + 1;
            }
        });
        
        return Object.entries(counts)
            .map(([id, count]) => ({ id, name: taskMasterMap.get(id)?.name || '不明なタスク', count }))
            .sort((a,b) => (taskMasterMap.get(a.id)?.sort_order || 999) - (taskMasterMap.get(b.id)?.sort_order || 999));
    }, [database]);
    
    const handleTaskTypeClick = (taskMasterId: string) => {
        setSelectedTaskMasterId(taskMasterId);
        setIsTaskListModalOpen(true);
    };

    return (
        <>
            <div className="flex flex-col h-full">
                <header className="mb-6">
                    <h1 className="text-3xl font-bold">タスク分析</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">生産工程全体のタスク滞留状況を可視化します。</p>
                </header>
                <div className="flex-grow min-h-0">
                    <TaskProgressGraph taskData={taskData} onTaskTypeClick={handleTaskTypeClick} />
                </div>
            </div>
            {isTaskListModalOpen && (
                <TaskListModal
                    isOpen={isTaskListModalOpen}
                    onClose={() => setIsTaskListModalOpen(false)}
                    database={database}
                    taskMasterId={selectedTaskMasterId}
                />
            )}
        </>
    );
};

export default TaskAnalysisTool;
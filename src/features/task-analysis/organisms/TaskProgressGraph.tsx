import React from 'react';

interface TaskProgressGraphProps {
    taskData: { id: string; name: string; count: number }[];
    onTaskTypeClick: (taskMasterId: string) => void;
}

const TaskProgressGraph: React.FC<TaskProgressGraphProps> = ({ taskData, onTaskTypeClick }) => {
    
    const maxCount = Math.max(1, ...taskData.map(d => d.count));

    return (
        <div className="mb-6 bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md flex-shrink-0">
            <h2 className="text-xl font-bold mb-4">タスク滞留状況</h2>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                {taskData.map(task => (
                    <div key={task.id} className="grid grid-cols-12 items-center gap-2 cursor-pointer group" onClick={() => onTaskTypeClick(task.id)}>
                        <div className="col-span-3 text-sm font-semibold text-right pr-2 truncate group-hover:text-brand-primary">{task.name}</div>
                        <div className="col-span-8">
                            <div className="w-full bg-base-200 dark:bg-base-dark-300 rounded-full h-4">
                                <div
                                    className="bg-blue-500 h-4 rounded-full group-hover:bg-blue-700 transition-all flex items-center justify-end pr-2 text-white text-xs"
                                    style={{ width: `${(task.count / maxCount) * 100}%` }}
                                >
                                </div>
                            </div>
                        </div>
                        <div className="col-span-1 text-sm font-bold text-left">{task.count}</div>
                    </div>
                ))}
                {taskData.length === 0 && (
                    <p className="text-sm text-center text-gray-500 py-4">未完了のタスクはありません。</p>
                )}
            </div>
        </div>
    );
};

export default TaskProgressGraph;
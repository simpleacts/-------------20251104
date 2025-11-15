import React from 'react';
import { Database } from '@shared/types';

interface TaskSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (taskMasterId: string) => void;
    database: Partial<Database>;
}

const TaskSelectionModal: React.FC<TaskSelectionModalProps> = ({ isOpen, onClose, onSelect, database }) => {
    if (!isOpen) return null;
    const tasks = (database.task_master?.data || []).sort((a,b) => (a.sort_order || 999) - (b.sort_order || 999));
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-container-bg dark:bg-container-bg-dark rounded-lg shadow-xl w-full max-w-md max-h-[70vh] flex flex-col" onClick={e=>e.stopPropagation()}>
                <h3 className="p-4 font-bold text-lg border-b">タスクを選択</h3>
                <ul className="overflow-y-auto">
                    {tasks.map(task => (
                        <li key={task.id} onClick={() => onSelect(task.id as string)} className="p-3 hover:bg-hover-bg dark:hover:bg-hover-bg-dark cursor-pointer border-b text-sm">
                            {task.name as string}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default TaskSelectionModal;
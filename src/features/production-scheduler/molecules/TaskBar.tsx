import React from 'react';
import { GanttTask } from '@features/order-management/types';

interface TaskBarProps {
    task: GanttTask;
    x: number;
    y: number;
    width: number;
    height: number;
    onMouseDown: (e: React.MouseEvent, task: GanttTask) => void;
}

const TaskBar: React.FC<TaskBarProps> = ({ task, x, y, width, height, onMouseDown }) => {
    return (
        <g className="cursor-grab active:cursor-grabbing group" onMouseDown={(e) => onMouseDown(e, task)}>
            <title>
                {`タスク: ${task.name}\n期間: ${new Date(task.start).toLocaleDateString()} - ${new Date(task.end).toLocaleDateString()}`}
            </title>
            <rect
                x={x + 2}
                y={y}
                width={width}
                height={height}
                fill={task.color}
                rx={4} ry={4}
                className="stroke-black/10 dark:stroke-black/30 group-active:opacity-70"
                strokeWidth="1"
            />
            <text x={x + 8} y={y + height / 2 + 5} className="text-sm font-medium fill-white pointer-events-none select-none">{task.name}</text>
        </g>
    );
};

export default TaskBar;
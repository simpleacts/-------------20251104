import React from 'react';
import { GanttQuote, GanttTask } from '@features/order-management/types';
import TaskBar from '../molecules/TaskBar';

interface GanttChartProps {
    ganttQuotes: GanttQuote[];
    timelineDates: Date[];
    dailyUsage: Map<string, { quantity: number }>;
    dailyCapacity: number;
    viewStartDate: Date;
    timelineWidth: number;
    totalHeight: number;
    headerHeight: number;
    rowHeight: number;
    taskBarHeight: number;
    dayWidth: number;
    onTaskMouseDown: (e: React.MouseEvent, task: GanttTask) => void;
}


const startOfDay = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
};

const getDaysDiff = (date1: Date, date2: Date): number => {
    const d1 = startOfDay(date1);
    const d2 = startOfDay(date2);
    const diffTime = d2.getTime() - d1.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
};


const GanttChart: React.FC<GanttChartProps> = (props) => {
    const {
        ganttQuotes, timelineDates, dailyUsage, dailyCapacity, viewStartDate,
        timelineWidth, totalHeight, headerHeight, rowHeight, taskBarHeight, dayWidth,
        onTaskMouseDown
    } = props;

    const dateToX = (date: Date) => getDaysDiff(viewStartDate, date) * dayWidth;

    return (
        <svg width={timelineWidth} height={totalHeight} className="bg-base-100 dark:bg-base-dark-200">
            <defs>
                <pattern id="grid" width={dayWidth} height={rowHeight} patternUnits="userSpaceOnUse">
                    <path d={`M ${dayWidth} 0 L 0 0 0 ${rowHeight}`} fill="none" className="stroke-base-300 dark:stroke-slate-700" strokeWidth="1"/>
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            <g transform={`translate(0, 0)`}>
                {timelineDates.map((date, i) => {
                    const x = i * dayWidth;
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    const isToday = getDaysDiff(new Date(), date) === 0;
                    const dateKey = date.toISOString().split('T')[0];
                    const usage = dailyUsage.get(dateKey) || { quantity: 0 };
                    const usagePercent = dailyCapacity > 0 ? Math.min(100, (usage.quantity / dailyCapacity) * 100) : 0;
                    const overCapacity = usage.quantity > dailyCapacity;
                    const isFirstOfMonth = date.getDate() === 1;
                    const isFirstOfView = i === 0;
                    const shouldShowMonth = isFirstOfMonth || isFirstOfView;
                    let monthLabel = '';
                    if (shouldShowMonth) {
                        if (date.getMonth() === 0 || isFirstOfView) {
                            monthLabel = `${date.getFullYear()}年 ${date.getMonth() + 1}月`;
                        } else {
                            monthLabel = `${date.getMonth() + 1}月`;
                        }
                    }

                    return (
                        <g key={i}>
                            <rect x={x} y={0} width={dayWidth} height={totalHeight} fill={isWeekend ? '#f3f4f6' : 'transparent'} className="dark:fill-slate-800/50" />
                            {isToday && <line x1={x + dayWidth / 2} y1={0} x2={x + dayWidth / 2} y2={totalHeight} stroke="#ef4444" strokeWidth="1.5" />}
                            {monthLabel && <text x={x + 5} y={16} className="text-sm font-bold fill-current" textAnchor="start">{monthLabel}</text>}
                            <text x={x + dayWidth / 2} y={38} textAnchor="middle" className="text-lg fill-current">{date.getDate()}</text>
                            <text x={x + dayWidth / 2} y={54} textAnchor="middle" className={`text-xs ${isWeekend ? 'fill-gray-400' : 'fill-current'}`}>{['日', '月', '火', '水', '木', '金', '土'][date.getDay()]}</text>
                            <g transform={`translate(${x}, ${headerHeight - 12})`}>
                                <title>{`生産負荷: ${usage.quantity} / ${dailyCapacity} 枚`}</title>
                                <rect width={dayWidth - 8} x={4} height={8} rx="2" fill="#e5e7eb" className="dark:fill-slate-700"/>
                                {usage.quantity > 0 && <rect width={(dayWidth - 8) * (usagePercent / 100)} x={4} height={8} rx="2" fill={overCapacity ? '#ef4444' : '#3b82f6'} />}
                            </g>
                        </g>
                    )
                })}
                 <line x1={0} y1={headerHeight} x2={timelineWidth} y2={headerHeight} className="stroke-base-300 dark:stroke-slate-700" />
            </g>
            
            {ganttQuotes.map((quote, quoteIndex) => {
                const y = headerHeight + quoteIndex * rowHeight;
                return (
                    <g key={quote.id as string} transform={`translate(0, ${y})`}>
                        {quote.ganttTasks.map(task => {
                            const taskX = dateToX(new Date(task.start));
                            const taskWidth = (getDaysDiff(new Date(task.start), new Date(task.end)) + 1) * dayWidth - 4;
                            return (
                                <TaskBar
                                    key={task.id}
                                    task={task}
                                    x={taskX}
                                    y={(rowHeight - taskBarHeight) / 2}
                                    width={taskWidth}
                                    height={taskBarHeight}
                                    onMouseDown={onTaskMouseDown}
                                />
                            );
                        })}
                    </g>
                )
            })}
        </svg>
    );
};

export default GanttChart;
import React, { useMemo } from 'react';
import { Database, TaskMaster } from '@shared/types';
import { EnrichedQuote } from '../types';
import { ChevronDownIcon } from '@components/atoms';
import QuoteCard from '../molecules/QuoteCard';

interface KanbanColumnProps {
    title: string;
    quotes: EnrichedQuote[];
    database: Partial<Database>;
    onDetailsClick: (quote: EnrichedQuote) => void;
    onDragStart: (e: React.DragEvent, quote: EnrichedQuote) => void;
    onDragEnd: () => void;
    onDrop: (e: React.DragEvent, newStatus: string) => void;
    expandedColumns: Set<string>;
    toggleColumnExpansion: (columnName: string) => void;
    taskMasterMap: Map<string, TaskMaster>;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, quotes, onDrop, expandedColumns, toggleColumnExpansion, taskMasterMap, ...rest }) => {
    const uncompletedTasksInColumn = useMemo(() => {
        return quotes
            .flatMap(q => q.tasks.map(t => ({ ...t, quoteCode: q.quote_code })))
            .filter(t => t.status !== 'completed' && t.status !== 'skipped');
    }, [quotes]);

    const isExpanded = expandedColumns.has(title);

    return (
        <div onDragOver={e => e.preventDefault()} onDrop={e => onDrop(e, title)} className="w-72 flex-shrink-0 bg-container-muted-bg dark:bg-container-muted-bg-dark rounded-lg flex flex-col">
            <div 
                className="font-bold p-3 text-sm flex-shrink-0 flex justify-between items-center cursor-pointer"
                onClick={() => toggleColumnExpansion(title)}
            >
                <span>{title} ({quotes.length})</span>
                <span className="flex items-center gap-2">
                    {uncompletedTasksInColumn.length > 0 && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-200 text-yellow-800">
                            タスク: {uncompletedTasksInColumn.length}
                        </span>
                    )}
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </span>
            </div>
            {isExpanded && (
                <div className="px-2 pb-2 text-xs border-b border-default dark:border-default-dark">
                    {uncompletedTasksInColumn.length > 0 ? (
                        <ul className="space-y-1 max-h-40 overflow-y-auto">
                            {uncompletedTasksInColumn.map(task => (
                                <li key={task.id} className="p-1 bg-base-100 dark:bg-base-dark-200 rounded text-[10px]">
                                    <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">{task.quoteCode as string}</span>: {taskMasterMap.get(task.task_master_id)?.name}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-400 text-center text-[10px] py-2">未完了タスクなし</p>
                    )}
                </div>
            )}
            <div className="p-2 space-y-3 overflow-y-auto">
                {quotes.map(quote => (
                    <QuoteCard key={quote.id as string} quote={quote} {...rest} />
                ))}
            </div>
        </div>
    );
};

export default KanbanColumn;
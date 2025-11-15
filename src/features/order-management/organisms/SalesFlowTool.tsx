import React from 'react';
import { Database, TaskMaster } from '@shared/types';
import { EnrichedQuote } from '../types';
import KanbanColumn from './KanbanColumn';
// FIX: The 'VIEWS' constant is not exported from OrderManagementTool. Removing import.

interface FlowProps {
    kanbanQuotes: EnrichedQuote[];
    database: Partial<Database>;
    onDetailsClick: (quote: EnrichedQuote) => void;
    onDragStart: (e: React.DragEvent, quote: EnrichedQuote) => void;
    onDragEnd: () => void;
    onDrop: (e: React.DragEvent, newStatus: string) => void;
    expandedColumns: Set<string>;
    toggleColumnExpansion: (columnName: string) => void;
    taskMasterMap: Map<string, TaskMaster>;
    getColumnForQuote: (quote: EnrichedQuote) => string;
}

// FIX: Added 'columns' to props to receive it from the parent.
const SalesFlowTool: React.FC<FlowProps & { columns: string[] }> = (props) => {
    const { kanbanQuotes, getColumnForQuote, columns, ...rest } = props;

    return (
        <>
            {columns.map(column => {
                const quotesInColumn = kanbanQuotes.filter(q => getColumnForQuote(q) === column);
                return (
                    <KanbanColumn
                        key={column}
                        title={column}
                        quotes={quotesInColumn}
                        {...rest}
                    />
                );
            })}
        </>
    );
};

export default SalesFlowTool;
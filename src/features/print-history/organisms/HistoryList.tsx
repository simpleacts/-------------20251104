import React, { useMemo } from 'react';
import { Database, Row } from '@shared/types';
import HistoryEntryCard from '../molecules/HistoryEntryCard';

interface HistoryListProps {
    database: Database;
    selectedQuote: Row | null;
    onDelete: (historyId: string) => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ database, selectedQuote, onDelete }) => {
    const historyForQuote = useMemo(() => {
        if (!selectedQuote) return [];
        return (database.print_history as any)?.data.filter((h: Row) => h.quote_id === selectedQuote.id) || [];
    }, [selectedQuote, database.print_history]);

    return (
        <div className="flex-grow overflow-y-auto space-y-3">
            {historyForQuote.map((entry: Row) => (
                <HistoryEntryCard
                    key={entry.id as string}
                    entry={entry}
                    database={database}
                    onDelete={() => onDelete(entry.id as string)}
                />
            ))}
        </div>
    );
};

export default HistoryList;

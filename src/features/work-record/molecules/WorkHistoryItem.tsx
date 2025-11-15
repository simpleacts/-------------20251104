
import React from 'react';
import { Row } from '@shared/types';
import { Button, TrashIcon } from '@components/atoms';

interface WorkHistoryItemProps {
    session: Row;
    taskName: string;
    userName: string;
    relatedQuotes: string;
    isUnlocked: boolean;
    onDelete: () => void;
}

const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const WorkHistoryItem: React.FC<WorkHistoryItemProps> = ({ session, taskName, userName, relatedQuotes, isUnlocked, onDelete }) => {
    return (
        <li className="p-3 bg-base-200 dark:bg-base-dark-300 rounded-md text-sm">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold">{taskName}</p>
                    <p className="text-xs text-gray-500">{userName} at {new Date(session.end_time as string).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-mono text-base">{formatDuration(session.duration_minutes as number)}</span>
                    {isUnlocked && (
                        <Button variant="ghost" size="sm" onClick={onDelete} aria-label="履歴を削除">
                            <TrashIcon className="w-4 h-4 text-red-500" />
                        </Button>
                    )}
                </div>
            </div>
            {session.notes && <p className="text-xs mt-1 pt-1 border-t italic">"{session.notes}"</p>}
            {relatedQuotes && <p className="text-xs mt-1 pt-1 border-t font-mono">関連案件: {relatedQuotes}</p>}
        </li>
    );
};

export default WorkHistoryItem;

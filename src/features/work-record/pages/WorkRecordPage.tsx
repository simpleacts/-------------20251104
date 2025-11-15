import React from 'react';
import { Database, Row } from '@shared/types';
import WorkTimerManager from '../organisms/WorkTimerManager';

interface WorkRecordToolProps {
    database: Partial<Database>;
    setDatabase: React.Dispatch<React.SetStateAction<Partial<Database> | null>>;
    currentUser: Row;
}

const WorkRecordTool: React.FC<WorkRecordToolProps> = ({ database, setDatabase, currentUser }) => {
    return (
        <div className="flex flex-col h-full">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">作業記録ツール</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">音声または手動でタスクの作業時間を記録し、案件に紐付けます。</p>
                </div>
            </header>
            <WorkTimerManager
                showActiveTimers={true}
                showUnsavedLogs={true}
                showHistory={true}
                showRecorder={true}
                showControls={true}
            />
        </div>
    );
};

export default WorkRecordTool;
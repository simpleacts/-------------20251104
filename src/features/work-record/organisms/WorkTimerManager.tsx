import React, { useState, useMemo } from 'react';
import { Database, Row, TaskMaster } from '@shared/types';
import { WorkSession } from '../types';
import { StopIcon, PlusIcon, TrashIcon, XMarkIcon, PlayIcon, MicrophoneIcon, SpinnerIcon, TimerIcon, LockClosedIcon, LockOpenIcon } from '@components/atoms';
import { useWorkTimer as useSharedWorkTimer } from '../hooks/useWorkTimer';
import { useDatabase } from '@core/contexts/DatabaseContext';
import ActiveTimer from '../molecules/ActiveTimer';
import UnsavedLogForm from '../molecules/UnsavedLogForm';
import WorkHistoryItem from '../molecules/WorkHistoryItem';
import TaskSelectionModal from '../modals/TaskSelectionModal';
import QuoteSelectionModal from '../modals/QuoteSelectionModal';

const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

interface WorkTimerManagerProps {
    showActiveTimers?: boolean;
    showUnsavedLogs?: boolean;
    showHistory?: boolean;
    showRecorder?: boolean;
    showControls?: boolean;
    containerAsLink?: boolean;
    onContainerClick?: () => void;
}

const WorkTimerManager: React.FC<WorkTimerManagerProps> = ({ 
    showActiveTimers = false, 
    showUnsavedLogs = false, 
    showHistory = false, 
    showRecorder = true,
    showControls = true,
    containerAsLink = false,
    onContainerClick
}) => {
    const { database } = useDatabase();
    const { 
        activeSessions, elapsedTimes, sessionsToLog, logFormsData,
        startSession, stopSession, handleLogFormChange, handleSaveLog, handleDeleteLog, handleDeleteHistory,
        isRecording, toggleRecording, isTaskModalOpen, setIsTaskModalOpen,
        quoteModalForLogId, setQuoteModalForLogId
    } = useSharedWorkTimer();

    const [isHistoryUnlocked, setIsHistoryUnlocked] = useState(false);

    // FIX: Explicitly set Map types to avoid inference as Map<unknown, unknown>.
    const taskMasterMap = useMemo(() => new Map<string, TaskMaster>((database?.task_master?.data as TaskMaster[] || []).map(t => [t.id as string, t])), [database?.task_master]);
    // FIX: Explicitly set Map types to avoid inference as Map<unknown, unknown>.
    const usersMap = useMemo(() => new Map<string, string>((database?.users?.data || []).map(u => [u.id as string, u.name as string])), [database?.users]);
    // FIX: Explicitly set Map types to avoid inference as Map<unknown, unknown>.
    const quotesMap = useMemo(() => new Map<string, Row>((database?.quotes?.data || []).map(q => [q.id as string, q])), [database?.quotes]);
    
    const workHistory = useMemo(() => (database?.work_sessions?.data || []).sort((a,b) => new Date(b.end_time as string).getTime() - new Date(a.end_time as string).getTime()), [database?.work_sessions]);
    const workSessionQuotesMap = useMemo(() => {
        return (database?.work_session_quotes?.data || []).reduce((acc, wsq) => {
            const sessionId = wsq.work_session_id as string;
            if (!acc[sessionId]) acc[sessionId] = [];
            acc[sessionId].push(wsq.quote_id as string);
            return acc;
        }, {} as Record<string, string[]>);
    }, [database?.work_session_quotes]);

    const ActiveTimersContainer = containerAsLink ? 'button' : 'div';
    const activeTimersContainerProps = containerAsLink ? {
        onClick: onContainerClick,
        className: "bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md hover:shadow-lg hover:ring-2 hover:ring-brand-primary transition-all cursor-pointer text-left"
    } : {
        className: "bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md"
    };

    const visibleColumns = (showActiveTimers || showUnsavedLogs ? 1 : 0) + (showHistory ? 1 : 0);
    const layoutClass = visibleColumns > 1 ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : "grid grid-cols-1 gap-6";

    return (
        <>
            <div className={`${layoutClass} flex-grow min-h-0`}>
                {(showActiveTimers || showUnsavedLogs) && (
                    <div className="flex flex-col gap-6 min-h-0">
                        {showActiveTimers && (
                            <ActiveTimersContainer {...activeTimersContainerProps}>
                                <h2 className="text-xl font-bold mb-4">計測中のタスク</h2>
                                {activeSessions.length > 0 ? activeSessions.map(session => (
                                    <ActiveTimer 
                                        key={session.id}
                                        session={session}
                                        elapsedTime={elapsedTimes[session.id] || 0}
                                        onStop={stopSession}
                                    />
                                )) : <p className="text-sm text-gray-500">現在計測中のタスクはありません。</p>}
                                
                                {showControls && (
                                    <div className="mt-4 flex gap-2">
                                        <button onClick={() => setIsTaskModalOpen(true)} className="w-1/2 flex items-center justify-center gap-2 text-sm bg-gray-200 hover:bg-gray-300 font-semibold py-2 px-4 rounded-lg">
                                            <PlusIcon className="w-4 h-4"/> タイマーを追加
                                        </button>
                                        {showRecorder && (
                                            <button 
                                                onClick={toggleRecording}
                                                className={`w-1/2 flex items-center justify-center gap-2 text-sm font-semibold py-2 px-4 rounded-lg transition-colors ${
                                                    isRecording 
                                                        ? 'bg-red-500 text-white animate-pulse' 
                                                        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'
                                                }`}
                                            >
                                                <MicrophoneIcon className="w-5 h-5"/>
                                                {isRecording ? '録音停止' : '音声で操作'}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </ActiveTimersContainer>
                        )}

                        {showUnsavedLogs && (
                            <div className="bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md flex flex-col flex-grow min-h-0">
                                <h2 className="text-xl font-bold mb-4">未保存の作業記録</h2>
                                <div className="overflow-y-auto space-y-4">
                                    {sessionsToLog.map(log => {
                                        const formData = logFormsData[log.logId];
                                        if (!formData) return null;
                                        return (
                                            <UnsavedLogForm
                                                key={log.logId}
                                                log={log}
                                                formData={formData}
                                                quotesMap={quotesMap}
                                                onChange={(field, value) => handleLogFormChange(log.logId, field, value)}
                                                onSave={() => handleSaveLog(log.logId)}
                                                onDelete={() => handleDeleteLog(log.logId)}
                                                onLinkQuote={() => setQuoteModalForLogId(log.logId)}
                                            />
                                        )
                                    })}
                                    {sessionsToLog.length === 0 && <p className="text-center text-gray-500 py-4 text-sm">未保存の記録はありません。</p>}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {showHistory && (
                    <div className="bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md flex flex-col min-h-0">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">作業履歴</h2>
                            <button onClick={() => setIsHistoryUnlocked(prev => !prev)} className="flex items-center gap-2 text-xs px-3 py-1 bg-button-muted-bg text-button-muted dark:bg-button-muted-bg-dark dark:text-button-muted-dark rounded-full">
                                {isHistoryUnlocked ? <LockOpenIcon className="w-4 h-4 text-green-600"/> : <LockClosedIcon className="w-4 h-4"/>}
                                {isHistoryUnlocked ? 'ロック' : 'ロック解除'}
                            </button>
                        </div>
                        <div className="overflow-y-auto">
                            <ul className="space-y-3">
                                {workHistory.map(session => (
                                    <WorkHistoryItem
                                        key={session.id as string}
                                        session={session}
                                        taskName={taskMasterMap.get(session.task_master_id as string)?.name as string || '不明なタスク'}
                                        userName={usersMap.get(session.user_id as string) || '不明なユーザー'}
                                        // FIX: Add type annotation to `qid` and cast the result of `get` to Row to access its properties safely.
                                        relatedQuotes={(workSessionQuotesMap[session.id as string] || []).map((qid: string) => (quotesMap.get(qid) as Row)?.quote_code).join(', ')}
                                        isUnlocked={isHistoryUnlocked}
                                        onDelete={() => handleDeleteHistory(session.id as string)}
                                    />
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
            <TaskSelectionModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} onSelect={startSession} database={database || {}} />
            <QuoteSelectionModal
                isOpen={!!quoteModalForLogId}
                onClose={() => setQuoteModalForLogId(null)}
                selectedIds={quoteModalForLogId ? logFormsData[quoteModalForLogId]?.selectedQuoteIds || [] : []}
                onSave={(ids) => {
                    if (quoteModalForLogId) {
                        handleLogFormChange(quoteModalForLogId, 'selectedQuoteIds', ids);
                        setQuoteModalForLogId(null);
                    }
                }}
                database={database || {}}
            />
        </>
    );
};

export default WorkTimerManager;
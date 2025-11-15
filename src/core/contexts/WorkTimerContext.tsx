import React, { createContext, ReactNode, useContext } from 'react';
// FIX: Update import path for LogFormData to use the new global type.
import { useWorkTimer as useWorkTimerHook } from '../../features/work-record/hooks/useWorkTimer';
import { LogFormData } from '../../features/work-record/types';

interface WorkTimerContextType {
    activeSessions: { id: string; startTime: number; name: string; }[];
    elapsedTimes: Record<string, number>;
    sessionsToLog: any[];
    logFormsData: Record<string, LogFormData>;
    startSession: (taskMasterId: string) => void;
    stopSession: (sessionId: string) => void;
    handleLogFormChange: (logId: string, field: keyof LogFormData, value: any) => void;
    handleSaveLog: (logId: string) => void;
    handleDeleteLog: (logId: string) => void;
    handleDeleteHistory: (sessionId: string) => void;
    isRecording: boolean;
    toggleRecording: () => void;
    isTaskModalOpen: boolean;
    setIsTaskModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    quoteModalForLogId: string | null;
    setQuoteModalForLogId: React.Dispatch<React.SetStateAction<string | null>>;
}

const WorkTimerContext = createContext<WorkTimerContextType | undefined>(undefined);

export const WorkTimerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const workTimer = useWorkTimerHook();
    return (
        <WorkTimerContext.Provider value={workTimer}>
            {children}
        </WorkTimerContext.Provider>
    );
};

export const useSharedWorkTimer = (): WorkTimerContextType => {
    const context = useContext(WorkTimerContext);
    if (!context) {
        throw new Error('useSharedWorkTimer must be used within a WorkTimerProvider');
    }
    return context;
};